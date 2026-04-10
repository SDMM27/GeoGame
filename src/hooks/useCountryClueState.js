import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { checkAnswer, normalize } from '../utils/normalizeAnswer'

const DAILY_TIME_ZONE = 'Europe/Paris'
const DAILY_STORAGE_PREFIX = 'country-clue-daily'
const EARTH_RADIUS_KM = 6371

export const COUNTRY_CLUE_COUNTRIES = countries.features.filter(
  (country) => country?.properties?.ADMIN && country?.geometry?.coordinates?.length
)

export const COUNTRY_CLUE_COUNTRY_COUNT = COUNTRY_CLUE_COUNTRIES.length

function normalizeLongitudeDelta(deltaLng) {
  let normalized = deltaLng

  while (normalized > 180) normalized -= 360
  while (normalized < -180) normalized += 360

  return normalized
}

function collectCoordinates(geometry) {
  if (!geometry) return []

  if (geometry.type === 'Polygon') {
    return [geometry.coordinates]
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
  }

  return []
}

function getGeographicCenter(country) {
  const polygons = collectCoordinates(country.geometry)
  const coordinates = polygons.flat(2)

  if (coordinates.length === 0) {
    return { lat: 0, lng: 0 }
  }

  let x = 0
  let y = 0
  let z = 0

  coordinates.forEach(([lng, lat]) => {
    const latRad = (lat * Math.PI) / 180
    const lngRad = (lng * Math.PI) / 180

    x += Math.cos(latRad) * Math.cos(lngRad)
    y += Math.cos(latRad) * Math.sin(lngRad)
    z += Math.sin(latRad)
  })

  const total = coordinates.length
  x /= total
  y /= total
  z /= total

  const lng = Math.atan2(y, x) * (180 / Math.PI)
  const hyp = Math.sqrt(x * x + y * y)
  const lat = Math.atan2(z, hyp) * (180 / Math.PI)

  return { lat, lng }
}

function getRingAreaKm2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0

  const referenceLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  const latScale = (Math.PI / 180) * EARTH_RADIUS_KM
  const lngScale = latScale * Math.cos((referenceLat * Math.PI) / 180)

  let area = 0

  for (let index = 0; index < ring.length; index += 1) {
    const [lng1, lat1] = ring[index]
    const [lng2, lat2] = ring[(index + 1) % ring.length]
    const x1 = lng1 * lngScale
    const y1 = lat1 * latScale
    const x2 = lng2 * lngScale
    const y2 = lat2 * latScale
    area += x1 * y2 - x2 * y1
  }

  return Math.abs(area / 2)
}

function getCountryAreaKm2(country) {
  return collectCoordinates(country.geometry).reduce((totalArea, polygon) => {
    const [outerRing, ...holes] = polygon
    const outerArea = getRingAreaKm2(outerRing)
    const holesArea = holes.reduce((holeTotal, ring) => holeTotal + getRingAreaKm2(ring), 0)
    return totalArea + Math.max(outerArea - holesArea, 0)
  }, 0)
}

export const COUNTRY_CENTER_MAP = new Map(
  COUNTRY_CLUE_COUNTRIES.map((country) => [country.properties.ADMIN, getGeographicCenter(country)])
)

const COUNTRY_AREA_MAP = new Map(
  COUNTRY_CLUE_COUNTRIES.map((country) => [country.properties.ADMIN, getCountryAreaKm2(country)])
)

const COUNTRY_POPULATION_MAP = new Map(
  COUNTRY_CLUE_COUNTRIES.map((country) => [country.properties.ADMIN, country.properties.population ?? 0])
)

const COUNTRY_LOOKUP = (() => {
  const entries = new Map()

  COUNTRY_CLUE_COUNTRIES.forEach((country) => {
    const names = [country.properties.ADMIN, ...(country.properties.aliases ?? [])]
    names.forEach((name) => {
      entries.set(normalize(name), country)
    })
  })

  return entries
})()

export function getCountryByName(name) {
  return COUNTRY_CLUE_COUNTRIES.find((country) => country.properties.ADMIN === name) ?? null
}

function hashString(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDailyCountry(dateKey) {
  const countryIndex = hashString(`country-clue:${dateKey}`) % COUNTRY_CLUE_COUNTRIES.length
  return COUNTRY_CLUE_COUNTRIES[countryIndex]
}

function buildDailyStorageKey(dateKey) {
  return `${DAILY_STORAGE_PREFIX}:${dateKey}`
}

function readDailyProgress(dateKey) {
  try {
    const raw = window.localStorage.getItem(buildDailyStorageKey(dateKey))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getPopulationHint(guessName, targetName) {
  const guessedPop = COUNTRY_POPULATION_MAP.get(guessName)
  const targetPop = COUNTRY_POPULATION_MAP.get(targetName)

  if (!guessedPop || !targetPop) {
    return { label: 'Inconnue', arrow: '•', tone: 'neutral' }
  }

  const ratio = guessedPop / targetPop
  if (ratio >= 0.85 && ratio <= 1.15) {
    return { label: 'Pop. similaire', arrow: '≈', tone: 'match' }
  }

  return ratio < 1
    ? { label: 'Plus peuplé', arrow: '↑', tone: 'higher' }
    : { label: 'Moins peuplé', arrow: '↓', tone: 'lower' }
}

function formatPopulation(pop) {
  if (!pop) return 'n/a'
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1).replace('.', ',')} M`
  if (pop >= 1000) return `${(pop / 1000).toFixed(0)} k`
  return pop.toLocaleString('fr-FR')
}

function writeDailyProgress(dateKey, progress) {
  try {
    window.localStorage.setItem(buildDailyStorageKey(dateKey), JSON.stringify(progress))
  } catch {
    // Ignore localStorage write failures.
  }
}

function getRandomCountry(excludedName = null) {
  const pool = excludedName
    ? COUNTRY_CLUE_COUNTRIES.filter((country) => country.properties.ADMIN !== excludedName)
    : COUNTRY_CLUE_COUNTRIES

  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

function toRadians(value) {
  return (value * Math.PI) / 180
}

function getDistanceKm(fromCountryName, toCountryName) {
  const fromCenter = COUNTRY_CENTER_MAP.get(fromCountryName)
  const toCenter = COUNTRY_CENTER_MAP.get(toCountryName)

  if (!fromCenter || !toCenter) return null

  const deltaLat = toRadians(toCenter.lat - fromCenter.lat)
  const deltaLng = toRadians(normalizeLongitudeDelta(toCenter.lng - fromCenter.lng))
  const fromLat = toRadians(fromCenter.lat)
  const toLat = toRadians(toCenter.lat)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2

  return Math.round(EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function getDirectionLabel(fromCountryName, toCountryName) {
  const fromCenter = COUNTRY_CENTER_MAP.get(fromCountryName)
  const toCenter = COUNTRY_CENTER_MAP.get(toCountryName)

  if (!fromCenter || !toCenter) return null

  const deltaLat = toCenter.lat - fromCenter.lat
  const deltaLng = normalizeLongitudeDelta(toCenter.lng - fromCenter.lng)

  if (Math.abs(deltaLat) < 0.2 && Math.abs(deltaLng) < 0.2) {
    return 'Tout près'
  }

  const angle = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI
  const normalizedAngle = (angle + 360) % 360
  const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest']
  const index = Math.round(normalizedAngle / 45) % 8

  return directions[index]
}

function getDirectionArrow(direction) {
  const arrows = {
    'Nord': '↑',
    'Nord-Est': '↗',
    'Est': '→',
    'Sud-Est': '↘',
    'Sud': '↓',
    'Sud-Ouest': '↙',
    'Ouest': '←',
    'Nord-Ouest': '↖',
    'Tout près': '◎',
  }

  return arrows[direction] ?? '•'
}

function getHemisphereHint(guessName, targetName) {
  const guessedCenter = COUNTRY_CENTER_MAP.get(guessName)
  const targetCenter = COUNTRY_CENTER_MAP.get(targetName)

  if (!guessedCenter || !targetCenter) {
    return { label: 'Inconnue', arrow: '•', tone: 'neutral' }
  }

  const guessHemisphere = guessedCenter.lat >= 0 ? 'Nord' : 'Sud'
  const targetHemisphere = targetCenter.lat >= 0 ? 'Nord' : 'Sud'

  if (guessHemisphere === targetHemisphere) {
    return { label: `Même hémisphère (${targetHemisphere})`, arrow: '◎', tone: 'match' }
  }

  return targetHemisphere === 'Nord'
    ? { label: 'Hémisphère nord', arrow: '↑', tone: 'higher' }
    : { label: 'Hémisphère sud', arrow: '↓', tone: 'lower' }
}

function getAreaHint(guessName, targetName) {
  const guessedArea = COUNTRY_AREA_MAP.get(guessName)
  const targetArea = COUNTRY_AREA_MAP.get(targetName)

  if (!guessedArea || !targetArea) {
    return { label: 'Surface inconnue', arrow: '•', tone: 'neutral' }
  }

  const ratio = guessedArea / targetArea
  if (ratio >= 0.85 && ratio <= 1.15) {
    return { label: 'Surface proche', arrow: '≈', tone: 'match' }
  }

  return ratio < 1
    ? { label: 'Pays plus grand', arrow: '↑', tone: 'higher' }
    : { label: 'Pays plus petit', arrow: '↓', tone: 'lower' }
}

function formatArea(areaKm2) {
  if (!areaKm2) return 'n/a'
  return `${Math.round(areaKm2).toLocaleString('fr-FR')} km²`
}

function isoToFlag(isoA2) {
  if (!isoA2 || isoA2.length !== 2) return ''
  return isoA2
    .toUpperCase()
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('')
}

function buildGuessRecord(guessInput, targetName) {
  const guessedName = guessInput?.value
  const normalizedInput = guessInput?.normalizedInput ?? normalize(guessedName ?? '')
  const isCorrect = Boolean(guessInput?.isCorrect || (guessedName && guessedName === targetName))
  const area = guessedName ? COUNTRY_AREA_MAP.get(guessedName) ?? null : null
  const direction = isCorrect ? 'Tout près' : getDirectionLabel(guessedName, targetName)

  return {
    value: guessedName,
    normalizedInput,
    isCorrect,
    distanceKm: isCorrect ? 0 : getDistanceKm(guessedName, targetName),
    direction,
    directionArrow: getDirectionArrow(direction),
    hemisphereHint: isCorrect
      ? { label: 'Exact', arrow: '◎', tone: 'match' }
      : getHemisphereHint(guessedName, targetName),
    areaHint: isCorrect
      ? { label: 'Exact', arrow: '◎', tone: 'match' }
      : getAreaHint(guessedName, targetName),
    areaLabel: formatArea(area),
    populationHint: isCorrect
      ? { label: 'Exact', arrow: '◎', tone: 'match' }
      : getPopulationHint(guessedName, targetName),
    populationLabel: formatPopulation(guessedName ? COUNTRY_POPULATION_MAP.get(guessedName) : null),
  }
}

export default function useCountryClueState(mode, options = {}) {
  const { overrideCountry = null, initialGuesses = null } = options
  const navigate = useNavigate()
  const [currentCountry, setCurrentCountry] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [guesses, setGuesses] = useState([])
  const [status, setStatus] = useState('playing')
  const [dailyKey, setDailyKey] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(null)
  const initialGuessesUsedRef = useRef(false)

  useEffect(() => {
    if (overrideCountry) return
    if (mode !== 'daily' && mode !== 'infinite') {
      navigate('/')
    }
  }, [mode, navigate, overrideCountry])

  useEffect(() => {
    if (!overrideCountry) return
    setCurrentCountry(overrideCountry)
    if (!initialGuessesUsedRef.current && initialGuesses?.length) {
      setGuesses(initialGuesses)
      initialGuessesUsedRef.current = true
    } else {
      setGuesses([])
    }
    setStatus('playing')
    setInputValue('')
    setHasStarted(true)
    setStartedAt(Date.now())
    setElapsedTime(null)
  }, [overrideCountry]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (overrideCountry) return
    if (mode !== 'daily' && mode !== 'infinite') return

    if (mode === 'daily') {
      const todayKey = getTodayKey()
      const savedProgress = readDailyProgress(todayKey)
      const selectedCountry = getCountryByName(savedProgress?.targetName) ?? getDailyCountry(todayKey)
      const hydratedGuesses = Array.isArray(savedProgress?.guesses)
        ? savedProgress.guesses
          .map((guess) => buildGuessRecord(guess, selectedCountry.properties.ADMIN))
          .filter((guess) => guess.value)
        : []

      setDailyKey(todayKey)
      setCurrentCountry(selectedCountry)
      setGuesses(hydratedGuesses)
      setStatus(savedProgress?.status ?? 'playing')
      setInputValue('')
      const alreadyPlaying =
        savedProgress?.startedAt != null ||
        (savedProgress?.status != null && savedProgress.status !== 'playing') ||
        (Array.isArray(savedProgress?.guesses) && savedProgress.guesses.length > 0)
      setHasStarted(alreadyPlaying)
      setStartedAt(savedProgress?.startedAt ?? null)
      setElapsedTime(savedProgress?.elapsedTime ?? null)
      return
    }

    setDailyKey(null)
    setCurrentCountry(getRandomCountry())
    setGuesses([])
    setStatus('playing')
    setInputValue('')
    setHasStarted(false)
    setStartedAt(null)
    setElapsedTime(null)
  }, [mode])

  useEffect(() => {
    if (overrideCountry) return  // pas de localStorage en multijoueur
    if (mode !== 'daily' || !dailyKey || !currentCountry) return

    writeDailyProgress(dailyKey, {
      targetName: currentCountry.properties.ADMIN,
      guesses,
      status,
      startedAt,
      elapsedTime,
    })
  }, [currentCountry, dailyKey, guesses, mode, status, startedAt, elapsedTime])

  const availableCountrySuggestions = useMemo(() => {
    const suggestions = new Set()

    COUNTRY_CLUE_COUNTRIES.forEach((country) => {
      const names = [country.properties.ADMIN, ...(country.properties.aliases ?? [])]
      names.forEach((name) => suggestions.add(name))
    })

    return [...suggestions].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [])

  const filteredCountrySuggestions = useMemo(() => {
    const normalizedInput = normalize(inputValue)
    if (!normalizedInput) return []

    return availableCountrySuggestions
      .filter((suggestion) => normalize(suggestion).includes(normalizedInput))
      .slice(0, 8)
  }, [availableCountrySuggestions, inputValue])

  const startGame = () => {
    if (hasStarted) return
    const now = Date.now()
    setStartedAt(now)
    setHasStarted(true)
  }

  const isSolved = status === 'won'
  const isLost = status === 'lost'
  const isComplete = isSolved || isLost
  const answerName = currentCountry?.properties?.ADMIN ?? ''
  const answerFlag = isoToFlag(currentCountry?.properties?.ISO_A2)
  const answerCapital = currentCountry?.properties?.capital ?? ''

  const handleSubmit = () => {
    if (!currentCountry || !inputValue.trim() || isComplete) return

    const nextGuess = inputValue.trim()
    const normalizedGuess = normalize(nextGuess)
    const alreadyTried = guesses.some((guess) => guess.normalizedInput === normalizedGuess)
    if (alreadyTried) {
      toast.info('Tu as déjà proposé ce pays.', { containerId: 'topRightToast' })
      return
    }

    const guessedCountry = COUNTRY_LOOKUP.get(normalizedGuess)
    if (!guessedCountry) {
      toast.error("Je ne reconnais pas ce pays.", { containerId: 'topRightToast' })
      return
    }

    const guessedName = guessedCountry.properties.ADMIN
    const isCorrect = checkAnswer(guessedName, answerName, currentCountry.properties.aliases ?? [])
    const nextGuesses = [
      ...guesses,
      buildGuessRecord(
        {
          value: guessedName,
          normalizedInput: normalizedGuess,
          isCorrect,
        },
        answerName
      ),
    ]

    setGuesses(nextGuesses)
    setInputValue('')

    if (isCorrect) {
      const finalElapsed = startedAt != null ? Date.now() - startedAt : null
      setElapsedTime(finalElapsed)
      setStatus('won')
      toast.success(`Bravo ! C'était ${answerName}.`, { containerId: 'topRightToast' })
      return
    }

    toast.info('Indice mis à jour. Continue.', { containerId: 'topRightToast' })
  }

  const startNextInfiniteRound = () => {
    if (mode !== 'infinite') return
    const nextCountry = getRandomCountry(answerName)
    setCurrentCountry(nextCountry)
    setGuesses([])
    setStatus('playing')
    setInputValue('')
    toast.info('Nouveau pays chargé.', { containerId: 'topRightToast' })
  }

  const revealCountry = () => {
    if (!currentCountry || isComplete) return
    setStatus('lost')
    setInputValue('')
    toast.info(`Le pays était ${answerName}.`, { containerId: 'topRightToast' })
  }

  const goHome = () => navigate('/')

  return {
    inputValue,
    setInputValue,
    guesses,
    isSolved,
    isLost,
    isComplete,
    answerName,
    answerFlag,
    answerCapital,
    filteredCountrySuggestions,
    dailyKey,
    hasStarted,
    startGame,
    elapsedTime,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    goHome,
  }
}

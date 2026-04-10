import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import L from 'leaflet'
import countries from '../data/countriesWithDifficulty_FR.json'
import { checkAnswer, normalize } from '../utils/normalizeAnswer'

const DAILY_TIME_ZONE = 'Europe/Paris'
const DAILY_STORAGE_PREFIX = 'border-guess-daily'

const BORDER_GUESS_EXCLUDED = new Set([
  'Glacier de Siachen',
  'Banc Serranilla',
  'Bajo Nuevo Bank (îles Petrel)',
  'Zone non gouvernée de Chypre',
  'Vatican',
  'Base navale américaine de la baie de Guantánamo',
  'Montserrat',
  'Monaco',
  'Saint-Martin',
  'Nauru',
  'Gibraltar',
  'Wallis-et-Futuna',
  'Îles de la mer de Corail',
  'Îles Cook',
  'Curaçao', 'Tonga'
])

export const BORDER_GUESS_COUNTRIES = countries.features.filter(
  (country) =>
    country?.properties?.ADMIN &&
    country?.geometry?.coordinates?.length &&
    !BORDER_GUESS_EXCLUDED.has(country.properties.ADMIN)
)

export const BORDER_GUESS_COUNTRY_COUNT = BORDER_GUESS_COUNTRIES.length

function normalizeLongitudeDelta(deltaLng) {
  let normalized = deltaLng

  while (normalized > 180) normalized -= 360
  while (normalized < -180) normalized += 360

  return normalized
}

function collectCoordinates(geometry) {
  if (!geometry) return []

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat()
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2)
  }

  return []
}

function getGeographicCenter(country) {
  const coordinates = collectCoordinates(country.geometry)
  if (coordinates.length === 0) {
    return L.geoJSON(country).getBounds().getCenter()
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

  return L.latLng(lat, lng)
}

const COUNTRY_CENTER_MAP = new Map(
  BORDER_GUESS_COUNTRIES.map((country) => [country.properties.ADMIN, getGeographicCenter(country)])
)

const COUNTRY_LOOKUP = (() => {
  const entries = new Map()

  BORDER_GUESS_COUNTRIES.forEach((country) => {
    const names = [country.properties.ADMIN, ...(country.properties.aliases ?? [])]
    names.forEach((name) => {
      entries.set(normalize(name), country)
    })
  })

  return entries
})()

function getCountryByName(name) {
  return BORDER_GUESS_COUNTRIES.find((country) => country.properties.ADMIN === name) ?? null
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
  const countryIndex = hashString(`border-guess:${dateKey}`) % BORDER_GUESS_COUNTRIES.length
  return BORDER_GUESS_COUNTRIES[countryIndex]
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

function writeDailyProgress(dateKey, progress) {
  try {
    window.localStorage.setItem(buildDailyStorageKey(dateKey), JSON.stringify(progress))
  } catch {
    // Ignore localStorage write failures.
  }
}

function getRandomCountry(excludedName = null) {
  const pool = excludedName
    ? BORDER_GUESS_COUNTRIES.filter((country) => country.properties.ADMIN !== excludedName)
    : BORDER_GUESS_COUNTRIES

  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

function toRadians(value) {
  return (value * Math.PI) / 180
}

function getDistanceKm(fromCountryName, toCountryName) {
  const fromCenter = COUNTRY_CENTER_MAP.get(fromCountryName)
  const toCenter = COUNTRY_CENTER_MAP.get(toCountryName)

  if (!fromCenter || !toCenter) return null

  const earthRadiusKm = 6371
  const deltaLat = toRadians(toCenter.lat - fromCenter.lat)
  const deltaLng = toRadians(normalizeLongitudeDelta(toCenter.lng - fromCenter.lng))
  const fromLat = toRadians(fromCenter.lat)
  const toLat = toRadians(toCenter.lat)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
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

  return arrows[direction] ?? null
}

export default function useBorderGuessState(mode, options = {}) {
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
    if (overrideCountry) return  // pas de redirect en mode multijoueur
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
    if (overrideCountry) return  // géré par l'effet overrideCountry
    if (mode !== 'daily' && mode !== 'infinite') return

    if (mode === 'daily') {
      const todayKey = getTodayKey()
      const savedProgress = readDailyProgress(todayKey)
      const selectedCountry = getCountryByName(savedProgress?.targetName) ?? getDailyCountry(todayKey)

      setDailyKey(todayKey)
      setCurrentCountry(selectedCountry)
      setGuesses(Array.isArray(savedProgress?.guesses) ? savedProgress.guesses : [])
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

    BORDER_GUESS_COUNTRIES.forEach((country) => {
      const names = [country.properties.ADMIN, ...(country.properties.aliases ?? [])]

      names.forEach((name) => {
        suggestions.add(name)
      })
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
      {
        value: guessedName,
        normalizedInput: normalizedGuess,
        isCorrect,
        distanceKm: isCorrect ? 0 : getDistanceKm(guessedName, answerName),
        direction: isCorrect ? null : getDirectionLabel(guessedName, answerName),
        directionArrow: isCorrect ? null : getDirectionArrow(getDirectionLabel(guessedName, answerName)),
      },
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


    toast.error("Ce n'est pas le bon pays.", { containerId: 'topRightToast' })
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
    currentCountry,
    inputValue,
    setInputValue,
    guesses,
    status,
    isSolved,
    isLost,
    isComplete,
    answerName,
    availableCountrySuggestions,
    filteredCountrySuggestions,
    dailyKey,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    goHome,
    hasStarted,
    startGame,
    elapsedTime,
  }
}

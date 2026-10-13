import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { checkAnswer, normalize } from '../utils/normalizeAnswer'
import { hasCountryGeometry, collectCoordinates, getRingAreaKm2, getCountryAreaKm2, getGeographicCenter, EARTH_RADIUS_KM } from '../utils/countryArea'
import { getCountryName, getAllCountryNames } from '../utils/getCountryName'
import { LANGUAGE_CODES, localeOf } from '../i18n/languages'
import countryAliases from '../data/countryAliases.json'
import useDailyKey from './useDailyKey'
import { STABLE_DAILY_PICK_SINCE, pickDaily } from '../utils/dailyPick'

const DAILY_STORAGE_PREFIX = 'country-clue-daily'

export const COUNTRY_CLUE_COUNTRIES = countries.features.filter(
  (country) =>
    country?.properties?.ADMIN &&
    hasCountryGeometry(country) &&
    country?.properties?.ISO_A2  // exclut les territoires sans code ISO (intraduisibles)
)

export const COUNTRY_CLUE_COUNTRY_COUNT = COUNTRY_CLUE_COUNTRIES.length

function normalizeLongitudeDelta(deltaLng) {
  let normalized = deltaLng

  while (normalized > 180) normalized -= 360
  while (normalized < -180) normalized += 360

  return normalized
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

  // Also index EN and RU names so players can type in those languages
  for (const feature of COUNTRY_CLUE_COUNTRIES) {
    const iso = feature.properties.ISO_A2
    for (const lang of LANGUAGE_CODES) {
      const name = getCountryName(iso, lang)
      if (name) {
        const key = normalize(name)
        if (!entries.has(key)) entries.set(key, feature)
      }
    }
  }

  // Extend with abbreviations and colloquial names (USA, UK, РФ, etc.)
  for (const feature of COUNTRY_CLUE_COUNTRIES) {
    const iso = feature.properties.ISO_A2?.toUpperCase()
    if (!iso) continue
    const extraAliases = countryAliases[iso] ?? []
    for (const alias of extraAliases) {
      const key = normalize(alias)
      if (!entries.has(key)) entries.set(key, feature)
    }
  }

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

function getDailyCountry(dateKey) {
  if (dateKey >= STABLE_DAILY_PICK_SINCE) {
    return pickDaily(COUNTRY_CLUE_COUNTRIES, `country-clue:${dateKey}`, (country) => country.properties.ADMIN)
  }
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

// Formatted in the player's language (French when it is unknown)
function formatPopulation(pop, lang) {
  if (!pop) return 'n/a'
  const locale = localeOf(lang, 'fr')
  if (pop >= 1000000) return `${(pop / 1000000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`
  if (pop >= 1000) return `${Math.round(pop / 1000).toLocaleString(locale)} k`
  return pop.toLocaleString(locale)
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

function formatArea(areaKm2, lang) {
  if (!areaKm2) return 'n/a'
  return `${Math.round(areaKm2).toLocaleString(localeOf(lang, 'fr'))} km²`
}

function isoToFlag(isoA2) {
  if (!isoA2 || isoA2.length !== 2) return ''
  return isoA2
    .toUpperCase()
    .split('')
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('')
}

function buildGuessRecord(guessInput, targetName, lang) {
  const guessedName = guessInput?.value
  const normalizedInput = guessInput?.normalizedInput ?? normalize(guessedName ?? '')
  const isCorrect = Boolean(guessInput?.isCorrect || (guessedName && guessedName === targetName))
  const area = guessedName ? COUNTRY_AREA_MAP.get(guessedName) ?? null : null
  const direction = isCorrect ? 'Tout près' : getDirectionLabel(guessedName, targetName)

  return {
    value: guessedName,
    isoA2: guessInput?.isoA2 ?? null,
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
    areaLabel: formatArea(area, lang),
    populationHint: isCorrect
      ? { label: 'Exact', arrow: '◎', tone: 'match' }
      : getPopulationHint(guessedName, targetName),
    populationLabel: formatPopulation(guessedName ? COUNTRY_POPULATION_MAP.get(guessedName) : null, lang),
  }
}

export default function useCountryClueState(mode, options = {}) {
  const { overrideCountry = null, initialGuesses = null } = options
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [currentCountry, setCurrentCountry] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [guesses, setGuesses] = useState([])
  const [status, setStatus] = useState('playing')
  const [dailyKey, setDailyKey] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(null)
  const initialGuessesUsedRef = useRef(false)
  const todayKey = useDailyKey(mode === 'daily' && !overrideCountry)

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
      if (!todayKey) {
        // Heure serveur pas encore connue : on attend avant de choisir le pays du jour
        setDailyKey(null)
        setCurrentCountry(null)
        setGuesses([])
        setStatus('playing')
        setHasStarted(false)
        setStartedAt(null)
        setElapsedTime(null)
        return
      }
      const savedProgress = readDailyProgress(todayKey)
      const selectedCountry = getCountryByName(savedProgress?.targetName) ?? getDailyCountry(todayKey)
      const hydratedGuesses = Array.isArray(savedProgress?.guesses)
        ? savedProgress.guesses
          .map((guess) => buildGuessRecord(guess, selectedCountry.properties.ADMIN, i18n.language))
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
  }, [mode, todayKey])

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
    const lang = i18n.language
    const suggestions = new Set()
    COUNTRY_CLUE_COUNTRIES.forEach((country) => {
      const localizedName = getCountryName(country.properties.ISO_A2, lang) || country.properties.ADMIN
      suggestions.add(localizedName)
    })
    const sortLocale = localeOf(lang, 'fr')
    return [...suggestions].sort((a, b) => a.localeCompare(b, sortLocale))
  }, [i18n.language])

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
      toast.info(t('toasts.already_proposed'), { containerId: 'topRightToast' })
      return
    }

    const guessedCountry = COUNTRY_LOOKUP.get(normalizedGuess)
    if (!guessedCountry) {
      toast.error(t('survival.not_a_country'), { containerId: 'topRightToast' })
      return
    }

    const guessedName = guessedCountry.properties.ADMIN
    const iso = currentCountry.properties.ISO_A2
    const adminName = currentCountry.properties.ADMIN
    const aliases = currentCountry.properties.aliases ?? []
    const extraNames = getAllCountryNames(iso, adminName, aliases)
    const isCorrect = checkAnswer(guessedName, adminName, aliases, extraNames)
    const nextGuesses = [
      ...guesses,
      buildGuessRecord(
        {
          value: guessedName,
          isoA2: guessedCountry.properties.ISO_A2 ?? null,
          normalizedInput: normalizedGuess,
          isCorrect,
        },
        answerName,
        i18n.language
      ),
    ]

    setGuesses(nextGuesses)
    setInputValue('')

    if (isCorrect) {
      const finalElapsed = startedAt != null ? Date.now() - startedAt : null
      setElapsedTime(finalElapsed)
      setStatus('won')
      toast.success(t('toasts.country_was', { name: getCountryName(iso, i18n.language) || answerName }), { containerId: 'topRightToast' })
      return
    }

    toast.info(t('toasts.hint_updated'), { containerId: 'topRightToast' })
  }

  const startNextInfiniteRound = () => {
    if (mode !== 'infinite') return
    const nextCountry = getRandomCountry(answerName)
    setCurrentCountry(nextCountry)
    setGuesses([])
    setStatus('playing')
    setInputValue('')
  }

  const revealCountry = () => {
    if (!currentCountry || isComplete) return
    setStatus('lost')
    setInputValue('')
    toast.info(t('toasts.answer_reveal', { name: getCountryName(currentCountry.properties.ISO_A2, i18n.language) || answerName }), { containerId: 'topRightToast' })
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
    currentCountryISO: currentCountry?.properties?.ISO_A2 ?? null,
    filteredCountrySuggestions,
    dailyKey,
    hasStarted,
    startGame,
    startedAt,
    elapsedTime,
    handleSubmit,
    startNextInfiniteRound,
    revealCountry,
    goHome,
  }
}

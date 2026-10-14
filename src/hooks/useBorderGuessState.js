import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { checkAnswer, normalize } from '../utils/normalizeAnswer'
import { getAllCountryNames, getCountryName } from '../utils/getCountryName'
import { LANGUAGE_CODES, localeOf } from '../i18n/languages'
import countryAliases from '../data/countryAliases.json'
import { getGeographicCenter, hasCountryGeometry } from '../utils/countryArea'
import useDailyKey from './useDailyKey'
import { STABLE_DAILY_PICK_SINCE, pickDaily } from '../utils/dailyPick'

const DAILY_STORAGE_PREFIX = 'border-guess-daily'

// Frozen list of what was excluded when the legacy daily draw (`hash % length`) was in use: do not edit it, see
// BORDER_GUESS_REINSTATED to bring a country back.
const BORDER_GUESS_EXCLUDED = new Set([
  'Glacier de Siachen',
  'Banc Serranilla',
  'Bajo Nuevo Bank (îles Petrel)',
  'Zone non gouvernée de Chypre',
  'Vatican',
  'Base navale américaine de la baie de Guantánamo',
  'Cosmodrome de Baïkonour',
  'Montserrat',
  'Monaco',
  'Saint-Martin',
  'Nauru',
  'Gibraltar',
  'Wallis-et-Futuna',
  'Îles de la mer de Corail',
  'Îles Cook',
  'Curaçao', 'Tonga', 'Îles Pitcairn', 'Antarctique',
  // Archipels réduits à des points épars, sans forme reconnaissable
  'Îles Marshall',
  'Tuvalu',
  'Maldives',
  'Kiribati',
  'États fédérés de Micronésie',
  'Îles Mariannes du Nord',
  'Palaos',
  'Îles Spratly',
  'Îles mineures éloignées des États-Unis',
  "Territoire britannique de l'océan Indien",
  'Île Clipperton',
  'Îles Ashmore et Cartier',
  'Récif Scarborough',
  // Territoires minuscules ou trop fragmentés pour être devinés
  'Seychelles',
  'Îles Turques-et-Caïques',
  'Îles Vierges britanniques',
  'Îles Vierges américaines',
  'Sainte-Hélène',
  'Samoa américaines',
  'Saint-Barthélemy',
  'Anguilla',
  'Niue',
  'Île Norfolk',
  'Macao R.A.S.',
  "Zone de souveraineté d'Akrotiri",
  'Zone de souveraineté de Dhekelia',
  'Bermudes',
  'Saint-Christophe-et-Niévès',
  'Barbade',
  'Cap-Vert',
  'Terres australes et antarctiques françaises',
  'Malte',
  'Saint-Marin',
  'Guernesey',
  "Territoires de l'océan Indien",
  'Jersey',
  'Liechtenstein',
  'Aruba',
  'Saint-Pierre-et-Miquelon',
  'Îles Caïmans',
  'Grenade',
  'Saint-Vincent-et-les Grenadines',
  'Îles Heard et MacDonald',
  'Andorre',
  'Antigua-et-Barbuda',
  'Singapour',
  'Guam',
  'Île de Man',
  'Bahreïn',
  'Sainte-Lucie',
  'Dominique',
  'Aland',
  'Hong Kong R.A.S.',
  'Sao Tomé-et-Principe',
  'Îles Féroé',
  'Comores',
  'Maurice',
  'Samoa',
  'Polynésie française',
  'Géorgie du Sud et les îles Sandwich du Sud',
  'Îles Salomon',
])

// Removed from the game after some days' countries were drawn with `hash % length` (see getDailyCountry): those days
// keep drawing from the list as it was, so their country doesn't change.
const REMOVED_AFTER_LEGACY_DAILIES = new Set([
  'Saint-Christophe-et-Niévès',
  'Barbade',
  'Cap-Vert',
  'Terres australes et antarctiques françaises',
  'Malte',
  'Saint-Marin',
  'Guernesey',
  "Territoires de l'océan Indien",
  'Jersey',
  'Liechtenstein',
  'Aruba',
  'Saint-Pierre-et-Miquelon',
  'Îles Caïmans',
  'Grenade',
  'Saint-Vincent-et-les Grenadines',
  'Îles Heard et MacDonald',
  'Andorre',
  'Antigua-et-Barbuda',
  'Singapour',
  'Guam',
  'Île de Man',
  'Bahreïn',
  'Sainte-Lucie',
  'Dominique',
  'Aland',
  'Hong Kong R.A.S.',
  'Sao Tomé-et-Principe',
  'Îles Féroé',
  'Comores',
  'Maurice',
  'Samoa',
  'Polynésie française',
  'Géorgie du Sud et les îles Sandwich du Sud',
  'Îles Salomon',
])

// Excluded countries brought back so the harder tiers have enough to draw from. Islands and microstates with a
// shape that can be learned; the scattered-dots archipelagos and uninhabited zones stay out.
const BORDER_GUESS_REINSTATED = new Set([
  'Îles Salomon',
  'Samoa',
  'Tonga',
  'Sao Tomé-et-Principe',
  'Barbade',
  'Sainte-Lucie',
  'Dominique',
  'Grenade',
  'Antigua-et-Barbuda',
  'Saint-Vincent-et-les Grenadines',
  'Saint-Christophe-et-Niévès',
  'Curaçao',
  'Guam',
  'Polynésie française',
  'Îles Caïmans',
  'Île de Man',
  'Jersey',
  'Guernesey',
  'Aruba',
  'Bermudes',
  'Aland',
  'Îles Féroé',
  'Cap-Vert',
  'Comores',
  'Maurice',
  'Malte',
  'Bahreïn',
  'Singapour',
  'Andorre',
  'Liechtenstein',
  'Saint-Marin',
  'Hong Kong R.A.S.',
  'Macao R.A.S.',
  'Gibraltar',
])

export const BORDER_GUESS_COUNTRIES = countries.features.filter(
  (country) =>
    country?.properties?.ADMIN &&
    hasCountryGeometry(country) &&
    (!BORDER_GUESS_EXCLUDED.has(country.properties.ADMIN) || BORDER_GUESS_REINSTATED.has(country.properties.ADMIN))
)

export const BORDER_GUESS_COUNTRY_COUNT = BORDER_GUESS_COUNTRIES.length

const LEGACY_DAILY_COUNTRIES = countries.features.filter(
  (country) =>
    country?.properties?.ADMIN &&
    hasCountryGeometry(country) &&
    (!BORDER_GUESS_EXCLUDED.has(country.properties.ADMIN) || REMOVED_AFTER_LEGACY_DAILIES.has(country.properties.ADMIN))
)

// Multiplayer: guesses allowed per country. A country not found (passed or out of guesses) counts as this many errors,
// so passing never ranks better than trying.
export const ROOM_MAX_ATTEMPTS = 3

/** Errors a finished multiplayer round adds to the player's total. */
export function roomRoundErrors(guesses, isSolved) {
  return isSolved ? guesses.filter((guess) => !guess.isCorrect).length : ROOM_MAX_ATTEMPTS
}

function normalizeLongitudeDelta(deltaLng) {
  let normalized = deltaLng

  while (normalized > 180) normalized -= 360
  while (normalized < -180) normalized += 360

  return normalized
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

  // Extend with EN and RU names so users can type in those languages
  for (const feature of BORDER_GUESS_COUNTRIES) {
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
  for (const feature of BORDER_GUESS_COUNTRIES) {
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

function getCountryByName(name) {
  return BORDER_GUESS_COUNTRIES.find((country) => country.properties.ADMIN === name) ?? null
}

/** The Border Guess country a typed name designates (any language), or null. */
export function findBorderGuessCountry(input) {
  return COUNTRY_LOOKUP.get(normalize(input.trim())) ?? null
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
    return pickDaily(BORDER_GUESS_COUNTRIES, `border-guess:${dateKey}`, (country) => country.properties.ADMIN)
  }
  const countryIndex = hashString(`border-guess:${dateKey}`) % LEGACY_DAILY_COUNTRIES.length
  return LEGACY_DAILY_COUNTRIES[countryIndex]
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

/** A guess of `guessedCountry` against `answerName`: distance and direction when wrong. */
export function buildBorderGuess(guessedCountry, normalizedInput, isCorrect, answerName) {
  const guessedName = guessedCountry.properties.ADMIN
  const direction = isCorrect ? null : getDirectionLabel(guessedName, answerName)
  return {
    value: guessedName,
    iso: guessedCountry.properties.ISO_A2 ?? null,
    normalizedInput,
    isCorrect,
    distanceKm: isCorrect ? 0 : getDistanceKm(guessedName, answerName),
    direction,
    directionArrow: isCorrect ? null : getDirectionArrow(direction),
  }
}

export default function useBorderGuessState(mode, options = {}) {
  const { overrideCountry = null, initialGuesses = null, maxAttempts = null } = options
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
    BORDER_GUESS_COUNTRIES.forEach((country) => {
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
    const extraNames = getAllCountryNames(
      currentCountry.properties.ISO_A2,
      answerName,
      currentCountry.properties.aliases ?? []
    )
    const isCorrect = checkAnswer(guessedName, answerName, currentCountry.properties.aliases ?? [], extraNames)
    const nextGuesses = [...guesses, buildBorderGuess(guessedCountry, normalizedGuess, isCorrect, answerName)]

    setGuesses(nextGuesses)
    setInputValue('')

    if (isCorrect) {
      const finalElapsed = startedAt != null ? Date.now() - startedAt : null
      setElapsedTime(finalElapsed)
      setStatus('won')
      toast.success(t('toasts.country_was', { name: getCountryName(currentCountry.properties.ISO_A2, i18n.language) || answerName }), { containerId: 'topRightToast' })
      return
    }

    if (maxAttempts != null && nextGuesses.length >= maxAttempts) {
      setStatus('lost')
    }

    toast.error(t('toasts.wrong'), { containerId: 'topRightToast' })
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
    currentCountry,
    currentCountryISO: currentCountry?.properties?.ISO_A2 ?? null,
    inputValue,
    setInputValue,
    guesses,
    attemptsLeft: maxAttempts != null ? Math.max(0, maxAttempts - guesses.length) : null,
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
    startedAt,
    elapsedTime,
  }
}

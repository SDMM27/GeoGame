// src/hooks/useRankingGameState.js
import { useEffect, useMemo, useRef, useState } from 'react'
import countries from '../data/countriesWithDifficulty_FR.json'
import { getCountryAreaKm2 } from '../utils/countryArea'
import { CRITERIA, CRITERIA_KEYS, buildCountryPool } from '../utils/rankingCriteria'
import { getRankingGamePoints } from '../utils/scoringRules'

const DAILY_TIME_ZONE = 'Europe/Paris'
const DAILY_STORAGE_PREFIX = 'ranking-daily'
const COUNTRY_COUNT = { Facile: 5, Moyen: 8, Difficile: 10 }
const DAILY_COUNT = 6

const RANKING_COUNTRIES = countries.features.filter(
  (country) => country?.properties?.ADMIN && country?.geometry?.coordinates?.length
)

// --- Pure helpers (exported for testing) ---

export function computeTotalError(playerOrder, correctOrder) {
  const correctIndexMap = new Map(
    correctOrder.map((country, i) => [country.properties.ISO_A3, i])
  )
  return playerOrder.reduce((sum, country, playerIdx) => {
    const correctIdx = correctIndexMap.get(country.properties.ISO_A3) ?? playerIdx
    return sum + Math.abs(playerIdx - correctIdx)
  }, 0)
}

export function pickCriterionKey(key) {
  if (key && CRITERIA_KEYS.includes(key)) return key
  return CRITERIA_KEYS[Math.floor(Math.random() * CRITERIA_KEYS.length)]
}

// --- Private helpers ---

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
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

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function pickN(pool, n, rand) {
  const available = [...pool]
  const selected = []
  for (let i = 0; i < n && available.length > 0; i++) {
    const idx = Math.floor(rand() * available.length)
    selected.push(available.splice(idx, 1)[0])
  }
  return selected
}

function shuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function computeCorrectOrder(countryList, criterion, areaMap) {
  return [...countryList].sort((a, b) => {
    const va = criterion.compute(a, areaMap) ?? -Infinity
    const vb = criterion.compute(b, areaMap) ?? -Infinity
    return vb - va
  })
}

function readDailyProgress(dateKey) {
  try {
    const raw = window.localStorage.getItem(`${DAILY_STORAGE_PREFIX}:${dateKey}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDailyProgress(dateKey, data) {
  try {
    window.localStorage.setItem(
      `${DAILY_STORAGE_PREFIX}:${dateKey}`,
      JSON.stringify(data)
    )
  } catch {
    // localStorage unavailable — ignore
  }
}

// --- Hook ---

export default function useRankingGameState(mode, options = {}) {
  const { difficulty = 'Facile' } = options

  const areaMap = useMemo(
    () => new Map(RANKING_COUNTRIES.map((c) => [c.properties.ADMIN, getCountryAreaKm2(c)])),
    []
  )

  const [countries, setCountries] = useState([])
  const [criterion, setCriterion] = useState(null)
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(null)
  const [totalError, setTotalError] = useState(null)
  const [correctOrder, setCorrectOrder] = useState([])
  const [countryValues, setCountryValues] = useState(new Map())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  // Timer management
  useEffect(() => {
    if (isTimerRunning) {
      startTimeRef.current = Date.now() - elapsedTime
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current)
      }, 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isTimerRunning])

  // Initialize on mode/difficulty change
  useEffect(() => {
    if (mode === 'daily') {
      initDailyRound()
    } else {
      initInfiniteRound()
    }
    return () => clearInterval(timerRef.current)
  }, [mode, difficulty])

  function initDailyRound() {
    const dateKey = getTodayKey()
    const saved = readDailyProgress(dateKey)

    if (saved) {
      const savedCriterion = CRITERIA[saved.criterion]
      const restoredCountries = saved.playerOrder
        .map((iso) => RANKING_COUNTRIES.find((c) => c.properties.ISO_A3 === iso))
        .filter(Boolean)

      const alreadyStarted = saved.hasStarted === true || (saved.elapsedTime ?? 0) > 0 || saved.status === 'submitted'

      setCriterion(savedCriterion)
      setCountries(restoredCountries)
      setStatus(saved.status)
      setElapsedTime(saved.elapsedTime ?? 0)
      setHasStarted(alreadyStarted)

      if (alreadyStarted && saved.status === 'playing') {
        setIsTimerRunning(true)
      }

      if (saved.status === 'submitted') {
        const correct = computeCorrectOrder(restoredCountries, savedCriterion, areaMap)
        setCorrectOrder(correct)
        setScore(saved.score)
        setTotalError(saved.totalError)
        setCountryValues(buildValuesMap(restoredCountries, savedCriterion, areaMap))
      }
    } else {
      const seed = hashString(`ranking:${dateKey}`)
      const rand = seededRandom(seed)
      const criterionKey = CRITERIA_KEYS[Math.floor(rand() * CRITERIA_KEYS.length)]
      const crit = CRITERIA[criterionKey]
      const pool = buildCountryPool(RANKING_COUNTRIES, crit, areaMap)
      const selected = pickN(pool, DAILY_COUNT, rand)
      const shuffled = shuffle(selected, seededRandom(seed + 1))

      setCriterion(crit)
      setCountries(shuffled)
      setStatus('playing')
      setElapsedTime(0)
      setIsTimerRunning(false)
      setHasStarted(false)

      saveDailyProgress(dateKey, {
        criterion: criterionKey,
        initialOrder: shuffled.map((c) => c.properties.ISO_A3),
        playerOrder: shuffled.map((c) => c.properties.ISO_A3),
        status: 'playing',
        hasStarted: false,
        elapsedTime: 0,
        score: null,
        totalError: null,
      })
    }
  }

  function initInfiniteRound() {
    const n = COUNTRY_COUNT[difficulty] ?? 5
    const criterionKey = pickCriterionKey(null)
    const crit = CRITERIA[criterionKey]
    const pool = buildCountryPool(RANKING_COUNTRIES, crit, areaMap)
    const selected = pickN(pool, n, Math.random.bind(Math))
    const shuffled = selected.sort(() => Math.random() - 0.5)

    setCriterion(crit)
    setCountries(shuffled)
    setStatus('playing')
    setScore(null)
    setTotalError(null)
    setCorrectOrder([])
    setCountryValues(new Map())
    setElapsedTime(0)
    setIsTimerRunning(false)
    setHasStarted(true)
  }

  function startGame() {
    if (hasStarted || status !== 'playing') return
    setHasStarted(true)
    setIsTimerRunning(true)
    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      if (saved) {
        saveDailyProgress(dateKey, { ...saved, hasStarted: true })
      }
    }
  }

  function reorderCountries(newOrder) {
    setCountries(newOrder)
    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      if (saved) {
        saveDailyProgress(dateKey, {
          ...saved,
          playerOrder: newOrder.map((c) => c.properties.ISO_A3),
        })
      }
    }
  }

  function handleSubmit() {
    if (status !== 'playing' || !criterion) return

    setIsTimerRunning(false)
    const finalTime = elapsedTime

    const correct = computeCorrectOrder(countries, criterion, areaMap)
    const error = computeTotalError(countries, correct)
    const pts = getRankingGamePoints(error, countries.length)
    const valuesMap = buildValuesMap(countries, criterion, areaMap)

    setCorrectOrder(correct)
    setTotalError(error)
    setScore(pts)
    setCountryValues(valuesMap)
    setStatus('submitted')

    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      saveDailyProgress(dateKey, {
        ...(saved ?? {}),
        playerOrder: countries.map((c) => c.properties.ISO_A3),
        status: 'submitted',
        score: pts,
        totalError: error,
        elapsedTime: finalTime,
      })
    }
  }

  function startNextRound() {
    if (mode !== 'infinite') return
    initInfiniteRound()
  }

  return {
    criterion,
    countries,
    countryValues,
    reorderCountries,
    status,
    score,
    totalError,
    correctOrder,
    elapsedTime,
    hasStarted,
    startGame,
    handleSubmit,
    startNextRound,
    dailyKey: mode === 'daily' ? getTodayKey() : null,
  }
}

function buildValuesMap(countryList, criterion, areaMap) {
  return new Map(
    countryList.map((country) => {
      const val = criterion.compute(country, areaMap)
      return [country.properties.ISO_A3, val != null ? criterion.format(val) : '—']
    })
  )
}

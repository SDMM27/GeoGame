// src/hooks/useRankingGameState.js
import { useEffect, useMemo, useState } from 'react'
import countries from '../data/countriesWithDifficulty_FR.json'
import i18n from '../i18n'
import { getCountryAreaKm2, hasCountryGeometry } from '../utils/countryArea'
import { mulberry32 } from '../utils/prng'
import { CRITERIA, CRITERIA_KEYS, buildCountryPool } from '../utils/rankingCriteria'
import { getRankingAttemptScore } from '../utils/scoringRules'
import useDailyKey from './useDailyKey'

// v2: the daily ranks the same countries by every criterion in turn (one stage per criterion).
const DAILY_STORAGE_PREFIX = 'ranking-daily-v2'
const DAILY_COUNT = 5
const MAX_ATTEMPTS = 3

const RANKING_COUNTRIES = countries.features.filter(
  (country) => country?.properties?.ADMIN && hasCountryGeometry(country)
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

export function computePositionFeedback(playerOrder, correctOrder) {
  return playerOrder.map(
    (country, i) => country.properties.ISO_A3 === correctOrder[i].properties.ISO_A3
  )
}

// Total of the stages played: points, best total error of each stage, attempts.
export function sumStages(stages) {
  return stages.reduce(
    (total, stage) => ({
      score: total.score + stage.score,
      totalError: total.totalError + stage.totalError,
      attempts: total.attempts + stage.attempts,
    }),
    { score: 0, totalError: 0, attempts: 0 }
  )
}

// What the leaderboard shows of a round (`playerOrder` of daily_scores): one line per stage,
// "<criterion label> : A > B > C", with `labelOf(criterionKey)`.
export function describePlayedOrders(stageResults, labelOf) {
  return stageResults.map(
    (stage) => `${labelOf(stage.criterion.key)} : ${stage.playerOrder.map((c) => c.properties.ADMIN).join(' > ')}`
  )
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

function buildValuesMap(countryList, criterion, areaMap) {
  return new Map(
    countryList.map((country) => {
      const val = criterion.compute(country, areaMap)
      return [country.properties.ISO_A3, val != null ? criterion.format(val, i18n.language) : '—']
    })
  )
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

const AREA_MAP = new Map(RANKING_COUNTRIES.map((c) => [c.properties.ADMIN, getCountryAreaKm2(c)]))

const isoOf = (country) => country.properties.ISO_A3

// The daily of `dateKey`: every criterion in a seeded order, countries valid for all of them,
// and the starting order of each stage.
function buildDailySetup(dateKey) {
  const seed = hashString(`ranking:${dateKey}`)
  const rand = seededRandom(seed)
  // Le premier tirage de seededRandom varie à peine d'un jour à l'autre : on l'écarte.
  rand()
  const criteriaKeys = shuffle(CRITERIA_KEYS, mulberry32(seed))
  const pool = RANKING_COUNTRIES.filter((country) =>
    CRITERIA_KEYS.every((key) => CRITERIA[key].compute(country, AREA_MAP) > 0)
  )
  const selected = pickN(pool, DAILY_COUNT, rand)
  const startOrders = criteriaKeys.map((_, i) => shuffle(selected, seededRandom(seed + 1 + i)))
  return { criteriaKeys, startOrders }
}

// A finished stage as the results screens show it: orders as country features, and the values.
function stageDetails(stage, countryList) {
  const criterion = CRITERIA[stage.criterion]
  const byIso = new Map(countryList.map((country) => [isoOf(country), country]))
  const playerOrder = stage.playerOrder.map((iso) => byIso.get(iso)).filter(Boolean)
  return {
    ...stage,
    criterion,
    playerOrder,
    correctOrder: computeCorrectOrder(playerOrder, criterion, AREA_MAP),
    values: buildValuesMap(playerOrder, criterion, AREA_MAP),
  }
}

// --- Hook ---

// A round ranks a set of countries by one criterion per stage, in up to MAX_ATTEMPTS attempts each
// (getRankingAttemptScore points when found, 0 otherwise). The daily has one stage per criterion on the
// same countries, and its score is the sum of the stages; an infinite round has a single stage.
// status: 'choosing-category' (infinite) → 'playing' → 'stage-done' (daily, between stages) → 'submitted'.
export default function useRankingGameState(mode, options = {}) {
  const { countryCount = 5 } = options

  const [criteriaKeys, setCriteriaKeys] = useState([])
  const [startOrders, setStartOrders] = useState([])
  const [stages, setStages] = useState([])
  const [countries, setCountries] = useState([])
  const [status, setStatus] = useState('idle')
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [positionFeedback, setPositionFeedback] = useState(null)
  const [bestTotalError, setBestTotalError] = useState(null)
  const dailyKey = useDailyKey(mode === 'daily')

  // The stage being played, or the one just finished.
  const stageIndex = Math.max(0, status === 'playing' ? stages.length : stages.length - 1)
  const criterion = CRITERIA[criteriaKeys[stageIndex]] ?? null
  const stageResults = useMemo(
    () => stages.map((stage) => stageDetails(stage, startOrders[0] ?? [])),
    [stages, startOrders]
  )
  const totals = useMemo(() => sumStages(stages), [stages])
  const lastStage = status === 'stage-done' || status === 'submitted' ? stageResults[stageResults.length - 1] : null

  function resetRound() {
    setCriteriaKeys([])
    setStartOrders([])
    setStages([])
    setCountries([])
    setAttemptNumber(1)
    setPositionFeedback(null)
    setBestTotalError(null)
  }

  // Initialize on mode/countryCount change
  useEffect(() => {
    if (mode === 'daily' && dailyKey) {
      initDailyRound(dailyKey)
    } else {
      // Daily : 'idle' le temps de connaître le jour (heure serveur)
      resetRound()
      setStatus(mode === 'daily' ? 'idle' : 'choosing-category')
    }
  }, [mode, countryCount, dailyKey])

  function initDailyRound(dateKey) {
    const setup = buildDailySetup(dateKey)
    const saved = readDailyProgress(dateKey)
    const savedStages = Array.isArray(saved?.stages) ? saved.stages : []
    const savedStatus = saved?.status ?? 'playing'
    // Playing: the next stage's countries; between stages or at the end: the last stage played.
    const current = setup.startOrders[Math.max(0, savedStatus === 'playing' ? savedStages.length : savedStages.length - 1)]
    const byIso = new Map(current.map((country) => [isoOf(country), country]))
    const restored = (saved?.playerOrder ?? []).map((iso) => byIso.get(iso)).filter(Boolean)

    setCriteriaKeys(setup.criteriaKeys)
    setStartOrders(setup.startOrders)
    setStages(savedStages)
    setCountries(restored.length === current.length ? restored : current)
    setStatus(savedStatus)
    setAttemptNumber(saved?.attemptNumber ?? 1)
    setPositionFeedback(saved?.positionFeedback ?? null)
    setBestTotalError(saved?.bestTotalError ?? null)

    if (!saved) {
      saveDailyProgress(dateKey, {
        stages: [],
        playerOrder: current.map(isoOf),
        status: 'playing',
        attemptNumber: 1,
        positionFeedback: null,
        bestTotalError: null,
      })
    }
  }

  function updateDailyProgress(changes) {
    if (mode !== 'daily' || !dailyKey) return
    saveDailyProgress(dailyKey, { ...(readDailyProgress(dailyKey) ?? {}), ...changes })
  }

  function initInfiniteRound(criterionKey = null) {
    const key = pickCriterionKey(criterionKey)
    const pool = buildCountryPool(RANKING_COUNTRIES, CRITERIA[key], AREA_MAP)
    const selected = pickN(pool, countryCount, Math.random.bind(Math))

    resetRound()
    setCriteriaKeys([key])
    setStartOrders([selected])
    setCountries(selected)
    setStatus('playing')
  }

  function reorderCountries(newOrder) {
    setCountries(newOrder)
    updateDailyProgress({ playerOrder: newOrder.map(isoOf) })
  }

  function handleSubmit() {
    if (status !== 'playing' || !criterion || positionFeedback !== null) return

    const correct = computeCorrectOrder(countries, criterion, AREA_MAP)
    const error = computeTotalError(countries, correct)
    const feedback = computePositionFeedback(countries, correct)
    const newBestError = bestTotalError === null ? error : Math.min(bestTotalError, error)
    const playerOrder = countries.map(isoOf)

    setPositionFeedback(feedback)
    setBestTotalError(newBestError)

    if (error !== 0 && attemptNumber < MAX_ATTEMPTS) {
      updateDailyProgress({ playerOrder, attemptNumber, bestTotalError: newBestError, positionFeedback: feedback })
      return
    }

    const nextStages = [
      ...stages,
      {
        criterion: criterion.key,
        score: error === 0 ? getRankingAttemptScore(attemptNumber) : 0,
        totalError: error === 0 ? 0 : newBestError,
        attempts: attemptNumber,
        playerOrder,
      },
    ]
    const nextStatus = nextStages.length < criteriaKeys.length ? 'stage-done' : 'submitted'
    setStages(nextStages)
    setStatus(nextStatus)
    updateDailyProgress({
      stages: nextStages,
      playerOrder,
      status: nextStatus,
      attemptNumber,
      bestTotalError: newBestError,
      positionFeedback: feedback,
    })
  }

  // Daily: from a finished stage to the next criterion, same countries in another order.
  function nextStage() {
    if (status !== 'stage-done') return
    const start = startOrders[stages.length] ?? countries
    setCountries(start)
    setAttemptNumber(1)
    setPositionFeedback(null)
    setBestTotalError(null)
    setStatus('playing')
    updateDailyProgress({
      playerOrder: start.map(isoOf),
      status: 'playing',
      attemptNumber: 1,
      positionFeedback: null,
      bestTotalError: null,
    })
  }

  function startNextRound() {
    if (mode !== 'infinite') return
    resetRound()
    setStatus('choosing-category')
  }

  function retryAttempt() {
    setAttemptNumber((prev) => prev + 1)
    setPositionFeedback(null)
    updateDailyProgress({ attemptNumber: attemptNumber + 1, positionFeedback: null })
  }

  function startInfiniteRound(criterionKey) {
    if (mode !== 'infinite' || status !== 'choosing-category') return
    initInfiniteRound(criterionKey)
  }

  return {
    criterion,
    countries,
    reorderCountries,
    status,
    // Round totals (sum of the stages), once the round is over.
    score: status === 'submitted' ? totals.score : null,
    totalError: status === 'submitted' ? totals.totalError : null,
    attemptsUsed: totals.attempts,
    maxScore: criteriaKeys.length * getRankingAttemptScore(1),
    // The stage just finished ('stage-done', 'submitted').
    correctOrder: lastStage?.correctOrder ?? [],
    countryValues: lastStage?.values ?? new Map(),
    stageScore: lastStage?.score ?? null,
    stageResults,
    stageIndex,
    stageCount: criteriaKeys.length,
    nextStage,
    handleSubmit,
    startNextRound,
    startInfiniteRound,
    attemptNumber,
    maxAttempts: MAX_ATTEMPTS,
    positionFeedback,
    retryAttempt,
    dailyKey,
  }
}


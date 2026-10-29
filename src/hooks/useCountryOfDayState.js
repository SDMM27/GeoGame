// src/hooks/useCountryOfDayState.js
// The Country of the Day, shared by the website and the app (rules: utils/countryOfDay.js).
//
// Phases: 'loading' (waiting for the day, server time) → 'mode' (multiple choice or typed answers, locked for the day)
// → 'playing' (the 4 steps; the answer of the last one stays on screen until next()) → 'done' (the info sheet). 3 tries per step: a step found on a try gives its points, a step
// missed 3 times shows its answer and gives nothing; the game always goes on to the end.
// The game is kept in localStorage (`country-of-day:<day>`) after every answer: leaving and coming back resumes it at
// the same step with the same tries left, and once done the result stays.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildBorderGuess, findBorderGuessCountry } from './useBorderGuessState'
import useDailyKey from './useDailyKey'
import {
  COUNTRY_OF_DAY_MODES,
  COUNTRY_OF_DAY_STEPS,
  COUNTRY_OF_DAY_TRIES,
  countryOfDayScore,
  getCountryOfDay,
  getStepChoices,
} from '../utils/countryOfDay'
import { checkCapitalName } from '../utils/survival'
import { normalize } from '../utils/normalizeAnswer'

const STORAGE_PREFIX = 'country-of-day'
const LAST_STEP = COUNTRY_OF_DAY_STEPS.length - 1

function readProgress(dailyKey) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${dailyKey}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeProgress(dailyKey, progress) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${dailyKey}`, JSON.stringify(progress))
  } catch {
    // Storage unavailable: the game stays playable, without resume
  }
}

export const EMPTY_PROGRESS = {
  mode: null,
  index: 0,
  // The try each step was found on (0: not found, or not played yet)
  steps: COUNTRY_OF_DAY_STEPS.map(() => 0),
  // The wrong answers of each step: country names (ADMIN), typed capitals, or Border Guess guesses (typed borders)
  wrong: COUNTRY_OF_DAY_STEPS.map(() => []),
  // The step on screen is over (found or out of tries): its answer is shown until next()
  resolved: false,
  startedAt: null,
  elapsedTime: null,
  done: false,
}

/** Stored progress made safe to use (anything missing or broken falls back to a new game). Exported for the tests. */
export function resumeCountryOfDay(saved) {
  if (!saved || typeof saved !== 'object' || !COUNTRY_OF_DAY_MODES.includes(saved.mode)) return EMPTY_PROGRESS
  const steps = COUNTRY_OF_DAY_STEPS.map((_, i) => {
    const tries = Math.floor(Number(saved.steps?.[i]))
    return tries >= 1 && tries <= COUNTRY_OF_DAY_TRIES ? tries : 0
  })
  const wrong = COUNTRY_OF_DAY_STEPS.map((_, i) => (Array.isArray(saved.wrong?.[i]) ? saved.wrong[i].slice(0, COUNTRY_OF_DAY_TRIES) : []))
  const index = Math.max(0, Math.min(Math.floor(Number(saved.index)) || 0, LAST_STEP))
  return {
    mode: saved.mode,
    index,
    steps,
    wrong,
    resolved: Boolean(saved.resolved) || Boolean(saved.done),
    startedAt: Number.isFinite(saved.startedAt) ? saved.startedAt : null,
    elapsedTime: Number.isFinite(saved.elapsedTime) ? saved.elapsedTime : null,
    done: Boolean(saved.done),
  }
}

const wrongKey = (entry) => (typeof entry === 'string' ? normalize(entry) : entry?.value)

/**
 * The game after an answer to the step on screen. `answer`: { admin } (a country picked, clicked or typed) or
 * { text } (a typed capital). Returns { progress, outcome }, outcome being 'right', 'wrong', or 'ignored' (game over,
 * step already over, or the same wrong answer again: no try used). Exported for the tests.
 */
export function answerCountryOfDay(progress, country, answer, now = Date.now()) {
  if (!country || !progress.mode || progress.done || progress.resolved) return { progress, outcome: 'ignored' }
  const step = COUNTRY_OF_DAY_STEPS[progress.index]
  const admin = country.properties.ADMIN
  const typedCapital = step === 'capital' && answer.text != null
  const right = typedCapital ? checkCapitalName(country, answer.text) : answer.admin === admin

  let entry = null
  if (!right) {
    if (typedCapital) entry = answer.text.trim()
    else if (step === 'borders' && progress.mode === 'free') {
      const guessed = findBorderGuessCountry(answer.admin) ?? null
      entry = guessed ? buildBorderGuess(guessed, normalize(answer.admin), false, admin) : answer.admin
    } else entry = answer.admin
    if (!entry || progress.wrong[progress.index].some((previous) => wrongKey(previous) === wrongKey(entry))) {
      return { progress, outcome: 'ignored' }
    }
  }

  const wrong = progress.wrong.map((list, i) => (i === progress.index && entry ? [...list, entry] : list))
  const triesUsed = wrong[progress.index].length + (right ? 1 : 0)
  const steps = progress.steps.map((tries, i) => (i === progress.index && right ? triesUsed : tries))
  const resolved = right || triesUsed >= COUNTRY_OF_DAY_TRIES
  // The clock stops with the last answer; the game is done once its answer was seen (next())
  const last = resolved && progress.index === LAST_STEP
  return {
    progress: {
      ...progress,
      steps,
      wrong,
      resolved,
      elapsedTime: last ? Math.max(0, now - (progress.startedAt ?? now)) : progress.elapsedTime,
    },
    outcome: right ? 'right' : 'wrong',
  }
}

/** The game after next(): the following step, or done after the last one (nothing when the step on screen isn't over). */
export function nextCountryOfDayStep(progress) {
  if (!progress.resolved || progress.done) return progress
  if (progress.index === LAST_STEP) return { ...progress, done: true }
  return { ...progress, index: progress.index + 1, resolved: false }
}

const load = (dailyKey) => ({ dailyKey, progress: resumeCountryOfDay(readProgress(dailyKey)) })

export default function useCountryOfDayState() {
  const dailyKey = useDailyKey()
  const [loaded, setLoaded] = useState(() => (dailyKey ? load(dailyKey) : null))

  useEffect(() => {
    if (dailyKey && loaded?.dailyKey !== dailyKey) setLoaded(load(dailyKey))
  }, [dailyKey, loaded])

  const known = Boolean(dailyKey) && loaded?.dailyKey === dailyKey
  const progress = known ? loaded.progress : EMPTY_PROGRESS
  const country = useMemo(() => (known ? getCountryOfDay(dailyKey) : null), [known, dailyKey])

  const update = useCallback((next) => {
    setLoaded((current) => {
      if (!current || current.progress === next) return current
      writeProgress(current.dailyKey, next)
      return { ...current, progress: next }
    })
  }, [])

  /** Picks the mode for the day: once chosen it can't change. */
  const chooseMode = useCallback((mode) => {
    if (!known || progress.mode || !COUNTRY_OF_DAY_MODES.includes(mode)) return
    update({ ...EMPTY_PROGRESS, mode, startedAt: Date.now() })
  }, [known, progress.mode, update])

  /**
   * Answers the step on screen: a country's ADMIN name (a choice, a click on the map), or the typed text (the country
   * in typed borders, the capital in typed mode). Returns 'right', 'wrong', 'unknown' (typed text that names no
   * country: no try used) or 'ignored'.
   */
  const answer = useCallback((value) => {
    if (!known || typeof value !== 'string' || !value.trim()) return 'ignored'
    const step = COUNTRY_OF_DAY_STEPS[progress.index]
    let given
    if (step === 'capital' && progress.mode === 'free') given = { text: value }
    else if (step === 'borders' && progress.mode === 'free') {
      const guessed = findBorderGuessCountry(value)
      if (!guessed) return 'unknown'
      given = { admin: guessed.properties.ADMIN }
    } else given = { admin: value }
    const { progress: next, outcome } = answerCountryOfDay(progress, country, given)
    update(next)
    return outcome
  }, [known, progress, country, update])

  const next = useCallback(() => update(nextCountryOfDayStep(progress)), [progress, update])

  const step = COUNTRY_OF_DAY_STEPS[progress.index]
  const choices = useMemo(
    () => (known && progress.mode ? getStepChoices(country, step, progress.mode, dailyKey) : null),
    [known, country, step, progress.mode, dailyKey]
  )

  const phase = !known ? 'loading' : !progress.mode ? 'mode' : progress.done ? 'done' : 'playing'
  const wrong = progress.wrong[progress.index]

  return {
    dailyKey: known ? dailyKey : null,
    phase,
    country,
    mode: progress.mode,
    chooseMode,
    stepIndex: progress.index,
    step,
    choices,
    wrong,
    triesLeft: COUNTRY_OF_DAY_TRIES - wrong.length - (progress.steps[progress.index] ? 1 : 0),
    // The step on screen is over: found (steps[stepIndex] > 0) or missed, its answer is shown
    resolved: progress.resolved,
    found: progress.steps[progress.index] > 0,
    answer,
    next,
    steps: progress.steps,
    // For the history: the wrong answers, all the answers, and the 4 steps found
    errors: progress.wrong.reduce((sum, list) => sum + list.length, 0),
    attempts: progress.wrong.reduce((sum, list) => sum + list.length, 0) + progress.steps.filter(Boolean).length,
    solved: progress.steps.every(Boolean),
    score: progress.mode ? countryOfDayScore(progress.steps, progress.mode) : 0,
    elapsedTime: progress.elapsedTime,
  }
}

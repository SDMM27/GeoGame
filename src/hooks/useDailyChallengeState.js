// src/hooks/useDailyChallengeState.js
// The Daily Challenge, shared by the website and the app (see utils/dailyChallenge.js): the 12 rounds of the day, played
// with the Survival engine (useSurvivalState) with no lives, a timer per round and all-different countries.
//
// Phases: 'loading' (waiting for the day, server time) → 'ready' (rules screen, or "continue" after a refresh) →
// 'playing' (after start()) → 'done'. The run is kept in localStorage (`daily-challenge:<day>`), and it can't be replayed:
//  - a round that was on screen and not answered when the page was left or refreshed counts as failed on resume
//    (the run goes on at the next round), so that a refresh can't be used to see a round again;
//  - once done, the result is kept and reopening the page shows it.
// Nothing here needs the DOM besides the guarded localStorage, like useDailyQuizState.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CHALLENGE_ROUNDS,
  CHALLENGE_ROUND_TYPES,
  CHALLENGE_TIMER,
  challengeLevel,
  challengeRamp,
  challengeSeed,
} from '../utils/dailyChallenge'
import useDailyKey from './useDailyKey'
import useSurvivalState from './useSurvivalState'

const STORAGE_PREFIX = 'daily-challenge'
const SAVE_EVERY_MS = 5000
const NO_ROUNDS = []

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
    // Storage unavailable: the challenge stays playable, without resume
  }
}

const countCorrect = (results) => results.filter((result) => result === 'correct').length

// A round with no result at the end was not played: failed
const doneRecord = (results, elapsedTime) => ({
  done: true,
  results: results.map((result) => result ?? 'failed'),
  score: countCorrect(results),
  elapsedTime,
})

/**
 * What the player had done on a day, from what was stored: null (nothing), { done: true, results, score, elapsedTime }
 * or { index, results, score, elapsedMs } (the next round to play). A round that was on screen unanswered
 * (`pending`) counts as failed. Exported for the tests.
 */
export function resumeChallenge(saved, total = CHALLENGE_ROUNDS) {
  if (!saved || typeof saved !== 'object') return null
  const results = Array.from({ length: total }, (_, i) => (saved.results?.[i] === 'correct' || saved.results?.[i] === 'failed' ? saved.results[i] : null))
  const elapsed = Number.isFinite(saved.elapsedTime ?? saved.elapsedMs) ? Math.max(0, saved.elapsedTime ?? saved.elapsedMs) : 0
  if (saved.done) return doneRecord(results, elapsed)
  let index = Math.max(0, Math.min(Math.floor(Number(saved.index)) || 0, total))
  if (saved.pending && index < total) {
    results[index] = 'failed'
    index += 1
  }
  // Rounds before the one to play are answered, whatever was stored for them
  for (let i = 0; i < Math.min(index, total); i++) results[i] ??= 'failed'
  return index >= total ? doneRecord(results, elapsed) : { index, results, score: countCorrect(results), elapsedMs: elapsed }
}

const load = (dailyKey) => ({ dailyKey, data: resumeChallenge(readProgress(dailyKey)) })

export default function useDailyChallengeState() {
  const dailyKey = useDailyKey()
  const [loaded, setLoaded] = useState(() => (dailyKey ? load(dailyKey) : null))
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (dailyKey && loaded?.dailyKey !== dailyKey) {
      setLoaded(load(dailyKey))
      setRunning(false)
    }
  }, [dailyKey, loaded])

  const known = Boolean(dailyKey) && loaded?.dailyKey === dailyKey
  const saved = known ? loaded.data : null
  const finished = saved?.done ? saved : null

  // What a refresh did to the run (a round lost) or a run ended on a refresh is stored right away
  useEffect(() => {
    if (known && loaded.data) writeProgress(loaded.dailyKey, loaded.data)
  }, [known, loaded])

  const snapshot = useMemo(
    () => (saved && !saved.done
      ? { index: saved.index, errors: saved.results.filter((result) => result === 'failed').length, score: saved.score, results: saved.results, elapsedMs: saved.elapsedMs }
      : null),
    [saved]
  )

  const survival = useSurvivalState({
    modes: CHALLENGE_ROUND_TYPES,
    lives: CHALLENGE_ROUNDS,
    seed: challengeSeed(known ? dailyKey : ''),
    timer: CHALLENGE_TIMER,
    ramp: challengeRamp(known ? dailyKey : ''),
    maxRounds: CHALLENGE_ROUNDS,
    distinctCountries: true,
    paused: !(running && known && !finished),
    snapshot,
  })
  const { roundIndex, outcome, results, score, isOver, elapsedMs } = survival

  // Playing: keep the run, so that a refresh resumes it (the round on screen, unanswered, is `pending`)
  const latest = useRef(null)
  latest.current = { dailyKey, roundIndex, outcome, results, score, elapsedMs }
  const playing = running && known && !finished && !isOver
  useEffect(() => {
    if (!playing) return undefined
    const save = () => {
      const run = latest.current
      writeProgress(run.dailyKey, {
        index: run.outcome ? run.roundIndex + 1 : run.roundIndex,
        results: run.results,
        score: run.score,
        elapsedMs: run.elapsedMs,
        pending: !run.outcome,
      })
    }
    save()
    const id = setInterval(save, SAVE_EVERY_MS)
    return () => clearInterval(id)
  }, [playing, roundIndex, outcome, score])

  // The end of the run: kept for good (elapsedMs gets its final value one render after isOver)
  const [ended, setEnded] = useState(null)
  useEffect(() => {
    if (!(running && known && !finished && isOver)) return
    const record = doneRecord(results, elapsedMs)
    writeProgress(dailyKey, record)
    setEnded({ dailyKey, ...record })
  }, [running, known, finished, isOver, elapsedMs]) // eslint-disable-line react-hooks/exhaustive-deps

  const result = finished ?? (ended?.dailyKey === dailyKey ? ended : null)

  const start = useCallback(() => {
    if (known && !finished) setRunning(true)
  }, [known, finished])

  const phase = !known ? 'loading' : result ? 'done' : running ? 'playing' : 'ready'
  const shown = phase === 'playing'
  const doneResults = result?.results ?? null

  return {
    dailyKey: known ? dailyKey : null,
    phase,
    // Rules screen after a refresh in the middle of a run: "continue" rather than "start"
    resumed: phase === 'ready' && Boolean(saved && !saved.done && saved.index > 0),
    isComplete: phase === 'done',
    // Every round of the day (empty until the day is known)
    rounds: known ? survival.rounds : NO_ROUNDS,
    total: CHALLENGE_ROUNDS,
    // Difficulty of the day, 1 (Monday) to 7 (Sunday); null for the days before the weekly ramp
    level: known ? challengeLevel(dailyKey) : null,
    round: shown ? survival.round : null,
    roundIndex: shown ? roundIndex : (saved?.index ?? 0),
    // 'correct' | 'failed' | null for each round
    results: doneResults ?? (shown ? results : (saved?.results ?? Array(CHALLENGE_ROUNDS).fill(null))),
    score: result ? result.score : shown ? score : (saved?.score ?? 0),
    // Total time of the run (ms): the final one once done, else the time played so far
    elapsedTime: result ? result.elapsedTime : shown ? elapsedMs : (saved?.elapsedMs ?? 0),
    timeLeftMs: shown ? survival.timeLeftMs : null,
    outcome: shown ? outcome : null,
    timedOut: shown ? survival.timedOut : false,
    isPlaying: shown && survival.isPlaying,
    wrongPicks: survival.wrongPicks,
    start,
    clickCountry: survival.clickCountry,
    submitText: survival.submitText,
    giveUp: survival.giveUp,
    next: survival.next,
  }
}

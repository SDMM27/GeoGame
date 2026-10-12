// src/hooks/useSurvivalState.js
// One survival run, shared by the website and the app (see utils/survival.js).
// One try per round: a wrong answer, giving up or running out of time costs one life, shows the answer and moves on
// to the next round. The run ends when no life is left, or when every round is cleared.
//
// Solo and challenge rooms: each round has its own timer and the next one comes on its own. Live rooms
// (useSurvivalSync): `autoAdvance` false, the shared `deadline` and goTo() come from the room.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { normalize } from '../utils/normalizeAnswer'
import { GAME_TYPES } from '../utils/gameTypes'
import { saveSnapshot } from '../utils/multiplayerSnapshot'
import { buildBorderGuess, findBorderGuessCountry } from './useBorderGuessState'
import { buildSurvivalRounds, checkCapitalName, checkCountryName, livesLeft, normalizeSurvivalRamp, survivalModesKey } from '../utils/survival'

// How long the answer stays on screen before the next round (a quiz answer comes with a fact to read).
const NEXT_DELAY_MS = { correct: 900, failed: 2200 }
const QUIZ_DELAY_MS = { correct: 2500, failed: 4500 }

const freshRound = (at) => ({ guesses: [], wrongPicks: [], outcome: null, timedOut: false, roundStartedAt: at })

function reducer(state, action) {
  switch (action.type) {
    case 'right':
      if (state.outcome || state.over) return state
      return {
        ...state,
        score: state.score + 1,
        outcome: 'correct',
        guesses: action.guess ? [...state.guesses, action.guess] : state.guesses,
        wrongPicks: action.pick != null ? [...state.wrongPicks, action.pick] : state.wrongPicks,
      }
    case 'wrong':
    case 'give_up':
    case 'timeout': {
      if (state.outcome || state.over) return state
      const errors = state.errors + 1
      return {
        ...state,
        errors,
        over: errors >= state.lives,
        outcome: 'failed',
        timedOut: action.type === 'timeout',
        guesses: action.guess ? [...state.guesses, action.guess] : state.guesses,
        wrongPicks: action.pick != null ? [...state.wrongPicks, action.pick] : state.wrongPicks,
      }
    }
    // Live room: everyone else is out, this player wins
    case 'win':
      return state.over ? state : { ...state, over: true, won: true }
    // To round `index`: the next one once this one is over, or the room's round in a live room
    case 'goto': {
      if (state.over || action.index <= state.index) return state
      if (action.index >= state.total) return { ...state, over: true, won: true }
      return { ...state, ...freshRound(action.at), index: action.index }
    }
    default:
      return state
  }
}

/**
 * `modes`: the games of the rounds (GAME_TYPES values). `lives`: lives at the start. `seed`: the rounds.
 * `timer`: seconds per round (0: none). `ramp`: how fast the difficulty rises ({ Facile, Moyen, Difficile }, see
 * SURVIVAL_RAMPS). `snapshot` / `snapshotKey` (multiplayer): resume the run after a refresh,
 * and save it as it goes (with `extraSnapshot`). `autoAdvance` false, `deadline` (local ms) and `deadlineRound` (the
 * round that deadline is for): see useSurvivalSync.
 */
export default function useSurvivalState({
  modes,
  lives,
  seed,
  timer = 0,
  ramp = null,
  snapshot = null,
  snapshotKey = null,
  extraSnapshot = null,
  autoAdvance = true,
  deadline: sharedDeadline = null,
  deadlineRound = null,
}) {
  const modesKey = survivalModesKey(modes)
  const rampKey = JSON.stringify(normalizeSurvivalRamp(ramp))
  const rounds = useMemo(
    () => buildSurvivalRounds(modesKey.split('+'), seed, undefined, JSON.parse(rampKey)),
    [modesKey, seed, rampKey]
  )
  const [state, dispatch] = useReducer(reducer, null, () => {
    const index = Math.min(snapshot?.index ?? 0, Math.max(0, rounds.length - 1))
    const errors = snapshot?.errors ?? 0
    // A round already answered before the refresh stays answered: its life (or point) is already counted
    const outcome = snapshot?.index === index ? (snapshot.outcome ?? null) : null
    return {
      ...freshRound(Date.now()),
      outcome,
      lives,
      total: rounds.length,
      index,
      errors,
      score: snapshot?.score ?? 0,
      over: rounds.length === 0 || errors >= lives,
      won: false,
    }
  })

  // Clock: from the first render, frozen at the end of the run (it also refreshes the round's countdown)
  const startRef = useRef(Date.now() - (snapshot?.elapsedMs ?? 0))
  const [elapsedMs, setElapsedMs] = useState(snapshot?.elapsedMs ?? 0)
  const elapsedRef = useRef(elapsedMs)
  useEffect(() => {
    const tick = () => {
      elapsedRef.current = Date.now() - startRef.current
      setElapsedMs(elapsedRef.current)
    }
    if (state.over) {
      tick()
      return undefined
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [state.over])

  const round = rounds[state.index] ?? null
  const playing = Boolean(round) && !state.outcome && !state.over

  // One answer per round, even when two come before the next render (a double tap): the second one is ignored
  // and returns null, so no second "life lost" is shown
  const answeredRef = useRef(-1)
  const answer = useCallback((action) => {
    if (answeredRef.current === state.index) return false
    answeredRef.current = state.index
    dispatch(action)
    return true
  }, [state.index])

  // Time limit of the round: the room's (only for the round it belongs to: a run resumed after a refresh doesn't
  // time out on the deadline of a round already gone), or the timer from the round's start
  const roomDeadline = sharedDeadline != null && (deadlineRound == null || deadlineRound === state.index) ? sharedDeadline : null
  const deadline = sharedDeadline != null ? roomDeadline : (timer > 0 ? state.roundStartedAt + timer * 1000 : null)
  useEffect(() => {
    if (!playing || deadline == null) return undefined
    const id = setTimeout(() => answer({ type: 'timeout' }), Math.max(0, deadline - Date.now()))
    return () => clearTimeout(id)
  }, [playing, deadline, answer])

  // Show the answer, then move on
  const isQuiz = round?.type === GAME_TYPES.QUIZ
  useEffect(() => {
    if (!autoAdvance || !state.outcome || state.over) return undefined
    const delay = (isQuiz ? QUIZ_DELAY_MS : NEXT_DELAY_MS)[state.outcome]
    const id = setTimeout(() => dispatch({ type: 'goto', index: state.index + 1, at: Date.now() }), delay)
    return () => clearTimeout(id)
  }, [autoAdvance, state.outcome, state.over, state.index, isQuiz])

  // Multiplayer: keep the run in localStorage, so a refresh resumes it
  const extraRef = useRef(extraSnapshot)
  extraRef.current = extraSnapshot
  useEffect(() => {
    if (!snapshotKey || state.over) return undefined
    const save = () => saveSnapshot(snapshotKey, {
      ...extraRef.current,
      savedAt: Date.now(),
      index: state.outcome && autoAdvance ? state.index + 1 : state.index,
      // Live room: the round stays on screen until the room moves on, keep its answer
      outcome: autoAdvance ? null : state.outcome,
      errors: state.errors,
      score: state.score,
      elapsedMs: elapsedRef.current,
    })
    save()
    const id = setInterval(save, 5000)
    return () => clearInterval(id)
  }, [snapshotKey, autoAdvance, state.index, state.errors, state.score, state.outcome, state.over])

  // Placement: the country clicked on the map
  const clickCountry = useCallback((name) => {
    if (!playing || round.type !== GAME_TYPES.PLACEMENT) return null
    if (state.wrongPicks.includes(name)) return 'repeat'
    const right = name === round.country.properties.ADMIN
    if (!answer(right ? { type: 'right' } : { type: 'wrong', pick: name })) return null
    return right ? 'correct' : 'wrong'
  }, [playing, round, state.wrongPicks, answer])

  /**
   * A typed answer. Returns 'correct', 'wrong', 'unknown' (not a country: no life lost)
   * or null (nothing to answer).
   */
  const submitText = useCallback((input) => {
    if (!playing || !input.trim()) return null
    const target = round.country
    switch (round.type) {
      case GAME_TYPES.FLAGS:
      case GAME_TYPES.CAPITALS: {
        const right = round.type === GAME_TYPES.FLAGS ? checkCountryName(target, input) : checkCapitalName(target, input)
        if (!answer({ type: right ? 'right' : 'wrong' })) return null
        return right ? 'correct' : 'wrong'
      }
      case GAME_TYPES.BORDER_GUESS: {
        const guessed = findBorderGuessCountry(input)
        if (!guessed) return 'unknown'
        const answerName = target.properties.ADMIN
        const right = guessed.properties.ADMIN === answerName
        const guess = buildBorderGuess(guessed, normalize(input.trim()), right, answerName)
        if (!answer({ type: right ? 'right' : 'wrong', guess })) return null
        return right ? 'correct' : 'wrong'
      }
      default:
        return null
    }
  }, [playing, round, answer])

  // Quiz: the choice picked
  const chooseAnswer = useCallback((choiceId) => {
    if (!playing || round.type !== GAME_TYPES.QUIZ) return null
    const right = choiceId === round.question.correctId
    if (!answer({ type: right ? 'right' : 'wrong', pick: choiceId })) return null
    return right ? 'correct' : 'wrong'
  }, [playing, round, answer])

  const giveUp = useCallback(() => {
    if (playing) answer({ type: 'give_up' })
  }, [playing, answer])

  const next = useCallback(() => dispatch({ type: 'goto', index: state.index + 1, at: Date.now() }), [state.index])
  const goTo = useCallback((index) => dispatch({ type: 'goto', index, at: Date.now() }), [])
  const win = useCallback(() => dispatch({ type: 'win' }), [])

  return {
    round,
    roundIndex: state.index,
    totalRounds: state.total,
    maxLives: lives,
    lives: livesLeft(lives, state.errors),
    errors: state.errors,
    score: state.score,
    guesses: state.guesses,
    wrongPicks: state.wrongPicks,
    outcome: state.outcome,
    timedOut: state.timedOut,
    isPlaying: playing,
    isOver: state.over,
    isWon: state.won,
    elapsedMs,
    // Time left in the round (ms), or null without a time limit
    timeLeftMs: deadline == null ? null : Math.max(0, deadline - Date.now()),
    clickCountry,
    submitText,
    chooseAnswer,
    giveUp,
    next,
    goTo,
    win,
    // Every round of the run (a player out of lives keeps following the others' rounds in a live room)
    rounds,
  }
}

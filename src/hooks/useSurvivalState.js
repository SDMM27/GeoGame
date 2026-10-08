// src/hooks/useSurvivalState.js
// One survival run, shared by the website and the app (see utils/survival.js).
// A wrong answer costs a life and the round goes on (the quiz excepted: a question is answered once);
// giving up costs a life and moves on. The run ends when no life is left, or when every round is cleared.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { normalize } from '../utils/normalizeAnswer'
import { GAME_TYPES } from '../utils/gameTypes'
import { saveSnapshot } from '../utils/multiplayerSnapshot'
import { buildBorderGuess, findBorderGuessCountry } from './useBorderGuessState'
import { buildGuessRecord, findCountryClueCountry } from './useCountryClueState'
import { buildSurvivalRounds, checkCapitalName, checkCountryName, livesLeft, survivalModesKey } from '../utils/survival'

// How long the answer stays on screen before the next round (a quiz answer comes with a fact to read).
const NEXT_DELAY_MS = { correct: 900, failed: 2200 }
const QUIZ_DELAY_MS = { correct: 2500, failed: 4500 }

const freshRound = { guesses: [], wrongPicks: [], outcome: null }

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
    case 'give_up': {
      if (state.outcome || state.over) return state
      const errors = state.errors + 1
      const over = errors >= state.lives
      const endsRound = over || action.type === 'give_up' || action.endsRound
      return {
        ...state,
        errors,
        over,
        outcome: endsRound ? 'failed' : null,
        guesses: action.guess ? [...state.guesses, action.guess] : state.guesses,
        wrongPicks: action.pick != null ? [...state.wrongPicks, action.pick] : state.wrongPicks,
      }
    }
    case 'next': {
      if (!state.outcome || state.over) return state
      const index = state.index + 1
      if (index >= state.total) return { ...state, over: true, won: true }
      return { ...state, ...freshRound, index }
    }
    default:
      return state
  }
}

/**
 * `modes`: the games of the rounds (GAME_TYPES values). `lives`: lives at the start. `seed`: the rounds.
 * `snapshot` / `snapshotKey` (multiplayer): resume the run after a refresh, and save it as it goes.
 */
export default function useSurvivalState({ modes, lives, seed, snapshot = null, snapshotKey = null }) {
  const modesKey = survivalModesKey(modes)
  const rounds = useMemo(() => buildSurvivalRounds(modesKey.split('+'), seed), [modesKey, seed])
  const [state, dispatch] = useReducer(reducer, null, () => {
    const index = Math.min(snapshot?.index ?? 0, Math.max(0, rounds.length - 1))
    const errors = snapshot?.errors ?? 0
    return {
      ...freshRound,
      lives,
      total: rounds.length,
      index,
      errors,
      score: snapshot?.score ?? 0,
      over: rounds.length === 0 || errors >= lives,
      won: false,
    }
  })

  // Clock: from the first render, frozen at the end of the run
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

  // Show the answer, then move on
  const isQuiz = rounds[state.index]?.type === GAME_TYPES.QUIZ
  useEffect(() => {
    if (!state.outcome || state.over) return undefined
    const id = setTimeout(() => dispatch({ type: 'next' }), (isQuiz ? QUIZ_DELAY_MS : NEXT_DELAY_MS)[state.outcome])
    return () => clearTimeout(id)
  }, [state.outcome, state.over, state.index, isQuiz])

  // Multiplayer: keep the run in localStorage, so a refresh resumes it
  useEffect(() => {
    if (!snapshotKey || state.over) return undefined
    const save = () => saveSnapshot(snapshotKey, {
      savedAt: Date.now(),
      index: state.outcome ? state.index + 1 : state.index,
      errors: state.errors,
      score: state.score,
      elapsedMs: elapsedRef.current,
    })
    save()
    const id = setInterval(save, 5000)
    return () => clearInterval(id)
  }, [snapshotKey, state.index, state.errors, state.score, state.outcome, state.over])

  const round = rounds[state.index] ?? null
  const playing = Boolean(round) && !state.outcome && !state.over

  // Placement: the country clicked on the map
  const clickCountry = useCallback((name) => {
    if (!playing || round.type !== GAME_TYPES.PLACEMENT) return null
    if (state.wrongPicks.includes(name)) return 'repeat'
    if (name === round.country.properties.ADMIN) {
      dispatch({ type: 'right' })
      return 'correct'
    }
    dispatch({ type: 'wrong', pick: name })
    return 'wrong'
  }, [playing, round, state.wrongPicks])

  /**
   * A typed answer. Returns 'correct', 'wrong', 'unknown' (not a country: no life lost),
   * 'repeat' (already tried: no life lost) or null (nothing to answer).
   */
  const submitText = useCallback((input) => {
    if (!playing || !input.trim()) return null
    const target = round.country
    switch (round.type) {
      case GAME_TYPES.FLAGS:
      case GAME_TYPES.CAPITALS: {
        const right = round.type === GAME_TYPES.FLAGS ? checkCountryName(target, input) : checkCapitalName(target, input)
        dispatch({ type: right ? 'right' : 'wrong' })
        return right ? 'correct' : 'wrong'
      }
      case GAME_TYPES.BORDER_GUESS:
      case GAME_TYPES.COUNTRY_CLUE: {
        const isBorder = round.type === GAME_TYPES.BORDER_GUESS
        const guessed = isBorder ? findBorderGuessCountry(input) : findCountryClueCountry(input)
        if (!guessed) return 'unknown'
        const normalizedInput = normalize(input.trim())
        const guessedName = guessed.properties.ADMIN
        if (state.guesses.some((guess) => guess.value === guessedName)) return 'repeat'
        const answerName = target.properties.ADMIN
        const right = guessedName === answerName
        const guess = isBorder
          ? buildBorderGuess(guessed, normalizedInput, right, answerName)
          : buildGuessRecord({ value: guessedName, isoA2: guessed.properties.ISO_A2 ?? null, normalizedInput, isCorrect: right }, answerName)
        dispatch({ type: right ? 'right' : 'wrong', guess })
        return right ? 'correct' : 'wrong'
      }
      default:
        return null
    }
  }, [playing, round, state.guesses])

  // Quiz: the choice picked (one try per question)
  const chooseAnswer = useCallback((choiceId) => {
    if (!playing || round.type !== GAME_TYPES.QUIZ) return null
    const right = choiceId === round.question.correctId
    dispatch({ type: right ? 'right' : 'wrong', pick: choiceId, endsRound: true })
    return right ? 'correct' : 'wrong'
  }, [playing, round])

  const giveUp = useCallback(() => {
    if (playing) dispatch({ type: 'give_up' })
  }, [playing])

  const next = useCallback(() => dispatch({ type: 'next' }), [])

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
    isPlaying: playing,
    isOver: state.over,
    isWon: state.won,
    elapsedMs,
    clickCountry,
    submitText,
    chooseAnswer,
    giveUp,
    next,
  }
}

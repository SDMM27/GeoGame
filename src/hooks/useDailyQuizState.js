// src/hooks/useDailyQuizState.js
// Question du jour : réponse libre uniquement, quelques essais et jusqu'à MAX_HINTS indices.
import { useCallback, useEffect, useState } from 'react'
import { checkFreeAnswer, getDailyQuestion, MAX_HINTS } from '../utils/quizQuestions'
import { normalize } from '../utils/normalizeAnswer'
import useDailyKey from './useDailyKey'

const DAILY_STORAGE_PREFIX = 'quiz-daily'
export const DAILY_MAX_ATTEMPTS = 5

function readProgress(dateKey) {
  try {
    const raw = window.localStorage.getItem(`${DAILY_STORAGE_PREFIX}:${dateKey}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeProgress(dateKey, progress) {
  try {
    window.localStorage.setItem(`${DAILY_STORAGE_PREFIX}:${dateKey}`, JSON.stringify(progress))
  } catch {
    // Stockage indisponible : la partie reste jouable, sans reprise
  }
}

// En attendant l'heure serveur : pas encore de question
const LOADING_STATE = {
  dailyKey: null,
  question: null,
  guesses: [],
  hintsUsed: 0,
  status: 'playing',
  startedAt: null,
  elapsedTime: null,
}

function initialState(dailyKey) {
  const saved = readProgress(dailyKey)
  return {
    dailyKey,
    // La question sauvegardée prime : elle ne doit pas changer si les données évoluent en cours de journée
    question: saved?.question ?? getDailyQuestion(dailyKey),
    guesses: saved?.guesses ?? [],
    hintsUsed: saved?.hintsUsed ?? 0,
    status: saved?.status ?? 'playing',
    startedAt: saved?.startedAt ?? null,
    elapsedTime: saved?.elapsedTime ?? null,
  }
}

export default function useDailyQuizState() {
  const todayKey = useDailyKey()
  const [state, setState] = useState(() => (todayKey ? initialState(todayKey) : LOADING_STATE))
  const { dailyKey, question, guesses, hintsUsed, status, startedAt } = state
  const hasStarted = startedAt != null
  const isComplete = status !== 'playing'

  useEffect(() => {
    if (todayKey && todayKey !== dailyKey) setState(initialState(todayKey))
  }, [todayKey, dailyKey])

  useEffect(() => {
    if (dailyKey) writeProgress(dailyKey, state)
  }, [dailyKey, state])

  const start = useCallback(() => {
    setState((prev) => (prev.startedAt != null || !prev.question ? prev : { ...prev, startedAt: Date.now() }))
  }, [])

  // Renvoie 'duplicate' si la réponse a déjà été proposée, sinon le résultat de la vérification
  const submit = useCallback((input) => {
    const value = input.trim()
    if (!value || !hasStarted || isComplete) return null
    if (guesses.some((g) => normalize(g.input) === normalize(value))) return 'duplicate'

    const match = checkFreeAnswer(question, value)
    setState((prev) => {
      const nextGuesses = [...prev.guesses, { input: value, correct: Boolean(match), typo: match?.match === 'typo' ? match.name : null }]
      const done = Boolean(match) || nextGuesses.length >= DAILY_MAX_ATTEMPTS
      return {
        ...prev,
        guesses: nextGuesses,
        status: match ? 'won' : done ? 'lost' : 'playing',
        elapsedTime: done ? Date.now() - prev.startedAt : prev.elapsedTime,
      }
    })
    return match ? 'correct' : 'wrong'
  }, [question, guesses, hasStarted, isComplete])

  const takeHint = useCallback(() => {
    setState((prev) => (
      prev.status !== 'playing' || prev.startedAt == null || prev.hintsUsed >= MAX_HINTS
        ? prev
        : { ...prev, hintsUsed: prev.hintsUsed + 1 }
    ))
  }, [])

  const giveUp = useCallback(() => {
    setState((prev) => (
      prev.status !== 'playing' || !prev.question ? prev : { ...prev, status: 'lost', elapsedTime: Date.now() - (prev.startedAt ?? Date.now()) }
    ))
  }, [])

  return {
    ...state,
    hasStarted,
    isComplete,
    isSolved: status === 'won',
    attemptsLeft: DAILY_MAX_ATTEMPTS - guesses.length,
    canUseHint: hasStarted && !isComplete && hintsUsed < MAX_HINTS,
    start,
    submit,
    takeHint,
    giveUp,
  }
}

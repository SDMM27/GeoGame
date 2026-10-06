// src/hooks/useQuizState.js
import { useCallback, useRef, useState } from 'react'
import { ANSWER_MODES, checkFreeAnswer, generateQuestion, QUIZ_POINTS } from '../utils/quizQuestions'

const EMPTY_STATS = { answered: 0, correct: 0, score: 0, streak: 0, bestStreak: 0 }

export default function useQuizState() {
  const [maxDifficulty, setMaxDifficulty] = useState(null)
  const [answerMode, setAnswerMode] = useState(ANSWER_MODES.CHOICES)
  const [question, setQuestion] = useState(null)
  // Choix multiples : id du choix cliqué. Réponse libre : { input, match }
  const [selectedId, setSelectedId] = useState(null)
  const [freeResult, setFreeResult] = useState(null)
  const [stats, setStats] = useState(EMPTY_STATS)
  const [isFinished, setIsFinished] = useState(false)
  const usedKeysRef = useRef(new Set())

  const drawQuestion = useCallback((difficulty, mode) => {
    const next = generateQuestion(difficulty, usedKeysRef.current, Math.random, mode)
    next?.usedKeys.forEach((k) => usedKeysRef.current.add(k))
    setQuestion(next)
    setSelectedId(null)
    setFreeResult(null)
  }, [])

  const start = useCallback((difficulty, mode = answerMode) => {
    usedKeysRef.current = new Set()
    setMaxDifficulty(difficulty)
    setAnswerMode(mode)
    setStats(EMPTY_STATS)
    setIsFinished(false)
    drawQuestion(difficulty, mode)
  }, [answerMode, drawQuestion])

  const isAnswered = Boolean(selectedId || freeResult)
  const isCorrect = answerMode === ANSWER_MODES.FREE
    ? Boolean(freeResult?.match)
    : Boolean(selectedId) && selectedId === question?.correctId

  const recordAnswer = useCallback((correct) => {
    setStats((prev) => {
      const streak = correct ? prev.streak + 1 : 0
      return {
        answered: prev.answered + 1,
        correct: prev.correct + (correct ? 1 : 0),
        score: prev.score + (correct ? QUIZ_POINTS[question.difficulty] ?? 1 : 0),
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
      }
    })
  }, [question])

  const answer = useCallback((choiceId) => {
    if (!question || isAnswered) return
    setSelectedId(choiceId)
    recordAnswer(choiceId === question.correctId)
  }, [question, isAnswered, recordAnswer])

  // input vide = « je ne sais pas »
  const submitFree = useCallback((input) => {
    if (!question || isAnswered) return
    const match = input.trim() ? checkFreeAnswer(question, input) : null
    setFreeResult({ input, match })
    recordAnswer(Boolean(match))
  }, [question, isAnswered, recordAnswer])

  const next = useCallback(() => {
    if (!isAnswered) return
    drawQuestion(maxDifficulty, answerMode)
  }, [isAnswered, maxDifficulty, answerMode, drawQuestion])

  const quit = useCallback(() => setIsFinished(true), [])

  const backToDifficulty = useCallback(() => {
    setMaxDifficulty(null)
    setQuestion(null)
    setIsFinished(false)
  }, [])

  return {
    maxDifficulty,
    answerMode,
    question,
    selectedId,
    freeResult,
    isAnswered,
    isCorrect,
    stats,
    isFinished,
    start,
    answer,
    submitFree,
    next,
    quit,
    backToDifficulty,
  }
}

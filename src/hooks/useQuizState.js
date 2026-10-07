// src/hooks/useQuizState.js
import { useCallback, useRef, useState } from 'react'
import { ANSWER_MODES, CHOICE_HINTS, checkFreeAnswer, generateQuestion, getQuizPoints, MAX_HINTS } from '../utils/quizQuestions'
import { mulberry32 } from '../utils/prng'

const EMPTY_STATS = { answered: 0, correct: 0, score: 0, streak: 0, bestStreak: 0, hints: 0 }

function shuffled(items) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * `seed` (multijoueur) : tous les joueurs tirent la même suite de questions.
 */
export default function useQuizState({ seed = null } = {}) {
  const [maxDifficulty, setMaxDifficulty] = useState(null)
  const [answerMode, setAnswerMode] = useState(ANSWER_MODES.CHOICES)
  const [question, setQuestion] = useState(null)
  // Choix multiples : id du choix cliqué. Réponse libre : { input, match }
  const [selectedId, setSelectedId] = useState(null)
  const [freeResult, setFreeResult] = useState(null)
  const [stats, setStats] = useState(EMPTY_STATS)
  const [hintsUsed, setHintsUsed] = useState(0)
  // Choix multiples : mauvaises réponses dans l'ordre où les indices les retirent
  const [eliminationOrder, setEliminationOrder] = useState([])
  const [isFinished, setIsFinished] = useState(false)
  const usedKeysRef = useRef(new Set())
  const randomRef = useRef(Math.random)

  const drawQuestion = useCallback((difficulty, mode) => {
    const next = generateQuestion(difficulty, usedKeysRef.current, randomRef.current, mode)
    next?.usedKeys.forEach((k) => usedKeysRef.current.add(k))
    setQuestion(next)
    setSelectedId(null)
    setFreeResult(null)
    setHintsUsed(0)
    setEliminationOrder(next ? shuffled(next.choices.filter((c) => c.id !== next.correctId).map((c) => c.id)) : [])
  }, [])

  const start = useCallback((difficulty, mode = answerMode) => {
    usedKeysRef.current = new Set()
    randomRef.current = seed == null ? Math.random : mulberry32(seed)
    setMaxDifficulty(difficulty)
    setAnswerMode(mode)
    setStats(EMPTY_STATS)
    setIsFinished(false)
    drawQuestion(difficulty, mode)
  }, [answerMode, drawQuestion, seed])

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
        score: prev.score + (correct ? getQuizPoints(question.difficulty, hintsUsed) : 0),
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        hints: prev.hints + hintsUsed,
      }
    })
  }, [question, hintsUsed])

  const maxHints = answerMode === ANSWER_MODES.FREE
    ? MAX_HINTS
    : Math.min(CHOICE_HINTS, eliminationOrder.length)
  const canUseHint = Boolean(question) && !isAnswered && hintsUsed < maxHints
  const hiddenChoiceIds = answerMode === ANSWER_MODES.FREE ? [] : eliminationOrder.slice(0, hintsUsed)

  const takeHint = useCallback(() => {
    if (canUseHint) setHintsUsed((n) => n + 1)
  }, [canUseHint])

  const answer = useCallback((choiceId) => {
    if (!question || isAnswered || hiddenChoiceIds.includes(choiceId)) return
    setSelectedId(choiceId)
    recordAnswer(choiceId === question.correctId)
  }, [question, isAnswered, hiddenChoiceIds, recordAnswer])

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
    hintsUsed,
    maxHints,
    canUseHint,
    hiddenChoiceIds,
    points: question ? getQuizPoints(question.difficulty, hintsUsed) : 0,
    start,
    takeHint,
    answer,
    submitFree,
    next,
    quit,
    backToDifficulty,
  }
}

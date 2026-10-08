import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useQuizState from './useQuizState'
import { ANSWER_MODES, CHOICE_HINTS, MAX_HINTS, generateQuestion } from '../utils/quizQuestions'
import { makeQuestion } from './testUtils/quizFixture'

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
// Le tirage est remplacé par des questions connues ; la vérification des réponses reste la vraie.
// L'identifiant de chaque question vient du générateur aléatoire reçu, pour vérifier la graine.
vi.mock('../utils/quizQuestions', async (importOriginal) => ({
  ...(await importOriginal()),
  generateQuestion: vi.fn((difficulty, usedKeys, random) => makeQuestion(Math.floor(random() * 1e9), { difficulty })),
}))

beforeEach(() => {
  generateQuestion.mockClear()
})

function startQuiz(difficulty = 'Moyen', mode = ANSWER_MODES.CHOICES, options) {
  const hook = renderHook(() => useQuizState(options))
  act(() => hook.result.current.start(difficulty, mode))
  return hook
}

describe('useQuizState — choix multiples', () => {
  it('draws a first question of the chosen difficulty', () => {
    const { result } = startQuiz('Difficile')
    expect(result.current.maxDifficulty).toBe('Difficile')
    expect(result.current.question.difficulty).toBe('Difficile')
    expect(result.current.isAnswered).toBe(false)
    expect(result.current.points).toBe(3)
    expect(generateQuestion).toHaveBeenCalledWith('Difficile', expect.any(Set), expect.any(Function), ANSWER_MODES.CHOICES)
  })

  it('scores a right answer and builds a streak', () => {
    const { result } = startQuiz()
    act(() => result.current.answer('answer'))
    expect(result.current.isAnswered).toBe(true)
    expect(result.current.isCorrect).toBe(true)
    expect(result.current.stats).toEqual({ answered: 1, correct: 1, score: 2, streak: 1, bestStreak: 1, hints: 0 })

    // Une seule réponse par question
    act(() => result.current.answer('wrong0'))
    expect(result.current.stats.answered).toBe(1)

    act(() => result.current.next())
    act(() => result.current.answer('answer'))
    expect(result.current.stats).toMatchObject({ correct: 2, score: 4, streak: 2, bestStreak: 2 })
  })

  it('breaks the streak on a wrong answer but keeps the best one', () => {
    const { result } = startQuiz()
    act(() => result.current.answer('answer'))
    act(() => result.current.next())
    act(() => result.current.answer('wrong1'))
    expect(result.current.isCorrect).toBe(false)
    expect(result.current.stats).toMatchObject({ answered: 2, correct: 1, score: 2, streak: 0, bestStreak: 1 })
  })

  it('hides wrong choices with hints, at most CHOICE_HINTS, and lowers the points', () => {
    const { result } = startQuiz('Impossible')
    expect(result.current.maxHints).toBe(CHOICE_HINTS)
    for (let i = 0; i < CHOICE_HINTS + 1; i++) act(() => result.current.takeHint())

    expect(result.current.hintsUsed).toBe(CHOICE_HINTS)
    expect(result.current.canUseHint).toBe(false)
    expect(result.current.hiddenChoiceIds).toHaveLength(CHOICE_HINTS)
    expect(result.current.hiddenChoiceIds).not.toContain('answer')
    expect(result.current.points).toBe(2) // ceil(5 / 3)

    // Un choix retiré ne peut plus être cliqué
    act(() => result.current.answer(result.current.hiddenChoiceIds[0]))
    expect(result.current.isAnswered).toBe(false)

    act(() => result.current.answer('answer'))
    expect(result.current.stats).toMatchObject({ score: 2, hints: CHOICE_HINTS })
  })

  it('only moves on once the question is answered, and never repeats a question', () => {
    const { result } = startQuiz()
    const first = result.current.question
    act(() => result.current.next())
    expect(result.current.question).toBe(first)

    act(() => result.current.takeHint())
    act(() => result.current.answer('answer'))
    act(() => result.current.next())
    expect(result.current.question).not.toBe(first)
    expect(result.current.hintsUsed).toBe(0)
    expect(result.current.isAnswered).toBe(false)
    // Les questions déjà posées sont transmises au tirage suivant
    expect(generateQuestion.mock.calls[1][1].has(first.key)).toBe(true)
  })
})

describe('useQuizState — réponse libre', () => {
  it('accepts the answer whatever the case and accents', () => {
    const { result } = startQuiz('Moyen', ANSWER_MODES.FREE)
    expect(result.current.answerMode).toBe(ANSWER_MODES.FREE)
    expect(result.current.maxHints).toBe(MAX_HINTS)
    expect(result.current.hiddenChoiceIds).toEqual([])
    act(() => result.current.submitFree('  PARIS '))
    expect(result.current.isCorrect).toBe(true)
    expect(result.current.freeResult.match).toBeTruthy()
    expect(result.current.stats.score).toBe(2)
  })

  it('counts a wrong or empty answer (« je ne sais pas ») as wrong', () => {
    const { result } = startQuiz('Moyen', ANSWER_MODES.FREE)
    act(() => result.current.submitFree('Lyon'))
    expect(result.current.isCorrect).toBe(false)
    act(() => result.current.next())
    act(() => result.current.submitFree(''))
    expect(result.current.freeResult).toEqual({ input: '', match: null })
    expect(result.current.stats).toMatchObject({ answered: 2, correct: 0, score: 0 })
  })

  it('allows up to MAX_HINTS hints', () => {
    const { result } = startQuiz('Moyen', ANSWER_MODES.FREE)
    for (let i = 0; i < MAX_HINTS + 1; i++) act(() => result.current.takeHint())
    expect(result.current.hintsUsed).toBe(MAX_HINTS)
    expect(result.current.points).toBe(1)
  })
})

describe('useQuizState — partie', () => {
  it('draws the same questions for every player sharing a seed (multiplayer)', () => {
    const keys = () => {
      const { result } = startQuiz('Moyen', ANSWER_MODES.CHOICES, { seed: 42 })
      const drawn = [result.current.question.key]
      act(() => result.current.answer('answer'))
      act(() => result.current.next())
      drawn.push(result.current.question.key)
      return drawn
    }
    expect(keys()).toEqual(keys())
  })

  it('starts over with fresh stats and goes back to the difficulty choice', () => {
    const { result } = startQuiz()
    act(() => result.current.answer('answer'))
    act(() => result.current.quit())
    expect(result.current.isFinished).toBe(true)

    act(() => result.current.start('Facile'))
    expect(result.current.isFinished).toBe(false)
    expect(result.current.stats.answered).toBe(0)
    // Nouvelle partie : seules les questions de cette partie sont écartées
    expect([...generateQuestion.mock.lastCall[1]]).toEqual([result.current.question.key])

    act(() => result.current.backToDifficulty())
    expect(result.current.maxDifficulty).toBeNull()
    expect(result.current.question).toBeNull()
  })
})

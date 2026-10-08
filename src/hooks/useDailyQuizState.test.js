import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useDailyQuizState, { DAILY_MAX_ATTEMPTS } from './useDailyQuizState'
import { MAX_HINTS, getDailyQuestion } from '../utils/quizQuestions'
import { makeQuestion } from './testUtils/quizFixture'

const mocks = vi.hoisted(() => ({ dailyKey: '2026-10-08' }))

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
vi.mock('../utils/quizQuestions', async (importOriginal) => ({
  ...(await importOriginal()),
  getDailyQuestion: vi.fn((dateKey) => makeQuestion(dateKey, { answer: 'Mont Blanc', wrong: [] })),
}))
vi.mock('./useDailyKey', () => ({ default: () => mocks.dailyKey }))

const STORAGE_KEY = 'quiz-daily:2026-10-08'

beforeEach(() => {
  localStorage.clear()
  getDailyQuestion.mockClear()
  mocks.dailyKey = '2026-10-08'
})

function startedQuiz() {
  const hook = renderHook(() => useDailyQuizState())
  act(() => hook.result.current.start())
  return hook
}

function submit(result, input) {
  let outcome
  act(() => {
    outcome = result.current.submit(input)
  })
  return outcome
}

describe('useDailyQuizState', () => {
  it('asks the question of the day', () => {
    const { result } = renderHook(() => useDailyQuizState())
    expect(result.current.dailyKey).toBe('2026-10-08')
    expect(getDailyQuestion).toHaveBeenCalledWith('2026-10-08')
    expect(result.current.question.key).toBe('curated:2026-10-08')
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.attemptsLeft).toBe(DAILY_MAX_ATTEMPTS)
  })

  it('waits for the day (server time) before asking anything', () => {
    mocks.dailyKey = null
    const { result, rerender } = renderHook(() => useDailyQuizState())
    expect(result.current.question).toBeNull()
    act(() => result.current.start())
    act(() => result.current.giveUp())
    expect(result.current.hasStarted).toBe(false)
    expect(result.current.isComplete).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('quiz-daily:null')).toBeNull()

    mocks.dailyKey = '2026-10-08'
    rerender()
    expect(result.current.question.key).toBe('curated:2026-10-08')
    expect(result.current.status).toBe('playing')
  })

  it('ignores answers before the timer is started', () => {
    const { result } = renderHook(() => useDailyQuizState())
    expect(submit(result, 'Mont Blanc')).toBeNull()
    expect(result.current.guesses).toEqual([])
  })

  it('wins with the right answer, even in a short form', () => {
    const { result } = startedQuiz()
    expect(submit(result, 'blanc')).toBe('correct')
    expect(result.current.isSolved).toBe(true)
    expect(result.current.isComplete).toBe(true)
    expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0)
    expect(submit(result, 'Mont Blanc')).toBeNull()
  })

  it('counts wrong answers, refuses duplicates and ends after the last attempt', () => {
    const { result } = startedQuiz()
    expect(submit(result, 'Everest')).toBe('wrong')
    expect(submit(result, 'everest ')).toBe('duplicate')
    expect(submit(result, '   ')).toBeNull()
    expect(result.current.attemptsLeft).toBe(DAILY_MAX_ATTEMPTS - 1)

    for (const input of ['Kilimandjaro', 'Aconcagua', 'Denali', 'Elbrouz']) submit(result, input)
    expect(result.current.status).toBe('lost')
    expect(result.current.attemptsLeft).toBe(0)
    expect(result.current.guesses.every((g) => !g.correct)).toBe(true)
  })

  it('gives up to MAX_HINTS hints, only during the game', () => {
    const { result } = renderHook(() => useDailyQuizState())
    act(() => result.current.takeHint())
    expect(result.current.hintsUsed).toBe(0)

    act(() => result.current.start())
    for (let i = 0; i < MAX_HINTS + 1; i++) act(() => result.current.takeHint())
    expect(result.current.hintsUsed).toBe(MAX_HINTS)
    expect(result.current.canUseHint).toBe(false)
  })

  it('ends the game on give-up', () => {
    const { result } = startedQuiz()
    act(() => result.current.giveUp())
    expect(result.current.status).toBe('lost')
    expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0)
  })

  it('saves the progress of the day and restores it, question included', () => {
    const first = startedQuiz()
    submit(first.result, 'Everest')
    first.unmount()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved).toMatchObject({ dailyKey: '2026-10-08', status: 'playing', guesses: [{ input: 'Everest', correct: false }] })

    // La question sauvegardée prime, même si le tirage du jour a changé entre-temps
    getDailyQuestion.mockReturnValueOnce(makeQuestion('other', { answer: 'Everest' }))
    const second = renderHook(() => useDailyQuizState())
    expect(second.result.current.question.key).toBe('curated:2026-10-08')
    expect(second.result.current.hasStarted).toBe(true)
    expect(second.result.current.attemptsLeft).toBe(DAILY_MAX_ATTEMPTS - 1)
  })
})

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchDailyAnswers = vi.fn()
const hasPlayedDaily = vi.fn()
vi.mock('../utils/dailyAnswers', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchDailyAnswers: (...args) => fetchDailyAnswers(...args),
  hasPlayedDaily: (...args) => hasPlayedDaily(...args),
}))
vi.mock('firebase/firestore', () => ({}))
vi.mock('../Firebase', () => ({ firestore: {} }))

const { useDailyAnswers } = await import('./useDailyAnswers')

const TODAY = '2026-11-18'
const options = (overrides = {}) => ({ gameType: 'BORDER_GUESS', day: TODAY, todayKey: TODAY, uid: 'alice', refreshKey: 0, ...overrides })

describe('useDailyAnswers', () => {
  beforeEach(() => {
    fetchDailyAnswers.mockReset()
    hasPlayedDaily.mockReset()
  })

  it("locks today without an account and asks nothing", () => {
    const { result } = renderHook(() => useDailyAnswers(options({ uid: undefined })))
    expect(result.current).toEqual({ locked: true, answers: null, signedIn: false })
    expect(fetchDailyAnswers).not.toHaveBeenCalled()
  })

  it("stays locked until the answers load, then unlocks for a player who played", async () => {
    const answers = new Map([['s1', { guesses: ['A'] }]])
    fetchDailyAnswers.mockResolvedValue(answers)
    const { result } = renderHook(() => useDailyAnswers(options()))
    expect(result.current.locked).toBe(true)
    await waitFor(() => expect(result.current.locked).toBe(false))
    expect(result.current.answers).toBe(answers)
  })

  it('stays locked when Firestore refuses the answers', async () => {
    fetchDailyAnswers.mockResolvedValue(null)
    const { result } = renderHook(() => useDailyAnswers(options()))
    await waitFor(() => expect(fetchDailyAnswers).toHaveBeenCalled())
    expect(result.current.locked).toBe(true)
  })

  it('opens a past day without waiting for the answers', async () => {
    fetchDailyAnswers.mockResolvedValue(new Map())
    const { result } = renderHook(() => useDailyAnswers(options({ day: '2026-11-17', uid: undefined })))
    expect(result.current.locked).toBe(false)
    await waitFor(() => expect(fetchDailyAnswers).toHaveBeenCalledWith('BORDER_GUESS', '2026-11-17'))
  })

  it("unlocks today's Daily Challenge from the player's own score", async () => {
    hasPlayedDaily.mockResolvedValue(true)
    const { result } = renderHook(() => useDailyAnswers(options({ gameType: 'DAILY_CHALLENGE' })))
    expect(result.current.locked).toBe(true)
    await waitFor(() => expect(result.current.locked).toBe(false))
    expect(fetchDailyAnswers).not.toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDocs } from 'firebase/firestore'
import { getLeaderboardDocs } from './leaderboardQuery'

vi.mock('firebase/firestore', () => ({ getDocs: vi.fn() }))

describe('getLeaderboardDocs', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the snapshot when the query answers in time', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] })
    await expect(getLeaderboardDocs('q', 1000)).resolves.toEqual({ docs: [] })
  })

  it('fails like a network error when the query never answers', async () => {
    getDocs.mockReturnValueOnce(new Promise(() => {}))
    const result = getLeaderboardDocs('q', 1000)
    vi.advanceTimersByTime(1000)
    await expect(result).rejects.toMatchObject({ code: 'deadline-exceeded' })
  })

  it('keeps the error of a failed query', async () => {
    getDocs.mockRejectedValueOnce(Object.assign(new Error('index'), { code: 'failed-precondition' }))
    await expect(getLeaderboardDocs('q', 1000)).rejects.toMatchObject({ code: 'failed-precondition' })
  })
})

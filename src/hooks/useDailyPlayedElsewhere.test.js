import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchDailyGame = vi.fn()
// A plain function stands in for a failed lookup: vi.fn's own tracking of a rejected promise goes unhandled.
let failLookup = false
vi.mock('../utils/gameHistory', () => ({
  fetchDailyGame: (...args) => (failLookup ? Promise.reject(new Error('offline')) : fetchDailyGame(...args)),
}))

const { useDailyPlayedElsewhere } = await import('./useDailyPlayedElsewhere')

const signedIn = { loading: false, account: { uid: 'alice', username: 'Alice' } }
const options = (overrides = {}) => ({ gameType: 'BORDER_GUESS', dailyKey: '2026-10-10', started: false, ...overrides })

describe('useDailyPlayedElsewhere', () => {
  beforeEach(() => {
    fetchDailyGame.mockReset()
    failLookup = false
  })

  it('finds the daily already played with the account', async () => {
    fetchDailyGame.mockResolvedValue({ gameType: 'BORDER_GUESS', solved: true, attempts: 3 })
    const { result } = renderHook(() => useDailyPlayedElsewhere(signedIn, options()))
    expect(result.current).toEqual({ checking: true, game: null })
    await waitFor(() => expect(result.current.game).toEqual({ gameType: 'BORDER_GUESS', solved: true, attempts: 3 }))
    expect(result.current.checking).toBe(false)
    expect(fetchDailyGame).toHaveBeenCalledWith('alice', 'BORDER_GUESS', '2026-10-10')
  })

  it('lets the player play a daily not played yet, or when the lookup fails', async () => {
    fetchDailyGame.mockResolvedValue(null)
    const notPlayed = renderHook(() => useDailyPlayedElsewhere(signedIn, options()))
    await waitFor(() => expect(notPlayed.result.current).toEqual({ checking: false, game: null }))

    failLookup = true
    const failed = renderHook(() => useDailyPlayedElsewhere(signedIn, options({ dailyKey: '2026-10-11' })))
    await waitFor(() => expect(failed.result.current).toEqual({ checking: false, game: null }))
  })

  it('waits for the account, then does nothing for a visitor', () => {
    const loading = renderHook(() => useDailyPlayedElsewhere({ loading: true, account: null }, options()))
    expect(loading.result.current).toEqual({ checking: true, game: null })
    const visitor = renderHook(() => useDailyPlayedElsewhere({ loading: false, account: null }, options()))
    expect(visitor.result.current).toEqual({ checking: false, game: null })
    expect(fetchDailyGame).not.toHaveBeenCalled()
  })

  it('leaves a daily started on this device, another mode or an unknown day alone', () => {
    for (const overrides of [{ started: true }, { enabled: false }, { dailyKey: null }]) {
      const { result } = renderHook(() => useDailyPlayedElsewhere(signedIn, options(overrides)))
      expect(result.current).toEqual({ checking: false, game: null })
    }
    expect(fetchDailyGame).not.toHaveBeenCalled()
  })
})

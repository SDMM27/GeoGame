import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useFriendsPresence, { MAX_FRIENDS_PRESENCE, PRESENCE_REFRESH_MS } from './useFriendsPresence'
import { subscribePresence } from '../utils/presence'

vi.mock('../utils/presence', async (importOriginal) => ({ ...(await importOriginal()), subscribePresence: vi.fn() }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), Timestamp: {} }))
vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('../utils/serverTime', () => ({ serverNow: () => Date.now() }))

const callbacks = {}
const unsubscribe = vi.fn()
const at = (ms) => ({ toMillis: () => ms })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  vi.clearAllMocks()
  for (const key of Object.keys(callbacks)) delete callbacks[key]
  subscribePresence.mockImplementation((uid, callback) => {
    callbacks[uid] = callback
    return unsubscribe
  })
})

describe('useFriendsPresence', () => {
  it('maps each friend to a status', () => {
    const { result } = renderHook(() => useFriendsPresence(['a', 'b', 'c']))
    act(() => {
      callbacks.a({ at: at(Date.now() - 1000), room: 'ABC234', game: 'FLAGS' })
      callbacks.b({ at: at(Date.now() - 1000), room: null, game: null })
      callbacks.c(null)
    })
    expect(result.current).toEqual({
      a: { status: 'playing', room: 'ABC234', game: 'FLAGS' },
      b: { status: 'online', room: null, game: null },
      c: { status: 'offline', room: null, game: null },
    })
  })

  it('turns a friend offline when the heartbeats stop, without a new snapshot', () => {
    const { result } = renderHook(() => useFriendsPresence(['a']))
    act(() => callbacks.a({ at: at(Date.now()), room: null, game: null }))
    expect(result.current.a.status).toBe('online')
    act(() => {
      vi.advanceTimersByTime(PRESENCE_REFRESH_MS * 7)
    })
    expect(result.current.a.status).toBe('offline')
  })

  it('listens to at most MAX_FRIENDS_PRESENCE friends and stops on unmount', () => {
    const uids = Array.from({ length: MAX_FRIENDS_PRESENCE + 10 }, (_, i) => `u${i}`)
    const { unmount } = renderHook(() => useFriendsPresence(uids))
    expect(subscribePresence).toHaveBeenCalledTimes(MAX_FRIENDS_PRESENCE)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(MAX_FRIENDS_PRESENCE)
  })
})

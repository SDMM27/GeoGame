import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import usePresenceHeartbeat, { PRESENCE_ROOM_DEBOUNCE_MS } from './usePresenceHeartbeat'
import { PRESENCE_HEARTBEAT_MS, resetPresenceRoom, setPresenceRoom, clearPresenceRoom, writePresence } from '../utils/presence'

vi.mock('../utils/presence', async (importOriginal) => ({ ...(await importOriginal()), writePresence: vi.fn(() => Promise.resolve()) }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn(), serverTimestamp: vi.fn(), setDoc: vi.fn(), Timestamp: {} }))
vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('../utils/serverTime', () => ({ serverNow: () => 0 }))

const account = { uid: 'u1', username: 'alice' }

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  resetPresenceRoom()
})
afterEach(() => vi.useRealTimers())

describe('usePresenceHeartbeat', () => {
  it('writes at start, then every heartbeat', () => {
    renderHook(() => usePresenceHeartbeat(account, true))
    expect(writePresence).toHaveBeenCalledTimes(1)
    expect(writePresence).toHaveBeenLastCalledWith('u1', { room: null, game: null })
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_MS)
    expect(writePresence).toHaveBeenCalledTimes(2)
  })

  it('writes nothing signed out, without a username, or while inactive', () => {
    renderHook(() => usePresenceHeartbeat(null, true))
    renderHook(() => usePresenceHeartbeat({ uid: 'u1', username: null }, true))
    renderHook(() => usePresenceHeartbeat(account, false))
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_MS * 2)
    expect(writePresence).not.toHaveBeenCalled()
  })

  it('writes the room soon after it changes, and null when it is cleared', () => {
    renderHook(() => usePresenceHeartbeat(account, true))
    setPresenceRoom('ABC234', 'FLAGS')
    expect(writePresence).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(PRESENCE_ROOM_DEBOUNCE_MS)
    expect(writePresence).toHaveBeenLastCalledWith('u1', { room: 'ABC234', game: 'FLAGS' })
    clearPresenceRoom('ABC234')
    vi.advanceTimersByTime(PRESENCE_ROOM_DEBOUNCE_MS)
    expect(writePresence).toHaveBeenLastCalledWith('u1', { room: null, game: null })
  })

  it('only warns when a write fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    writePresence.mockRejectedValueOnce(new Error('denied'))
    renderHook(() => usePresenceHeartbeat(account, true))
    await vi.advanceTimersByTimeAsync(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

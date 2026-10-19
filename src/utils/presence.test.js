import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPresenceRoom,
  getPresenceRoom,
  presenceStatus,
  PRESENCE_ONLINE_MS,
  resetPresenceRoom,
  setPresenceRoom,
  subscribePresenceRoom,
} from './presence'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  Timestamp: { fromMillis: (ms) => ({ ms }) },
}))
vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('./serverTime', () => ({ serverNow: () => 1_000_000 }))

const at = (ms) => ({ toMillis: () => ms })
const NOW = 1_000_000

describe('presenceStatus', () => {
  it('is playing when recent and in a room', () => {
    expect(presenceStatus({ at: at(NOW - 1000), room: 'ABC234', game: 'FLAGS' }, NOW)).toBe('playing')
  })

  it('is online when recent without a room', () => {
    expect(presenceStatus({ at: at(NOW - 1000), room: null }, NOW)).toBe('online')
  })

  it('is offline once the heartbeat is older than PRESENCE_ONLINE_MS, or missing', () => {
    expect(presenceStatus({ at: at(NOW - PRESENCE_ONLINE_MS), room: 'ABC234' }, NOW)).toBe('offline')
    expect(presenceStatus({ at: at(NOW - PRESENCE_ONLINE_MS + 1), room: null }, NOW)).toBe('online')
    expect(presenceStatus(null, NOW)).toBe('offline')
    expect(presenceStatus({ at: null, room: null }, NOW)).toBe('offline')
  })

  it('uses the server clock by default', () => {
    expect(presenceStatus({ at: at(NOW - 1000), room: null })).toBe('online')
  })
})

describe('presence room store', () => {
  beforeEach(() => resetPresenceRoom())

  it('keeps the room being played and notifies', () => {
    const listener = vi.fn()
    subscribePresenceRoom(listener)
    setPresenceRoom('ABC234', 'FLAGS')
    expect(getPresenceRoom()).toEqual({ room: 'ABC234', game: 'FLAGS' })
    clearPresenceRoom('ABC234')
    expect(getPresenceRoom()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('only clears the room it was set for', () => {
    setPresenceRoom('ABC234', 'FLAGS')
    clearPresenceRoom('ZZZ999')
    expect(getPresenceRoom()?.room).toBe('ABC234')
  })

  it('survives a screen handing over to the next one in the same room', () => {
    setPresenceRoom('ABC234', 'FLAGS')
    setPresenceRoom('ABC234', 'FLAGS')
    clearPresenceRoom('ABC234')
    expect(getPresenceRoom()?.room).toBe('ABC234')
    clearPresenceRoom('ABC234')
    expect(getPresenceRoom()).toBeNull()
  })
})

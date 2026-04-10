import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveSnapshot, loadSnapshot, clearSnapshot, snapshotKey } from './multiplayerSnapshot'

// Claude Code injects a custom localStorage without .clear() — use a proper mock instead
const makeLocalStorage = () => {
  let store = {}
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage())
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
})

describe('snapshotKey', () => {
  it('builds a unique key per room/player/game', () => {
    expect(snapshotKey('ROOM1', 'player-abc', 0)).toBe('mp_snap_ROOM1_player-abc_0')
    expect(snapshotKey('ROOM1', 'player-abc', 1)).toBe('mp_snap_ROOM1_player-abc_1')
    expect(snapshotKey('ROOM2', 'player-abc', 0)).toBe('mp_snap_ROOM2_player-abc_0')
  })
})

describe('saveSnapshot / loadSnapshot', () => {
  it('returns null when nothing saved', () => {
    expect(loadSnapshot('nonexistent')).toBeNull()
  })

  it('saves and loads a snapshot', () => {
    const key = snapshotKey('ABC', 'p1', 2)
    const data = { savedAt: Date.now(), elapsedMs: 12000, countryIndex: 3, found: 2 }
    saveSnapshot(key, data)
    expect(loadSnapshot(key)).toEqual(data)
  })

  it('returns null if savedAt is missing', () => {
    localStorage.setItem('bad_key', JSON.stringify({ elapsedMs: 100 }))
    expect(loadSnapshot('bad_key')).toBeNull()
  })

  it('returns null and removes entry if snapshot is older than 2 hours', () => {
    const key = snapshotKey('ABC', 'p1', 0)
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000 - 1
    saveSnapshot(key, { savedAt: twoHoursAgo, elapsedMs: 5000, countryIndex: 1, found: 0 })
    expect(loadSnapshot(key)).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('returns snapshot saved exactly at 2h - 1ms (not yet expired)', () => {
    const key = snapshotKey('ABC', 'p1', 0)
    const almostExpired = Date.now() - 2 * 60 * 60 * 1000 + 1
    saveSnapshot(key, { savedAt: almostExpired, elapsedMs: 5000, countryIndex: 1, found: 0 })
    expect(loadSnapshot(key)).not.toBeNull()
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem('bad_json', 'not json')
    expect(loadSnapshot('bad_json')).toBeNull()
  })
})

describe('clearSnapshot', () => {
  it('removes the snapshot', () => {
    const key = snapshotKey('ABC', 'p1', 0)
    saveSnapshot(key, { savedAt: Date.now(), elapsedMs: 100, countryIndex: 1, found: 0 })
    clearSnapshot(key)
    expect(loadSnapshot(key)).toBeNull()
  })

  it('does not throw when key does not exist', () => {
    expect(() => clearSnapshot('nonexistent')).not.toThrow()
  })
})

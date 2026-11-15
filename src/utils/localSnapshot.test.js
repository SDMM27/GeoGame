import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { ownUid, readSnapshot, resetSnapshotMemory, setOwnUid, writeSnapshot } from './localSnapshot'

describe('local snapshots', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    resetSnapshotMemory()
  })
  afterEach(() => vi.restoreAllMocks())

  it('round-trips a value', () => {
    writeSnapshot('a', { n: 1, list: ['x'] })
    resetSnapshotMemory()
    expect(readSnapshot('a')).toEqual({ n: 1, list: ['x'] })
    expect(globalThis.localStorage.getItem('geogame-snap:a')).not.toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(readSnapshot('missing')).toBeNull()
  })

  it('revives Firestore Timestamps', () => {
    writeSnapshot('t', { at: Timestamp.fromMillis(123456), nested: [{ at: Timestamp.fromMillis(5) }] })
    resetSnapshotMemory()
    const read = readSnapshot('t')
    expect(read.at.toMillis()).toBe(123456)
    expect(read.nested[0].at.toMillis()).toBe(5)
  })

  it('removes the snapshot on null or undefined', () => {
    writeSnapshot('a', 1)
    writeSnapshot('a', null)
    expect(readSnapshot('a')).toBeNull()
    writeSnapshot('a', 1)
    writeSnapshot('a', undefined)
    expect(readSnapshot('a')).toBeNull()
  })

  it('parses a stored value once', () => {
    globalThis.localStorage.setItem('geogame-snap:g', JSON.stringify([1, 2]))
    expect(readSnapshot('g')).toEqual([1, 2])
    // Read from memory from then on: the storage isn't read (nor parsed) again.
    globalThis.localStorage.setItem('geogame-snap:g', JSON.stringify([3]))
    expect(readSnapshot('g')).toEqual([1, 2])
    expect(readSnapshot('g')).toBe(readSnapshot('g'))
  })

  it('never throws when the storage does', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => writeSnapshot('a', 1)).not.toThrow()
    expect(() => writeSnapshot('a', null)).not.toThrow()
    expect(readSnapshot('a')).toBeNull()
  })

  it('remembers the own uid and clears it', () => {
    setOwnUid('u1')
    expect(ownUid()).toBe('u1')
    expect(readSnapshot('own-uid')).toBe('u1')
    setOwnUid(null)
    expect(ownUid()).toBeNull()
  })
})

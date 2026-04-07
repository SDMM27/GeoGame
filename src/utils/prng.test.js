import { describe, it, expect } from 'vitest'
import { mulberry32, seededShuffle } from './prng'

describe('mulberry32', () => {
  it('produces deterministic output for the same seed', () => {
    const r1 = mulberry32(42)
    const r2 = mulberry32(42)
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())
  })

  it('produces different output for different seeds', () => {
    expect(mulberry32(42)()).not.toBe(mulberry32(43)())
  })

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(12345)
    for (let i = 0; i < 100; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('seededShuffle', () => {
  it('returns an array of the same length', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 1)).toHaveLength(5)
  })

  it('contains the same elements', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 1).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('produces the same shuffle for the same seed', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(seededShuffle(arr, 99)).toEqual(seededShuffle(arr, 99))
  })

  it('produces different shuffles for different seeds', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(seededShuffle(arr, 1)).not.toEqual(seededShuffle(arr, 2))
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5]
    seededShuffle(arr, 1)
    expect(arr).toEqual([1, 2, 3, 4, 5])
  })
})

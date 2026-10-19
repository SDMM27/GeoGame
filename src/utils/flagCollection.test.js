import { describe, expect, it } from 'vitest'
import countriesMeta from '../data/countries.meta.json'
import countriesFull from '../data/countriesWithDifficulty_FR.json'
import {
  PIECES_PER_FLAG,
  RARITIES,
  RARITY_COLORS,
  RARITY_WEIGHTS,
  addFragments,
  flagPool,
  masteryProgress,
  masterySets,
  rarityOf,
  readFlags,
} from './flagCollection'

const feature = (ISO_A2, DifficultyFlag, extra = {}) => ({ properties: { ISO_A2, DifficultyFlag, ADMIN: `Country ${ISO_A2}`, ...extra } })
const small = flagPool([feature('AA', 'Facile'), feature('BB', 'Moyen'), feature('CC', 'Difficile'), feature('DD', 'Impossible')])
const empty = { unlocked: [], current: null, pieces: 0 }

describe('rarity', () => {
  it('follows the flag difficulty, uncommon without one', () => {
    expect(['Facile', 'Moyen', 'Difficile', 'Impossible'].map(rarityOf)).toEqual(RARITIES)
    expect([undefined, '', 'Hardcore'].map(rarityOf)).toEqual(['uncommon', 'uncommon', 'uncommon'])
    expect(Object.keys(RARITY_COLORS)).toEqual(RARITIES)
    expect(Object.keys(RARITY_WEIGHTS)).toEqual(RARITIES)
  })
})

describe('flagPool', () => {
  it('keeps the countries with an ISO_A2, once, sorted by iso', () => {
    const pool = flagPool([feature('FR', 'Facile'), feature(undefined, 'Facile'), feature('BE', 'Moyen'), feature('FR', 'Impossible'), feature('', 'Facile')])
    expect(pool).toEqual([{ iso: 'BE', rarity: 'uncommon' }, { iso: 'FR', rarity: 'common' }])
  })

  it('has 239 flags, the same set in the light and in the full data', () => {
    const light = flagPool(countriesMeta.features)
    expect(light).toHaveLength(239)
    expect(flagPool(countriesFull.features).map((flag) => flag.iso)).toEqual(light.map((flag) => flag.iso))
  })
})

describe('readFlags', () => {
  it('reads any document, dropping unknown and repeated flags and clamping the pieces', () => {
    expect(readFlags(undefined, small)).toEqual(empty)
    expect(readFlags({ flags: 'x' }, small)).toEqual(empty)
    expect(readFlags({ flags: { unlocked: ['AA', 'ZZ', 'AA', 'BB'], current: 'CC', pieces: 99 } }, small)).toEqual({
      unlocked: ['AA', 'BB'],
      current: 'CC',
      pieces: PIECES_PER_FLAG - 1,
    })
    expect(readFlags({ flags: { unlocked: ['AA'], current: 'AA', pieces: 2 } }, small)).toEqual({ unlocked: ['AA'], current: null, pieces: 0 })
    expect(readFlags({ flags: { current: 'BB', pieces: -3 } }, small)).toEqual({ unlocked: [], current: 'BB', pieces: 0 })
    expect(readFlags({ flags: { current: 'BB', pieces: 1.9 } }, small).pieces).toBe(1)
  })
})

describe('addFragments', () => {
  it('draws the first flag, then adds a piece per fragment', () => {
    const { state, unlocked } = addFragments(empty, 2, small, 'alice')
    expect(state.current).not.toBeNull()
    expect(state.pieces).toBe(2)
    expect(unlocked).toEqual([])
  })

  it('does nothing without fragments', () => {
    expect(addFragments(empty, 0, small, 'alice')).toEqual({ state: empty, unlocked: [] })
  })

  it('unlocks the flag on its last piece and draws the next one among those left', () => {
    const start = { unlocked: [], current: 'AA', pieces: PIECES_PER_FLAG - 1 }
    const { state, unlocked } = addFragments(start, 1 + PIECES_PER_FLAG + 1, small, 'alice')
    expect(unlocked).toHaveLength(2)
    expect(unlocked[0]).toBe('AA')
    expect(state.unlocked).toEqual(unlocked)
    expect(state.current).not.toBeNull()
    expect(state.unlocked).not.toContain(state.current)
    expect(state.pieces).toBe(1)
  })

  it('is deterministic for a seed and varies with it', () => {
    const pool = flagPool(countriesMeta.features)
    const draw = (seed) => addFragments(empty, 1, pool, seed).state.current
    expect(draw('alice')).toBe(draw('alice'))
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(draw)).size).toBeGreaterThan(1)
  })

  it('does not mutate its input', () => {
    const start = { unlocked: ['AA'], current: 'BB', pieces: 3 }
    addFragments(start, 5, small, 'alice')
    expect(start).toEqual({ unlocked: ['AA'], current: 'BB', pieces: 3 })
  })

  it('favours the common flags over the legendary ones', () => {
    const pool = flagPool([feature('AA', 'Facile'), feature('BB', 'Impossible')])
    const counts = { AA: 0, BB: 0 }
    for (let i = 0; i < 2000; i += 1) counts[addFragments(empty, 1, pool, `user${i}`).state.current] += 1
    // Weights 4 and 1: AA about 80%.
    expect(counts.AA / 2000).toBeGreaterThan(0.74)
    expect(counts.AA / 2000).toBeLessThan(0.86)
  })

  it('collects every flag, then drops the extra fragments', () => {
    const { state, unlocked } = addFragments(empty, small.length * PIECES_PER_FLAG + 10, small, 'alice')
    expect([...state.unlocked].sort()).toEqual(small.map((flag) => flag.iso))
    expect(unlocked).toEqual(state.unlocked)
    expect(state).toMatchObject({ current: null, pieces: 0 })
    expect(addFragments(state, 5, small, 'alice')).toEqual({ state, unlocked: [] })
  })
})

describe('mastery', () => {
  const features = [
    feature('AA', 'Facile', { Difficulty: 'Facile' }),
    feature('BB', undefined, { Difficulty: 'Moyen' }),
    feature('CC', 'Difficile'),
    feature(undefined, undefined, { Difficulty: 'Facile', ADMIN: 'Zone' }),
  ]

  it('targets the countries each mode can ask', () => {
    expect(masterySets(features)).toEqual({
      placement: ['Country AA', 'Country BB', 'Zone'],
      flags: ['Country AA', 'Country CC'],
      hardcore: ['Country AA', 'Country BB', 'Zone'],
    })
  })

  it('counts only the names of the targets', () => {
    const sets = masterySets(features)
    expect(masteryProgress({ placement: ['Country AA', 'Nowhere'], flags: ['Country CC', 'Country CC'] }, sets)).toEqual({
      placement: { found: 1, total: 3 },
      flags: { found: 1, total: 2 },
      hardcore: { found: 0, total: 3 },
      found: 2,
      total: 8,
    })
    expect(masteryProgress(undefined, sets).found).toBe(0)
  })

  it('on the real data, the targets are the playable countries', () => {
    const sets = masterySets(countriesMeta.features)
    expect(sets.placement).toHaveLength(238)
    expect(sets.flags).toHaveLength(229)
  })
})

import { describe, expect, it } from 'vitest'
import { SCROLLS } from '../data/scrolls'
import { RARITIES } from './flagCollection'
import {
  MAX_BANKED_SEALS,
  SEALS_PER_SCROLL,
  STARTER_SCROLL,
  addSeals,
  payScrolls,
  readScrolls,
} from './scrollCollection'

const scroll = (id, rarity = 'common') => ({ id, era: 'antiquity', family: 'atlas', rarity, year: 1900 })
const small = [scroll('a'), scroll('b', 'uncommon'), scroll('c', 'rare'), scroll('d', 'legendary')]
const empty = { unlocked: [], seals: 0 }

describe('readScrolls', () => {
  it('reads an absent or malformed document as empty', () => {
    for (const data of [undefined, null, {}, { scrolls: null }, { scrolls: 'x' }, { scrolls: { unlocked: 'a', seals: 'many' } }]) {
      expect(readScrolls(data, small)).toEqual(empty)
    }
  })

  it('drops unknown and repeated scrolls, keeps the order and floors the seals', () => {
    expect(readScrolls({ scrolls: { unlocked: ['c', 'zzz', 'a', 'c', 7], seals: 1.9 } }, small)).toEqual({ unlocked: ['c', 'a'], seals: 1 })
    expect(readScrolls({ scrolls: { unlocked: [], seals: -3 } }, small).seals).toBe(0)
  })
})

describe('addSeals', () => {
  it('unlocks one scroll per SEALS_PER_SCROLL seals, and keeps an odd seal', () => {
    expect(SEALS_PER_SCROLL).toBe(2)
    const none = addSeals(empty, 1, small, 'u1')
    expect(none).toEqual({ state: { unlocked: [], seals: 1 }, unlocked: [] })
    const one = addSeals(none.state, 1, small, 'u1')
    expect(one.unlocked).toHaveLength(1)
    expect(one.state).toEqual({ unlocked: one.unlocked, seals: 0 })
    const odd = addSeals(empty, 3, small, 'u1')
    expect(odd.unlocked).toHaveLength(1)
    expect(odd.state.seals).toBe(1)
  })

  it('unlocks several at once, never twice the same, and reproduces a draw from its seed', () => {
    const many = addSeals(empty, 8, small, 'u1')
    expect([...many.unlocked].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(many.state).toEqual({ unlocked: many.unlocked, seals: 0 })
    expect(addSeals(empty, 8, small, 'u1')).toEqual(many)
    for (const seed of ['u1', 'u2', 'u3', 'u4']) {
      const { unlocked } = addSeals(empty, 6, small, seed)
      expect(new Set(unlocked).size).toBe(3)
    }
    // The seed shapes the draw: other seeds do not all give the same first scroll
    const firsts = new Set(Array.from({ length: 20 }, (_, index) => addSeals(empty, 2, small, `seed${index}`).unlocked[0]))
    expect(firsts.size).toBeGreaterThan(1)
  })

  it('skips the scrolls already unlocked', () => {
    const { unlocked } = addSeals({ unlocked: ['a', 'b', 'd'], seals: 0 }, 2, small, 'u1')
    expect(unlocked).toEqual(['c'])
  })

  it('banks the seals once the pool is complete, MAX_BANKED_SEALS at most', () => {
    const full = { unlocked: ['a', 'b', 'c', 'd'], seals: 0 }
    expect(addSeals(full, 3, small, 'u1')).toEqual({ state: { unlocked: full.unlocked, seals: 3 }, unlocked: [] })
    expect(addSeals(full, 50, small, 'u1').state.seals).toBe(MAX_BANKED_SEALS)
    // Completing the pool with a surplus banks what is left (7 seals: one scroll, 5 left, capped)
    expect(addSeals({ unlocked: ['a', 'b', 'c'], seals: 0 }, 7, small, 'u1').state).toMatchObject({ seals: MAX_BANKED_SEALS })
    expect(addSeals({ unlocked: ['a', 'b', 'c'], seals: 0 }, 3, small, 'u1').state).toMatchObject({ seals: 1 })
  })

  it('spends the banked seals when the pool grows', () => {
    const banked = { unlocked: ['a', 'b', 'c', 'd'], seals: MAX_BANKED_SEALS }
    const bigger = [...small, scroll('e'), scroll('f')]
    const result = addSeals(banked, 0, bigger, 'u1')
    expect([...result.unlocked].sort()).toEqual(['e', 'f'])
    expect(result.state).toEqual({ unlocked: [...banked.unlocked, ...result.unlocked], seals: 0 })
  })

  it('ignores a negative count and floors a fractional one', () => {
    expect(addSeals(empty, -4, small, 'u1').state).toEqual(empty)
    expect(addSeals(empty, 2.9, small, 'u1').unlocked).toHaveLength(1)
  })
})

describe('payScrolls', () => {
  it('grants the starter scroll once, free, even with no seal paid', () => {
    const first = payScrolls({ username: 'Alice' }, 0, SCROLLS, 'u1')
    expect(first).toEqual({ state: { unlocked: [STARTER_SCROLL], seals: 0 }, unlocked: [STARTER_SCROLL], changed: true })
    const again = payScrolls({ username: 'Alice', scrolls: first.state }, 0, SCROLLS, 'u1')
    expect(again).toEqual({ state: first.state, unlocked: [], changed: false })
  })

  it('never draws the starter, and lists it with the scrolls the seals unlock', () => {
    for (let index = 0; index < 30; index += 1) {
      const paid = payScrolls({}, 2, SCROLLS, `u${index}`)
      expect(paid.unlocked).toHaveLength(2)
      expect(paid.unlocked[0]).toBe(STARTER_SCROLL)
      expect(paid.unlocked[1]).not.toBe(STARTER_SCROLL)
      expect(paid.state.unlocked).toEqual(paid.unlocked)
    }
  })

  it('pays seals on top of the stored state, and reports a change only when there is one', () => {
    const stored = { unlocked: [STARTER_SCROLL], seals: 1 }
    expect(payScrolls({ scrolls: stored }, 0, SCROLLS, 'u1').changed).toBe(false)
    const paid = payScrolls({ scrolls: stored }, 1, SCROLLS, 'u1')
    expect(paid.changed).toBe(true)
    expect(paid.unlocked).toHaveLength(1)
    expect(paid.state.unlocked).toEqual([STARTER_SCROLL, ...paid.unlocked])
    expect(payScrolls({ scrolls: { unlocked: [STARTER_SCROLL], seals: 0 } }, 1, SCROLLS, 'u1')).toMatchObject({ changed: true, unlocked: [] })
  })
})

describe('catalogue', () => {
  it('has unique ids, valid rarities, eras and families, and the starter scroll', () => {
    expect(SCROLLS).toHaveLength(12)
    expect(new Set(SCROLLS.map((item) => item.id)).size).toBe(SCROLLS.length)
    for (const item of SCROLLS) {
      expect(RARITIES).toContain(item.rarity)
      expect(['geological', 'antiquity', 'middle_ages', 'discoveries', 'modern']).toContain(item.era)
      expect(['period', 'atlas']).toContain(item.family)
      expect(Number.isInteger(item.year)).toBe(true)
    }
    expect(SCROLLS.map((item) => item.id)).toContain(STARTER_SCROLL)
  })
})

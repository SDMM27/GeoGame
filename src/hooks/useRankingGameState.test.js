import { describe, it, expect } from 'vitest'
import { computeTotalError, computePositionFeedback, pickCriterionKey } from './useRankingGameState'
import { CRITERIA_KEYS } from '../utils/rankingCriteria'

const c = (iso) => ({ properties: { ISO_A3: iso } })

describe('computeTotalError', () => {
  it('returns 0 for a perfect ordering', () => {
    const order = [c('FRA'), c('DEU'), c('ESP')]
    expect(computeTotalError(order, order)).toBe(0)
  })

  it('returns 2 when two adjacent countries are swapped', () => {
    const correct = [c('FRA'), c('DEU'), c('ESP')]
    const player = [c('DEU'), c('FRA'), c('ESP')]
    expect(computeTotalError(player, correct)).toBe(2)
  })

  it('returns 4 when first country is placed last (3 countries)', () => {
    const correct = [c('A'), c('B'), c('C')]
    const player  = [c('B'), c('C'), c('A')]
    expect(computeTotalError(player, correct)).toBe(4)
  })

  it('handles single country (always 0)', () => {
    const order = [c('FRA')]
    expect(computeTotalError(order, order)).toBe(0)
  })
})

describe('pickCriterionKey', () => {
  it('returns the provided key when one is given', () => {
    expect(pickCriterionKey('population')).toBe('population')
    expect(pickCriterionKey('area')).toBe('area')
  })

  it('returns a valid CRITERIA_KEYS entry when null is passed', () => {
    const key = pickCriterionKey(null)
    expect(CRITERIA_KEYS).toContain(key)
  })

  it('returns a valid CRITERIA_KEYS entry when undefined is passed', () => {
    const key = pickCriterionKey(undefined)
    expect(CRITERIA_KEYS).toContain(key)
  })
})

describe('computePositionFeedback', () => {
  it('returns all true for a perfect order', () => {
    const order = [c('FRA'), c('DEU'), c('ESP')]
    expect(computePositionFeedback(order, order)).toEqual([true, true, true])
  })

  it('returns false for swapped adjacent countries', () => {
    const correct = [c('FRA'), c('DEU'), c('ESP')]
    const player  = [c('DEU'), c('FRA'), c('ESP')]
    expect(computePositionFeedback(player, correct)).toEqual([false, false, true])
  })

  it('returns false for all positions when completely reversed', () => {
    const correct = [c('A'), c('B'), c('C')]
    const player  = [c('C'), c('B'), c('A')]
    expect(computePositionFeedback(player, correct)).toEqual([false, true, false])
  })
})

import { describe, it, expect } from 'vitest'
import { computeTotalError, computePositionFeedback, pickCriterionKey, sumStages, describePlayedOrders } from './useRankingGameState'
import { CRITERIA, CRITERIA_KEYS } from '../utils/rankingCriteria'

const c = (iso) => ({ properties: { ISO_A3: iso } })

describe('sumStages', () => {
  it('adds up the points, best errors and attempts of every criterion', () => {
    const stages = [
      { score: 3, totalError: 0, attempts: 1 },
      { score: 0, totalError: 4, attempts: 3 },
      { score: 2, totalError: 0, attempts: 2 },
    ]
    expect(sumStages(stages)).toEqual({ score: 5, totalError: 4, attempts: 6 })
  })

  it('is zero before any stage', () => {
    expect(sumStages([])).toEqual({ score: 0, totalError: 0, attempts: 0 })
  })
})

describe('describePlayedOrders', () => {
  it('gives one line per criterion with the played order', () => {
    const country = (name) => ({ properties: { ADMIN: name } })
    const stages = [
      { criterion: CRITERIA.population, playerOrder: [country('France'), country('Spain')] },
      { criterion: CRITERIA.gdp, playerOrder: [country('Spain'), country('France')] },
    ]
    expect(describePlayedOrders(stages, (key) => key.toUpperCase())).toEqual([
      'POPULATION : France > Spain',
      'GDP : Spain > France',
    ])
  })
})

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

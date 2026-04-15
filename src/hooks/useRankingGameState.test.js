import { describe, it, expect } from 'vitest'
import { computeTotalError } from './useRankingGameState'

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

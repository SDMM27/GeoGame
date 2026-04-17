import { describe, it, expect } from 'vitest'
import { getRankingGamePoints, getRankingAttemptScore } from './scoringRules'

describe('getRankingGamePoints', () => {
  it('returns 3 for a perfect score (totalError = 0)', () => {
    expect(getRankingGamePoints(0, 5)).toBe(3)
    expect(getRankingGamePoints(0, 8)).toBe(3)
    expect(getRankingGamePoints(0, 10)).toBe(3)
  })

  it('returns 2 for totalError <= n', () => {
    expect(getRankingGamePoints(1, 5)).toBe(2)
    expect(getRankingGamePoints(5, 5)).toBe(2)
    expect(getRankingGamePoints(8, 8)).toBe(2)
  })

  it('returns 1 for n < totalError <= 2*n', () => {
    expect(getRankingGamePoints(6, 5)).toBe(1)
    expect(getRankingGamePoints(10, 5)).toBe(1)
    expect(getRankingGamePoints(9, 8)).toBe(1)
    expect(getRankingGamePoints(16, 8)).toBe(1)
  })

  it('returns 0 for totalError > 2*n', () => {
    expect(getRankingGamePoints(11, 5)).toBe(0)
    expect(getRankingGamePoints(17, 8)).toBe(0)
    expect(getRankingGamePoints(21, 10)).toBe(0)
  })
})

describe('getRankingAttemptScore', () => {
  it('returns 3 for attempt 1', () => {
    expect(getRankingAttemptScore(1)).toBe(3)
  })

  it('returns 2 for attempt 2', () => {
    expect(getRankingAttemptScore(2)).toBe(2)
  })

  it('returns 1 for attempt 3', () => {
    expect(getRankingAttemptScore(3)).toBe(1)
  })
})

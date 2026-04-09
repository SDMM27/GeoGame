import { describe, it, expect } from 'vitest'
import { rankResults, aggregatePoints } from './multiplayerScoring'

describe('rankResults (weighted mode — default)', () => {
  it('ranks by weightedScore descending', () => {
    const results = [
      { playerId: 'b', weightedScore: 3, elapsedTime: 10000 },
      { playerId: 'a', weightedScore: 7, elapsedTime: 20000 },
    ]
    const ranked = rankResults(results, 2)
    expect(ranked[0].playerId).toBe('a')
    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].points).toBe(2)
    expect(ranked[1].playerId).toBe('b')
    expect(ranked[1].rank).toBe(2)
    expect(ranked[1].points).toBe(1)
  })

  it('breaks ties by elapsedTime ascending', () => {
    const results = [
      { playerId: 'b', weightedScore: 5, elapsedTime: 15000 },
      { playerId: 'a', weightedScore: 5, elapsedTime: 10000 },
    ]
    expect(rankResults(results, 2)[0].playerId).toBe('a')
  })

  it('treats missing elapsedTime as Infinity (last)', () => {
    const results = [
      { playerId: 'b', weightedScore: 5, elapsedTime: undefined },
      { playerId: 'a', weightedScore: 5, elapsedTime: 5000 },
    ]
    expect(rankResults(results, 2)[0].playerId).toBe('a')
  })

  it('assigns N points to 1st for N players', () => {
    const results = [
      { playerId: 'a', weightedScore: 9, elapsedTime: 1000 },
      { playerId: 'b', weightedScore: 5, elapsedTime: 2000 },
      { playerId: 'c', weightedScore: 2, elapsedTime: 3000 },
    ]
    expect(rankResults(results, 3).map(r => r.points)).toEqual([3, 2, 1])
  })

  it('does not mutate the input array', () => {
    const results = [
      { playerId: 'b', weightedScore: 3, elapsedTime: 10000 },
      { playerId: 'a', weightedScore: 7, elapsedTime: 5000 },
    ]
    rankResults(results, 2)
    expect(results[0].playerId).toBe('b')
  })
})

describe('rankResults (solved mode)', () => {
  it('ranks by countriesSolved descending', () => {
    const results = [
      { playerId: 'a', attempts: 10, elapsedTime: 5000, countriesSolved: 3 },
      { playerId: 'b', attempts: 2,  elapsedTime: 3000, countriesSolved: 7 },
    ]
    const ranked = rankResults(results, 2, 'solved')
    expect(ranked[0].playerId).toBe('b')
    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].points).toBe(2)
  })

  it('breaks ties on countriesSolved by attempts ascending', () => {
    const results = [
      { playerId: 'a', attempts: 5, elapsedTime: 5000, countriesSolved: 4 },
      { playerId: 'b', attempts: 2, elapsedTime: 9000, countriesSolved: 4 },
    ]
    const ranked = rankResults(results, 2, 'solved')
    expect(ranked[0].playerId).toBe('b')
  })

  it('breaks ties on countriesSolved+attempts by elapsedTime ascending', () => {
    const results = [
      { playerId: 'a', attempts: 3, elapsedTime: 9000, countriesSolved: 4 },
      { playerId: 'b', attempts: 3, elapsedTime: 2000, countriesSolved: 4 },
    ]
    const ranked = rankResults(results, 2, 'solved')
    expect(ranked[0].playerId).toBe('b')
  })

  it('falls back to weighted mode when scoringMode is omitted', () => {
    const results = [
      { playerId: 'a', weightedScore: 9, elapsedTime: 1000 },
      { playerId: 'b', weightedScore: 3, elapsedTime: 1000 },
    ]
    expect(rankResults(results, 2)[0].playerId).toBe('a')
  })
})

describe('aggregatePoints', () => {
  it('sums points across games per player', () => {
    const gameResults = [
      { playerId: 'a', gameIndex: 0, points: 3 },
      { playerId: 'b', gameIndex: 0, points: 2 },
      { playerId: 'a', gameIndex: 1, points: 2 },
      { playerId: 'b', gameIndex: 1, points: 3 },
    ]
    const totals = aggregatePoints(gameResults)
    expect(totals['a']).toBe(5)
    expect(totals['b']).toBe(5)
  })

  it('returns empty object for no results', () => {
    expect(aggregatePoints([])).toEqual({})
  })
})

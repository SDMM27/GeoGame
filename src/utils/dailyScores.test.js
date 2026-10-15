import { describe, it, expect } from 'vitest'
import { sortChallengeScores, sortDailyScores } from './dailyScores'

describe('sortDailyScores', () => {
  it('trie par attempts croissant', () => {
    const scores = [
      { name: 'B', attempts: 5, elapsedTime: 1000 },
      { name: 'A', attempts: 3, elapsedTime: 2000 },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('à égalité d\'attempts, trie par elapsedTime croissant', () => {
    const scores = [
      { name: 'B', attempts: 3, elapsedTime: 5000 },
      { name: 'A', attempts: 3, elapsedTime: 2000 },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('ne mute pas le tableau original', () => {
    const scores = [
      { name: 'B', attempts: 5, elapsedTime: 1000 },
      { name: 'A', attempts: 3, elapsedTime: 2000 },
    ]
    const original = [...scores]
    sortDailyScores(scores)
    expect(scores).toEqual(original)
  })
})

describe('sortChallengeScores', () => {
  it('puts the most right answers first, then the shortest time', () => {
    const scores = [
      { name: 'C', score: 7, elapsedTime: 1000 },
      { name: 'B', score: 9, elapsedTime: 90000 },
      { name: 'A', score: 9, elapsedTime: 80000 },
      { name: 'D', score: 0, elapsedTime: null },
    ]
    expect(sortChallengeScores(scores).map((s) => s.name)).toEqual(['A', 'B', 'C', 'D'])
    expect(scores[0].name).toBe('C')
  })
})

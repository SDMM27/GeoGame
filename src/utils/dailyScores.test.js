import { describe, it, expect } from 'vitest'
import { sortDailyScores } from './dailyScores'

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

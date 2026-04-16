import { describe, it, expect } from 'vitest'
import { sortRankingScores } from './rankingScores'

describe('sortRankingScores', () => {
  it('trie par score décroissant', () => {
    const scores = [
      { name: 'B', score: 50, totalError: 1 },
      { name: 'A', score: 85, totalError: 3 },
    ]
    expect(sortRankingScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('à égalité de score, trie par totalError croissant', () => {
    const scores = [
      { name: 'B', score: 85, totalError: 5 },
      { name: 'A', score: 85, totalError: 2 },
    ]
    expect(sortRankingScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('ne mute pas le tableau original', () => {
    const scores = [
      { name: 'B', score: 50, totalError: 1 },
      { name: 'A', score: 85, totalError: 3 },
    ]
    const original = [...scores]
    sortRankingScores(scores)
    expect(scores).toEqual(original)
  })
})

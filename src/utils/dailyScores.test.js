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

  it('classe tous les joueurs sans carte avant ceux qui ont utilisé la carte', () => {
    const scores = [
      { name: 'Map', attempts: 3, elapsedTime: 1000, mapAssist: true },
      { name: 'NoMap', attempts: 10, elapsedTime: 9000, mapAssist: false },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['NoMap', 'Map'])
  })

  it('départage dans chaque palier par attempts puis elapsedTime', () => {
    const scores = [
      { name: 'M5', attempts: 5, elapsedTime: 1000, mapAssist: true },
      { name: 'M3slow', attempts: 3, elapsedTime: 5000, mapAssist: true },
      { name: 'M3fast', attempts: 3, elapsedTime: 2000, mapAssist: true },
      { name: 'N6', attempts: 6, elapsedTime: 1000 },
      { name: 'N2', attempts: 2, elapsedTime: 9000, mapAssist: false },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['N2', 'N6', 'M3fast', 'M3slow', 'M5'])
  })

  it('traite un champ mapAssist absent comme sans carte', () => {
    const scores = [
      { name: 'Map', attempts: 1, elapsedTime: 100, mapAssist: true },
      { name: 'Old', attempts: 4, elapsedTime: 100 },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['Old', 'Map'])
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

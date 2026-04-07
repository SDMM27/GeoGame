import { describe, it, expect } from 'vitest'
import { sortDailyScores, isBetterDailyScore } from './dailyScores'

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

describe('isBetterDailyScore', () => {
  it('moins d\'attempts = meilleur', () => {
    expect(isBetterDailyScore({ attempts: 2, elapsedTime: 9999 }, { attempts: 3, elapsedTime: 100 })).toBe(true)
  })

  it('plus d\'attempts = pas meilleur', () => {
    expect(isBetterDailyScore({ attempts: 4, elapsedTime: 100 }, { attempts: 3, elapsedTime: 9999 })).toBe(false)
  })

  it('même attempts, moins de temps = meilleur', () => {
    expect(isBetterDailyScore({ attempts: 3, elapsedTime: 1000 }, { attempts: 3, elapsedTime: 2000 })).toBe(true)
  })

  it('même attempts, plus de temps = pas meilleur', () => {
    expect(isBetterDailyScore({ attempts: 3, elapsedTime: 3000 }, { attempts: 3, elapsedTime: 2000 })).toBe(false)
  })

  it('même attempts, même temps = pas meilleur', () => {
    expect(isBetterDailyScore({ attempts: 3, elapsedTime: 2000 }, { attempts: 3, elapsedTime: 2000 })).toBe(false)
  })
})

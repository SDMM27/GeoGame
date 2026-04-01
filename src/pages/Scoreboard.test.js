import { describe, it, expect } from 'vitest'
import { sortScores, filterByGame } from './Scoreboard'

const DIFFICULTY_ORDER = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];

const sortByDifficulty = (scores) =>
  [...scores].sort(
    (a, b) =>
      DIFFICULTY_ORDER.indexOf(a.difficulty) -
      DIFFICULTY_ORDER.indexOf(b.difficulty)
  );

describe('sortByDifficulty', () => {
  it('trie les scores dans l\'ordre de difficulté croissant', () => {
    const input = [
      { name: 'Alice', score: 10, difficulty: 'Difficile' },
      { name: 'Bob', score: 8, difficulty: 'Facile' },
      { name: 'Carol', score: 12, difficulty: 'Moyen' },
    ]
    const result = sortByDifficulty(input)
    expect(result[0].difficulty).toBe('Facile')
    expect(result[1].difficulty).toBe('Moyen')
    expect(result[2].difficulty).toBe('Difficile')
  })

  it('ne retourne pas NaN pour des strings (bug original)', () => {
    const input = [
      { name: 'X', score: 5, difficulty: 'Impossible' },
      { name: 'Y', score: 3, difficulty: 'Facile' },
    ]
    const result = sortByDifficulty(input)
    expect(result[0].difficulty).toBe('Facile')
  })
})

describe('sortScores', () => {
  it('trie par score décroissant', () => {
    const input = [
      { name: 'A', score: 5,  difficulty: 'Facile', elapsedTime: 120 },
      { name: 'B', score: 10, difficulty: 'Facile', elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('B')
  })

  it('à score égal, trie par temps croissant', () => {
    const input = [
      { name: 'Slow', score: 10, difficulty: 'Facile', elapsedTime: 180 },
      { name: 'Fast', score: 10, difficulty: 'Facile', elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('Fast')
  })

  it('place les scores sans elapsedTime en dernier à score égal', () => {
    const input = [
      { name: 'NoTime',  score: 10, difficulty: 'Facile' },
      { name: 'HasTime', score: 10, difficulty: 'Facile', elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('HasTime')
  })
})

describe('filterByGame', () => {
  it('returns all scores when game is AllGames', () => {
    const scores = [{ gameId: 'country' }, { gameId: 'flags' }]
    expect(filterByGame(scores, 'AllGames')).toHaveLength(2)
  })

  it('treats missing gameId as country', () => {
    const scores = [
      { name: 'A' },
      { name: 'B', gameId: 'country' },
      { name: 'C', gameId: 'flags' },
    ]
    expect(filterByGame(scores, 'country')).toHaveLength(2)
  })

  it('filters by gameId when specified', () => {
    const scores = [{ gameId: 'country' }, { gameId: 'flags' }, { gameId: 'country' }]
    expect(filterByGame(scores, 'flags')).toHaveLength(1)
  })

  it('returns all scores when game is falsy', () => {
    const scores = [{ gameId: 'country' }, { gameId: 'flags' }]
    expect(filterByGame(scores, null)).toHaveLength(2)
  })
})

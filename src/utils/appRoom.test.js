// src/utils/appRoom.test.js
import { describe, it, expect, vi } from 'vitest'
import { getAppRoomContent, rankAppRoomResults } from './appRoom'
import { getSeededFlagCountries, getSeededBorderGuessCountries } from './multiplayerSeed'
import { GAME_TYPES } from './gameTypes'

vi.mock('../Firebase', () => ({ firestore: {} }))

const SEED = 123456

describe('getAppRoomContent', () => {
  it('draws the same countries as the seeded multiplayer pools', () => {
    const content = getAppRoomContent({ id: 'flags', type: GAME_TYPES.FLAGS, difficulty: 'Moyen' }, SEED)
    expect(content.list).toEqual(getSeededFlagCountries('Moyen', SEED, 0))
    expect(content.total).toBe(content.list.length)
  })

  it('is deterministic for a continent game and stays on that continent', () => {
    const game = { id: 'capitals', type: GAME_TYPES.CAPITALS, continent: 'Europe' }
    const a = getAppRoomContent(game, SEED)
    const b = getAppRoomContent(game, SEED)
    expect(a.list.map((c) => c.properties.ADMIN)).toEqual(b.list.map((c) => c.properties.ADMIN))
    expect(a.list.every((c) => c.properties.continent === 'Europe' && c.properties.capital)).toBe(true)
  })

  it('counts every ascension phase', () => {
    const phases = { Facile: 3, Moyen: 2 }
    const content = getAppRoomContent({ id: 'placement', type: GAME_TYPES.PLACEMENT, phases }, SEED)
    expect(content.list).toBeNull()
    expect(content.byDifficulty.Facile).toHaveLength(3)
    expect(content.total).toBe(5)
  })

  it('takes `count` countries for Border Guess and questions for the quiz', () => {
    const border = getAppRoomContent({ id: 'border_guess', type: GAME_TYPES.BORDER_GUESS, count: 4 }, SEED)
    expect(border.list).toEqual(getSeededBorderGuessCountries(4, SEED, 0))
    expect(getAppRoomContent({ id: 'quiz', type: GAME_TYPES.QUIZ, count: 15 }, SEED).total).toBe(15)
  })
})

describe('rankAppRoomResults', () => {
  it('ranks Border Guess on countries found before score', () => {
    const game = { type: GAME_TYPES.BORDER_GUESS }
    const ranked = rankAppRoomResults(game, [
      { playerId: 'a', countriesSolved: 3, attempts: 1, elapsedTime: 10, weightedScore: 3 },
      { playerId: 'b', countriesSolved: 4, attempts: 5, elapsedTime: 50, weightedScore: 4 },
    ])
    expect(ranked.map((r) => r.playerId)).toEqual(['b', 'a'])
  })

  it('ranks the other games on score, then time', () => {
    const game = { type: GAME_TYPES.FLAGS }
    const ranked = rankAppRoomResults(game, [
      { playerId: 'a', weightedScore: 50, elapsedTime: 10 },
      { playerId: 'b', weightedScore: 50, elapsedTime: 5 },
      { playerId: 'c', weightedScore: 80, elapsedTime: 99 },
    ])
    expect(ranked.map((r) => r.playerId)).toEqual(['c', 'b', 'a'])
  })
})

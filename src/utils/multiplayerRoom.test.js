// src/utils/multiplayerRoom.test.js
import { describe, it, expect, vi } from 'vitest'
import { getRoomContent, pickNewHost, rankRoomResults, HOST_GONE_MS } from './multiplayerRoom'
import { getSeededFlagCountries, getSeededBorderGuessCountries } from './multiplayerSeed'
import { GAME_TYPES } from './gameTypes'

vi.mock('../Firebase', () => ({ firestore: {} }))

const SEED = 123456

describe('getRoomContent', () => {
  it('draws the same countries as the seeded multiplayer pools', () => {
    const content = getRoomContent({ id: 'flags', type: GAME_TYPES.FLAGS, difficulty: 'Moyen' }, SEED)
    expect(content.list).toEqual(getSeededFlagCountries('Moyen', SEED, 0))
    expect(content.total).toBe(content.list.length)
  })

  it('is deterministic for a continent game and stays on that continent', () => {
    const game = { id: 'capitals', type: GAME_TYPES.CAPITALS, continent: 'Europe' }
    const a = getRoomContent(game, SEED)
    const b = getRoomContent(game, SEED)
    expect(a.list.map((c) => c.properties.ADMIN)).toEqual(b.list.map((c) => c.properties.ADMIN))
    expect(a.list.every((c) => c.properties.continent === 'Europe' && c.properties.capital)).toBe(true)
  })

  it('counts every ascension phase', () => {
    const phases = { Facile: 3, Moyen: 2 }
    const content = getRoomContent({ id: 'placement', type: GAME_TYPES.PLACEMENT, phases }, SEED)
    expect(content.list).toBeNull()
    expect(content.byDifficulty.Facile).toHaveLength(3)
    expect(content.total).toBe(5)
  })

  it('takes `count` countries for Border Guess and questions for the quiz', () => {
    const border = getRoomContent({ id: 'border_guess', type: GAME_TYPES.BORDER_GUESS, count: 4 }, SEED)
    expect(border.list).toEqual(getSeededBorderGuessCountries(4, SEED, 0))
    expect(getRoomContent({ id: 'quiz', type: GAME_TYPES.QUIZ, count: 15 }, SEED).total).toBe(15)
  })
})

describe('rankRoomResults', () => {
  it('ranks Border Guess on countries found before score', () => {
    const game = { type: GAME_TYPES.BORDER_GUESS }
    const ranked = rankRoomResults(game, [
      { playerId: 'a', countriesSolved: 3, attempts: 1, elapsedTime: 10, weightedScore: 3 },
      { playerId: 'b', countriesSolved: 4, attempts: 5, elapsedTime: 50, weightedScore: 4 },
    ])
    expect(ranked.map((r) => r.playerId)).toEqual(['b', 'a'])
  })

  it('ranks the other games on score, then time', () => {
    const game = { type: GAME_TYPES.FLAGS }
    const ranked = rankRoomResults(game, [
      { playerId: 'a', weightedScore: 50, elapsedTime: 10 },
      { playerId: 'b', weightedScore: 50, elapsedTime: 5 },
      { playerId: 'c', weightedScore: 80, elapsedTime: 99 },
    ])
    expect(ranked.map((r) => r.playerId)).toEqual(['c', 'b', 'a'])
  })
})

describe('pickNewHost', () => {
  const NOW = 1_000_000
  const seen = (ago) => ({ toMillis: () => NOW - ago })
  const lobby = (players, hostId = 'host') => ({ status: 'lobby', hostId, players })

  it('keeps a host who is still around', () => {
    expect(pickNewHost(lobby({ host: { seenAt: seen(1000) }, b: { seenAt: seen(0) } }), NOW)).toBeNull()
  })

  it('hands a silent host over to the active player with the smallest id', () => {
    const room = lobby({
      host: { seenAt: seen(HOST_GONE_MS + 1) },
      zed: { seenAt: seen(0) },
      bob: { seenAt: seen(1000) },
      old: { seenAt: seen(HOST_GONE_MS + 5) },
    })
    expect(pickNewHost(room, NOW)).toBe('bob')
  })

  it('never replaces a host without heartbeat (older app versions)', () => {
    expect(pickNewHost(lobby({ host: {}, b: { seenAt: seen(0) } }), NOW)).toBeNull()
  })

  it('only acts in the lobby', () => {
    const room = { ...lobby({ host: { seenAt: seen(HOST_GONE_MS * 2) }, b: { seenAt: seen(0) } }), status: 'playing' }
    expect(pickNewHost(room, NOW)).toBeNull()
  })
})

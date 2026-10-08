// src/utils/multiplayerRoom.test.js
import { describe, it, expect, vi } from 'vitest'
import {
  getPlayerKey, getRoomContent, isRoomFormat, pickNewHost, rankRoomResults, HOST_GONE_MS,
  nextGameToPlay, overallStandings, roomForGame, roomGames,
} from './multiplayerRoom'
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

describe('multi-game rooms', () => {
  const flags = { id: 'flags', type: GAME_TYPES.FLAGS, difficulty: 'Moyen' }
  const border = { id: 'border_guess', type: GAME_TYPES.BORDER_GUESS, count: 5 }
  const room = { seed: SEED, games: [flags, border, flags], game: flags, gameIndex: 0, players: {} }

  it('reads rooms from before multi-game rooms as one game', () => {
    expect(roomGames({ game: flags })).toEqual([flags])
  })

  it('keeps the room seed for the first game and draws different countries for the others', () => {
    expect(roomForGame(room, 0).seed).toBe(SEED)
    const first = getRoomContent(flags, roomForGame(room, 0).seed)
    const third = getRoomContent(flags, roomForGame(room, 2).seed)
    expect(first.list).toEqual(getRoomContent(flags, SEED).list)
    expect(third.list).not.toEqual(first.list)
    expect(roomForGame(room, 1).game).toBe(border)
  })

  it('gives a challenge player their first unplayed game', () => {
    const challenge = { ...room, mode: 'challenge', status: 'playing' }
    const results = [{ playerId: 'me', gameIndex: 0 }, { playerId: 'other', gameIndex: 1 }]
    expect(nextGameToPlay(challenge, results, 'me')).toBe(1)
    expect(nextGameToPlay(challenge, [0, 1, 2].map((gameIndex) => ({ playerId: 'me', gameIndex })), 'me')).toBeNull()
  })

  it('gives a live player the launched game only', () => {
    const live = { ...room, mode: 'live', status: 'playing', gameIndex: 1 }
    expect(nextGameToPlay(live, [], 'me')).toBe(1)
    expect(nextGameToPlay(live, [{ playerId: 'me', gameIndex: 1 }], 'me')).toBeNull()
    expect(nextGameToPlay({ ...live, status: 'lobby' }, [], 'me')).toBeNull()
  })

  it('sums the points of each game into the overall standings', () => {
    const results = [
      { playerId: 'a', pseudo: 'A', gameIndex: 0, weightedScore: 90, elapsedTime: 10 },
      { playerId: 'b', pseudo: 'B', gameIndex: 0, weightedScore: 50, elapsedTime: 10 },
      { playerId: 'b', pseudo: 'B', gameIndex: 1, countriesSolved: 5, attempts: 0, elapsedTime: 10 },
      { playerId: 'a', pseudo: 'A', gameIndex: 1, countriesSolved: 2, attempts: 0, elapsedTime: 10 },
      { playerId: 'b', pseudo: 'B', gameIndex: 2, weightedScore: 10, elapsedTime: 10 },
    ]
    // a: 2 + 1 = 3 over 2 games; b: 1 + 2 + 1 = 4 over 3 games
    expect(overallStandings(room, results).map(({ playerId, points, played, rank }) => [playerId, points, played, rank]))
      .toEqual([['b', 4, 3, 1], ['a', 3, 2, 2]])
  })
})

describe('player secret', () => {
  it('is generated once and kept on the device', () => {
    localStorage.removeItem('mp_player_key')
    const key = getPlayerKey()
    expect(key).toMatch(/^[0-9a-f]{48}$/)
    expect(getPlayerKey()).toBe(key)
    expect(localStorage.getItem('mp_player_key')).toBe(key)
  })
})

describe('isRoomFormat', () => {
  it('opens current rooms and the ones from before the secrets, nothing else', () => {
    expect(isRoomFormat({ source: 'app2' })).toBe(true)
    expect(isRoomFormat({ source: 'app' })).toBe(true)
    expect(isRoomFormat({})).toBe(false)
    expect(isRoomFormat(null)).toBe(false)
  })
})

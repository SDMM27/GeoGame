import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useDuelElo, { duelGamesToRate } from './useDuelElo'
import { reportDuel } from '../utils/eloReport'

vi.mock('../utils/eloReport', () => ({ reportDuel: vi.fn() }))
vi.mock('../utils/multiplayerRoom', async () => {
  const games = (room) => (room.games?.length ? room.games : [room.game])
  return {
    roomGames: games,
    resultsForGame: (results, index) => results.filter((result) => (result.gameIndex ?? 0) === index),
  }
})

const room = (players, games = [{ type: 'FLAGS' }]) => ({ id: 'ABCD', games, players })
const duelists = { a: { pseudo: 'A', uid: 'ua' }, b: { pseudo: 'B', uid: 'ub' } }
const done = (...ids) => ids.map((playerId) => ({ playerId, gameIndex: 0 }))

beforeEach(() => vi.clearAllMocks())

describe('duelGamesToRate', () => {
  it('rates a game once both players have a result', () => {
    expect(duelGamesToRate(room(duelists), done('a', 'b'), 'a')).toEqual([0])
    expect(duelGamesToRate(room(duelists), done('a'), 'a')).toEqual([])
  })

  it('lists each finished game of a multi-game room', () => {
    const games = [{ type: 'FLAGS' }, { type: 'CAPITALS' }]
    const results = [...done('a', 'b'), { playerId: 'a', gameIndex: 1 }, { playerId: 'b', gameIndex: 1 }]
    expect(duelGamesToRate(room(duelists, games), results, 'b')).toEqual([0, 1])
  })

  it('ignores rooms that are not a duel of two signed-in players', () => {
    const results = done('a', 'b')
    expect(duelGamesToRate(room({ ...duelists, c: { pseudo: 'C', uid: 'uc' } }), results, 'a')).toEqual([])
    expect(duelGamesToRate(room({ a: duelists.a }), done('a'), 'a')).toEqual([])
    expect(duelGamesToRate(room({ a: duelists.a, b: { pseudo: 'B' } }), results, 'a')).toEqual([])
    expect(duelGamesToRate(room(duelists), results, 'spectator')).toEqual([])
  })
})

describe('useDuelElo', () => {
  it('reports each rated game with the room code', () => {
    renderHook(() => useDuelElo(room(duelists), done('a', 'b'), 'a'))
    expect(reportDuel).toHaveBeenCalledWith('ABCD', 0)
  })

  it('reports nothing before the second result', () => {
    renderHook(() => useDuelElo(room(duelists), done('a'), 'a'))
    expect(reportDuel).not.toHaveBeenCalled()
  })
})

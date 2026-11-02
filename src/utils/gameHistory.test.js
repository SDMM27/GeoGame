import { describe, expect, it, vi } from 'vitest'
import { GAME_TYPES } from './gameTypes'
import { DAILY_POOL } from './missions'
import { roomGameRecord } from './gameHistory'

vi.mock('../Firebase', () => ({ firestore: {} }))

const result = { weightedScore: 7, countriesSolved: 5, attempts: 2, elapsedTime: 1234, total: 10 }
const mission = (id) => DAILY_POOL.find((entry) => entry.id === id)

describe('roomGameRecord', () => {
  it('counts a survival game of a room for the survival and multi missions', () => {
    const record = roomGameRecord({ type: GAME_TYPES.SURVIVAL }, 'ABC234', result)
    expect(record).toEqual({ gameType: GAME_TYPES.SURVIVAL, mode: 'multi', roomCode: 'ABC234', score: 7, total: 10, elapsedTime: 1234 })
    expect(mission('survival_1').value([record])).toBe(1)
    expect(mission('multi_1').value([record])).toBe(1)
  })

  it('records the countries found of a Placement, Flags or Capitals game', () => {
    expect(roomGameRecord({ type: GAME_TYPES.FLAGS, difficulty: 'Difficile' }, 'ABC234', result)).toEqual({
      gameType: GAME_TYPES.FLAGS, mode: 'multi', roomCode: 'ABC234', score: 7, found: 5, total: 10, elapsedTime: 1234, difficulty: 'Difficile',
    })
  })

  it('records the countries found of a Border Guess or Country Clue game, without a score', () => {
    expect(roomGameRecord({ type: GAME_TYPES.BORDER_GUESS }, 'ABC234', result)).toEqual({
      gameType: GAME_TYPES.BORDER_GUESS, mode: 'multi', roomCode: 'ABC234', found: 5, total: 10, elapsedTime: 1234,
    })
  })

  it('records the answers of a Quiz game', () => {
    expect(roomGameRecord({ type: GAME_TYPES.QUIZ, quizDifficulty: 'Facile' }, 'ABC234', result)).toEqual({
      gameType: GAME_TYPES.QUIZ, mode: 'multi', roomCode: 'ABC234', score: 7, correct: 5, answered: 7, elapsedTime: 1234, difficulty: 'Facile',
    })
  })
})

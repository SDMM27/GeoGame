import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from './gameTypes'
import {
  CHALLENGE_RAMP,
  CHALLENGE_ROUNDS,
  CHALLENGE_ROUND_TYPES,
  challengeSeed,
  challengeShareGrid,
} from './dailyChallenge'
import { challengeRounds as rounds } from './dailyChallengeRounds'

describe('challengeSeed', () => {
  it('is stable for a day and differs from one day to the next', () => {
    expect(challengeSeed('2026-10-16')).toBe(challengeSeed('2026-10-16'))
    expect(challengeSeed('2026-10-16')).not.toBe(challengeSeed('2026-10-17'))
    expect(Number.isInteger(challengeSeed('2026-10-16'))).toBe(true)
  })
})

describe('the rounds of the day', () => {
  const day = rounds('2026-10-16')

  it('are the same for everybody', () => {
    const key = (list) => list.map((round) => `${round.type}:${round.country.properties.ADMIN}`)
    expect(key(rounds('2026-10-16'))).toEqual(key(day))
    expect(key(rounds('2026-10-17'))).not.toEqual(key(day))
  })

  it('are 12, 4 of each kind', () => {
    expect(day).toHaveLength(CHALLENGE_ROUNDS)
    for (const type of CHALLENGE_ROUND_TYPES) expect(day.filter((round) => round.type === type)).toHaveLength(4)
  })

  it('all ask about a different country', () => {
    for (const d of ['2026-10-16', '2026-10-17', '2026-11-02', '2027-01-01']) {
      const names = rounds(d).map((round) => round.country.properties.ADMIN)
      expect(new Set(names).size).toBe(CHALLENGE_ROUNDS)
    }
  })

  it('follow the ramp: 4 easy, 4 medium, 4 hard', () => {
    expect(day.map((round) => round.difficulty)).toEqual([
      ...Array(CHALLENGE_RAMP.Facile).fill('Facile'),
      ...Array(CHALLENGE_RAMP.Moyen).fill('Moyen'),
      ...Array(CHALLENGE_RAMP.Difficile).fill('Difficile'),
    ])
  })
})

describe('challengeShareGrid', () => {
  it('shows the kind and the result of each round, 4 per line', () => {
    const list = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS, GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS].map((type) => ({ type }))
    const grid = challengeShareGrid(list, ['correct', 'failed', 'correct', 'failed', null])
    expect(grid).toBe('🗺️✅ 🏳️❌ 🏛️✅ 🗺️❌\n🏳️❌')
  })
})

import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from './gameTypes'
import {
  CHALLENGE_RAMP,
  CHALLENGE_ROUNDS,
  CHALLENGE_ROUND_TYPES,
  CHALLENGE_WEEK_RAMPS,
  challengeLevel,
  challengeRamp,
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

  it('follow the ramp of their day of the week', () => {
    // 2026-10-19 is a Monday
    for (let i = 0; i < 7; i++) {
      const date = `2026-10-${19 + i}`
      const ramp = CHALLENGE_WEEK_RAMPS[i]
      const impossible = CHALLENGE_ROUNDS - ramp.Facile - ramp.Moyen - ramp.Difficile
      expect(rounds(date).map((round) => round.difficulty)).toEqual([
        ...Array(ramp.Facile).fill('Facile'),
        ...Array(ramp.Moyen).fill('Moyen'),
        ...Array(ramp.Difficile).fill('Difficile'),
        ...Array(impossible).fill('Impossible'),
      ])
    }
  })

  it('kept the old ramp before the weekly one: 4 easy, 4 medium, 4 hard', () => {
    expect(rounds('2026-10-18').map((round) => round.difficulty)).toEqual([
      ...Array(CHALLENGE_RAMP.Facile).fill('Facile'),
      ...Array(CHALLENGE_RAMP.Moyen).fill('Moyen'),
      ...Array(CHALLENGE_RAMP.Difficile).fill('Difficile'),
    ])
  })
})

describe('the level of the day', () => {
  it('goes from 1 on Monday to 7 on Sunday', () => {
    expect(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'].map(challengeLevel))
      .toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(challengeLevel('2026-10-30')).toBe(5)
    expect(challengeLevel('2027-01-03')).toBe(7)
  })

  it('is null before the weekly ramp or without a day', () => {
    expect(challengeLevel('2026-10-18')).toBeNull()
    expect(challengeLevel('')).toBeNull()
    expect(challengeRamp('2026-10-18')).toBe(CHALLENGE_RAMP)
  })

  it('gets harder every day of the week', () => {
    const hardness = (ramp) => ramp.Moyen + 2 * ramp.Difficile + 3 * (CHALLENGE_ROUNDS - ramp.Facile - ramp.Moyen - ramp.Difficile)
    for (let i = 1; i < 7; i++) expect(hardness(CHALLENGE_WEEK_RAMPS[i])).toBeGreaterThan(hardness(CHALLENGE_WEEK_RAMPS[i - 1]))
  })
})

describe('challengeShareGrid', () => {
  it('shows the kind and the result of each round, 4 per line', () => {
    const list = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS, GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS].map((type) => ({ type }))
    const grid = challengeShareGrid(list, ['correct', 'failed', 'correct', 'failed', null])
    expect(grid).toBe('🗺️✅ 🏳️❌ 🏛️✅ 🗺️❌\n🏳️❌')
  })
})

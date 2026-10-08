import { describe, expect, it } from 'vitest'
import {
  SURVIVAL_MAX_WAIT_MS,
  SURVIVAL_REVEAL_MS,
  furthestRound,
  isRoundDone,
  nextRoundStart,
  roundWaiting,
} from './survivalSync'

const START = 1_000_000
const player = (overrides) => ({ round: 2, roundDone: false, finished: false, lastSeen: START + 1000, ...overrides })

describe('isRoundDone', () => {
  it('counts an answered round, a later round and a player out of lives', () => {
    expect(isRoundDone(player({ roundDone: true }), 2)).toBe(true)
    expect(isRoundDone(player({ round: 3 }), 2)).toBe(true)
    expect(isRoundDone(player({ finished: true }), 2)).toBe(true)
    expect(isRoundDone(player(), 2)).toBe(false)
    expect(isRoundDone(player({ round: 1, roundDone: true }), 2)).toBe(false)
  })
})

describe('nextRoundStart', () => {
  const timing = { round: 2, startAt: START, timerMs: 30000 }

  it('starts the next round once every player still in the game is done', () => {
    const entries = [
      player({ roundDone: true, lastSeen: START + 4000 }),
      player({ roundDone: true, lastSeen: START + 9000 }),
      // Out of lives two rounds ago: not waited for
      player({ round: 0, finished: true, lastSeen: START - 50000 }),
      // Playing on their own (late): not waited for
      { found: 3, lives: 2, lastSeen: START },
    ]
    expect(nextRoundStart(entries, timing)).toBe(START + 9000 + SURVIVAL_REVEAL_MS)
    expect(roundWaiting(entries, 2)).toEqual({ done: 2, total: 2 })
  })

  it('waits for the slowest player until the round is out of time', () => {
    const entries = [player({ roundDone: true, lastSeen: START + 4000 }), player()]
    expect(nextRoundStart(entries, timing)).toBe(START + 30000 + SURVIVAL_REVEAL_MS)
    expect(roundWaiting(entries, 2)).toEqual({ done: 1, total: 2 })
  })

  it('waits for a write the server has not dated yet', () => {
    expect(nextRoundStart([player({ roundDone: true, lastSeen: null })], timing)).toBe(START + 30000 + SURVIVAL_REVEAL_MS)
  })

  it('stops waiting for a silent player after a while without a timer', () => {
    expect(nextRoundStart([player()], { ...timing, timerMs: 0 })).toBe(START + SURVIVAL_MAX_WAIT_MS + SURVIVAL_REVEAL_MS)
  })
})

describe('furthestRound', () => {
  it('finds the round the others reached, to catch up', () => {
    expect(furthestRound([player({ roundAt: 5 }), player({ round: 4, roundAt: 9 }), { found: 1 }])).toEqual({ round: 4, startAt: 9 })
    expect(furthestRound([{ found: 1 }])).toBe(null)
  })
})

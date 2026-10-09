import { describe, expect, it } from 'vitest'
import {
  othersStillIn,
  spectatorRows,
  lastSurvivorRound,
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

describe('lastSurvivorRound', () => {
  const me = { id: 'me', round: 4, roundDone: false, finished: false }

  it('waits while another player is still in the game', () => {
    const entries = [me, { id: 'a', round: 4, finished: true }, { id: 'b', round: 4, finished: false }]
    expect(lastSurvivorRound(entries, 'me')).toBe(null)
  })

  it('gives the round where the last other player ran out of lives', () => {
    const entries = [me, { id: 'a', round: 2, finished: true }, { id: 'b', round: 4, finished: true }]
    expect(lastSurvivorRound(entries, 'me')).toBe(4)
  })

  it('ignores players who play on their own (no round) and a room played alone', () => {
    expect(lastSurvivorRound([me, { id: 'late', finished: true }], 'me')).toBe(null)
    expect(lastSurvivorRound([me], 'me')).toBe(null)
    expect(lastSurvivorRound([{ id: 'a', round: 1, finished: true }], 'me')).toBe(1)
  })
})

describe('spectating', () => {
  const entries = [
    { id: 'me', round: 2, finished: true, lives: 0 },
    { id: 'a', round: 4, roundDone: true, finished: false, lives: 1 },
    { id: 'b', round: 4, roundDone: false, finished: false, lives: 3 },
    { id: 'c', round: 3, finished: true, lives: 0 },
    { id: 'late', finished: false, lives: 2 },
  ]
  const names = { me: 'Moi', a: 'Ana', b: 'Bob', c: 'Cyd' }

  it('knows when someone else is still in the game', () => {
    expect(othersStillIn(entries, 'me')).toBe(true)
    expect(othersStillIn(entries.filter((entry) => entry.id !== 'a' && entry.id !== 'b'), 'me')).toBe(false)
  })

  it('lists the players still in first, then the others by the round they went out on', () => {
    expect(spectatorRows(entries, names, 4)).toEqual([
      { id: 'b', pseudo: 'Bob', lives: 3, out: false, outRound: null, answered: false },
      { id: 'a', pseudo: 'Ana', lives: 1, out: false, outRound: null, answered: true },
      { id: 'c', pseudo: 'Cyd', lives: 0, out: true, outRound: 3, answered: false },
      { id: 'me', pseudo: 'Moi', lives: 0, out: true, outRound: 2, answered: false },
    ])
  })
})

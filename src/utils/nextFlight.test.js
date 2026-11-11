import { describe, expect, it } from 'vitest'
import { nextFlight } from './nextFlight'

const FLIGHTS = [
  { type: 'DAILY_CHALLENGE', daily: true },
  { type: 'BORDER_GUESS', daily: true },
  { type: 'FLAGS', daily: false },
  { type: 'CAPITALS', daily: false },
]

describe('nextFlight', () => {
  it('offers the first daily not played today', () => {
    expect(nextFlight(FLIGHTS, { dailyStatus: { DAILY_CHALLENGE: 'won' }, playedToday: [] })).toBe(FLIGHTS[1])
  })

  it('rotates through the dailies left, one per find', () => {
    expect(nextFlight(FLIGHTS, { dailyStatus: {}, turn: 1 })).toBe(FLIGHTS[1])
    expect(nextFlight(FLIGHTS, { dailyStatus: {}, turn: 2 })).toBe(FLIGHTS[0])
  })

  it('offers a game not played today once every daily is done', () => {
    const dailyStatus = { DAILY_CHALLENGE: 'played', BORDER_GUESS: 'won' }
    expect(nextFlight(FLIGHTS, { dailyStatus, playedToday: ['FLAGS'] })).toBe(FLIGHTS[3])
  })

  it('returns null when everything was played today', () => {
    const dailyStatus = { DAILY_CHALLENGE: 'played', BORDER_GUESS: 'won' }
    expect(nextFlight(FLIGHTS, { dailyStatus, playedToday: ['FLAGS', 'CAPITALS'] })).toBeNull()
  })

  it('treats everything as to do when nothing is known (visitor)', () => {
    expect(nextFlight(FLIGHTS)).toBe(FLIGHTS[0])
  })
})

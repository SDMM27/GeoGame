import { describe, expect, it, vi } from 'vitest'

vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn() }))

import { leagueView, podiumResult, previousWeekKey } from './league'

// Wednesday 14 October 2026 in Paris: the week is 2026-W42.
const MONDAY = Date.parse('2026-10-12T10:00:00Z')
const WEDNESDAY = Date.parse('2026-10-14T10:00:00Z')
const SUNDAY = Date.parse('2026-10-18T10:00:00Z')

const player = (uid, points, extra = {}) => ({ uid, name: uid.toUpperCase(), points, played: 2, golds: 0, reward: 0, ...extra })
const current = { week: '2026-W42', players: [player('a', 20), player('b', 12), player('c', 12), player('d', 3)] }
const last = { week: '2026-W41', players: [player('x', 40, { reward: 5 }), player('y', 30, { reward: 3 }), player('me', 20, { reward: 2 }), player('z', 5)] }

describe('leagueView', () => {
  it('ranks the world board with the top 20 only', () => {
    const many = { week: '2026-W42', players: Array.from({ length: 30 }, (_, index) => player(`p${index}`, 100 - index)) }
    const { world } = leagueView({ current: many, last: null, uid: null, now: WEDNESDAY })
    expect(world).toHaveLength(20)
    expect(world[0]).toMatchObject({ uid: 'p0', rank: 1, points: 100 })
    expect(world[19].rank).toBe(20)
  })

  it('gives the rank of the player and the points needed to pass the one above', () => {
    expect(leagueView({ current, last: null, uid: 'c', now: WEDNESDAY }).me).toEqual({ rank: 3, points: 12, played: 2, ahead: { name: 'B', gap: 1 } })
    expect(leagueView({ current, last: null, uid: 'd', now: WEDNESDAY }).me.ahead).toEqual({ name: 'C', gap: 10 })
  })

  it('has nobody to pass at rank 1, and no rank for a player who did not play', () => {
    expect(leagueView({ current, last: null, uid: 'a', now: WEDNESDAY }).me).toMatchObject({ rank: 1, ahead: null })
    expect(leagueView({ current, last: null, uid: 'nobody', now: WEDNESDAY }).me).toBeNull()
    expect(leagueView({ current, last: null, uid: null, now: WEDNESDAY }).me).toBeNull()
  })

  it('ranks the friends among themselves, with those who did not play last', () => {
    const friends = [{ uid: 'd', username: 'D' }, { uid: 'ghost', username: 'Ghost' }, { uid: 'b', username: 'B' }]
    const { friendsBoard } = leagueView({ current, last: null, uid: 'me', username: 'Me', friends, now: WEDNESDAY })
    expect(friendsBoard.map(({ uid, rank, points, isMe }) => [uid, rank, points, isMe])).toEqual([
      ['b', 1, 12, false],
      ['d', 2, 3, false],
      ['ghost', 3, 0, false],
      ['me', 4, 0, true],
    ])
  })

  it('puts the player among the friends at their rank', () => {
    const friends = [{ uid: 'a', username: 'A' }, { uid: 'd', username: 'D' }]
    const { friendsBoard } = leagueView({ current, last: null, uid: 'c', friends, now: WEDNESDAY })
    expect(friendsBoard.map((entry) => [entry.uid, entry.rank])).toEqual([['a', 1], ['c', 2], ['d', 3]])
  })

  it('reports the result of the last week, with the podium', () => {
    const { lastResult } = leagueView({ current, last, uid: 'me', now: WEDNESDAY })
    expect(lastResult).toMatchObject({ week: '2026-W41', rank: 3, points: 20, reward: 2 })
    expect(lastResult.podium.map((entry) => entry.uid)).toEqual(['x', 'y', 'me'])
  })

  it('has no rank in the last week when the player did not play it, and no result without a last week', () => {
    expect(leagueView({ current, last, uid: 'nobody', now: WEDNESDAY }).lastResult).toMatchObject({ rank: null, points: 0, reward: 0 })
    expect(leagueView({ current, last: null, uid: 'a', now: WEDNESDAY }).lastResult).toBeNull()
  })

  it('counts the days left in the week, today included', () => {
    expect(leagueView({ current, last, uid: 'a', now: MONDAY }).daysLeft).toBe(7)
    expect(leagueView({ current, last, uid: 'a', now: WEDNESDAY }).daysLeft).toBe(5)
    expect(leagueView({ current, last, uid: 'a', now: SUNDAY }).daysLeft).toBe(1)
  })

  it('ignores the board of a past week until the server writes the new one', () => {
    const { world, me } = leagueView({ current: { ...current, week: '2026-W41' }, last: null, uid: 'a', now: WEDNESDAY })
    expect(world).toEqual([])
    expect(me).toBeNull()
  })

  it('works without any document', () => {
    expect(leagueView({ current: null, last: null, uid: 'a', now: WEDNESDAY })).toMatchObject({ world: [], me: null, friendsBoard: [], lastResult: null, daysLeft: 5 })
  })
})

describe('previousWeekKey', () => {
  it('is the week before the one of `now`, whatever the day', () => {
    expect(previousWeekKey(MONDAY)).toBe('2026-W41')
    expect(previousWeekKey(WEDNESDAY)).toBe('2026-W41')
    expect(previousWeekKey(SUNDAY)).toBe('2026-W41')
  })

  it('uses the Paris day and crosses the year', () => {
    // 21:30Z is Sunday 23:30 in Paris (still W42), 22:30Z is Monday 00:30.
    expect(previousWeekKey(Date.parse('2026-10-18T21:30:00Z'))).toBe('2026-W41')
    expect(previousWeekKey(Date.parse('2026-10-18T22:30:00Z'))).toBe('2026-W42')
    expect(previousWeekKey(Date.parse('2027-01-05T10:00:00Z'))).toBe('2026-W53')
  })
})

describe('podiumResult', () => {
  it('gives the rank, points and reward of a paid podium finish', () => {
    expect(podiumResult(last, 'x')).toEqual({ week: '2026-W41', rank: 1, points: 40, reward: 5 })
    expect(podiumResult(last, 'me')).toEqual({ week: '2026-W41', rank: 3, points: 20, reward: 2 })
  })

  it('is null off the podium, unpaid, unranked, signed out or without a last week', () => {
    const unpaid = { week: '2026-W41', players: [player('x', 40, { reward: 0 }), player('y', 30, { reward: 3 })] }
    const deep = { week: '2026-W41', players: [player('a', 9, { reward: 1 }), player('b', 8, { reward: 1 }), player('c', 7, { reward: 1 }), player('d', 6, { reward: 1 })] }
    expect(podiumResult(unpaid, 'x')).toBeNull()
    expect(podiumResult(deep, 'd')).toBeNull()
    expect(podiumResult(last, 'z')).toBeNull()
    expect(podiumResult(last, 'nobody')).toBeNull()
    expect(podiumResult(last, null)).toBeNull()
    expect(podiumResult(null, 'x')).toBeNull()
  })
})

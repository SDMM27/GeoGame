import { describe, it, expect } from 'vitest'
import { computeStats, computeStreaks, formatPlayTime, previousDayKey } from './profileStats'
import { computeAchievements } from './achievements'
import { splitFriendships } from './friends'

describe('previousDayKey', () => {
  it('crosses months and years', () => {
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31')
  })
})

describe('computeStreaks', () => {
  it('counts the best run and the current one ending today', () => {
    const keys = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07']
    expect(computeStreaks(keys, '2026-10-07')).toEqual({ current: 3, best: 3 })
  })

  it('keeps the current streak alive until today is played', () => {
    expect(computeStreaks(['2026-10-05', '2026-10-06'], '2026-10-07')).toEqual({ current: 2, best: 2 })
  })

  it('breaks the current streak after a missed day', () => {
    expect(computeStreaks(['2026-10-04', '2026-10-05'], '2026-10-07')).toEqual({ current: 0, best: 2 })
  })

  it('ignores several games on the same day', () => {
    expect(computeStreaks(['2026-10-07', '2026-10-07', '2026-10-06'], '2026-10-07')).toEqual({ current: 2, best: 2 })
  })

  it('handles no games', () => {
    expect(computeStreaks([], '2026-10-07')).toEqual({ current: 0, best: 0 })
  })
})

const at = (iso) => Date.parse(iso)

const games = [
  { gameType: 'FLAGS', mode: 'standard', score: 120, found: 30, total: 40, elapsedTime: 90000, difficulty: 'Moyen', playedAt: at('2026-10-07T10:00:00Z') },
  { gameType: 'FLAGS', mode: 'standard', score: 200, found: 45, total: 50, elapsedTime: 120000, difficulty: 'Hardcore', playedAt: at('2026-10-06T10:00:00Z') },
  { gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: '2026-10-07', solved: true, attempts: 3, elapsedTime: 30000, playedAt: at('2026-10-07T09:00:00Z') },
  { gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: '2026-10-06', solved: true, attempts: 1, elapsedTime: 10000, playedAt: at('2026-10-06T09:00:00Z') },
  { gameType: 'QUIZ', mode: 'daily', dailyKey: '2026-10-07', solved: false, attempts: 5, playedAt: at('2026-10-07T08:00:00Z') },
]

describe('computeStats', () => {
  const stats = computeStats(games, '2026-10-07')

  it('sums games, time and countries', () => {
    expect(stats.total).toBe(5)
    expect(stats.totalTime).toBe(250000)
    expect(stats.countriesFound).toBe(75)
    expect(stats.daysPlayed).toBe(2)
  })

  it('keeps the best score and the fewest attempts of solved games', () => {
    expect(stats.byGame.FLAGS).toMatchObject({ played: 2, bestScore: 200 })
    expect(stats.byGame.BORDER_GUESS).toMatchObject({ played: 2, wins: 2, dailies: 2, bestAttempts: 1 })
    expect(stats.byGame.QUIZ).toMatchObject({ played: 1, wins: 0, bestAttempts: null })
  })

  it('tracks dailies, today and the streak', () => {
    expect(stats.dailyPlayed).toBe(3)
    expect(stats.dailyWins).toBe(2)
    expect(Object.keys(stats.todayDaily).sort()).toEqual(['BORDER_GUESS', 'QUIZ'])
    expect(stats.streak).toEqual({ current: 2, best: 2 })
    expect(stats.favoriteGame).toBe('FLAGS')
  })
})

describe('computeAchievements', () => {
  it('unlocks from the history and reports progress', () => {
    const stats = computeStats(games, '2026-10-07')
    const list = computeAchievements({ stats, games, friendsCount: 0 })
    const byId = Object.fromEntries(list.map((item) => [item.id, item]))
    expect(byId.first_game.unlocked).toBe(true)
    expect(byId.first_try.unlocked).toBe(true)
    expect(byId.hardcore.unlocked).toBe(true)
    expect(byId.friend.unlocked).toBe(false)
    expect(byId.daily_sweep.progress).toBe(2)
    expect(byId.games_50).toMatchObject({ progress: 5, unlocked: false })
    expect(list[0].unlocked).toBe(true)
  })
})

describe('formatPlayTime', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatPlayTime(2 * 3600000 + 5 * 60000)).toBe('2 h 05')
    expect(formatPlayTime(12 * 60000)).toBe('12 min')
    expect(formatPlayTime(45000)).toBe('45 s')
  })
})

describe('splitFriendships', () => {
  it('sorts friendships into friends, incoming and outgoing requests', () => {
    const docs = [
      { id: 'a_me', users: ['a', 'me'], usernames: { a: 'Zoé', me: 'Moi' }, requester: 'a', status: 'pending' },
      { id: 'b_me', users: ['b', 'me'], usernames: { b: 'Bob', me: 'Moi' }, requester: 'me', status: 'pending' },
      { id: 'c_me', users: ['c', 'me'], usernames: { c: 'Alice', me: 'Moi' }, requester: 'c', status: 'accepted' },
    ]
    expect(splitFriendships(docs, 'me').map(({ uid, username, status }) => [uid, username, status])).toEqual([
      ['c', 'Alice', 'friend'],
      ['b', 'Bob', 'outgoing'],
      ['a', 'Zoé', 'incoming'],
    ])
  })
})

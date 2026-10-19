import { describe, expect, it } from 'vitest'
import {
  BONUS_ID,
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  DAILY_POOL,
  GAMES_PER_DAY,
  GAME_XP,
  MISSIONS_PER_PERIOD,
  WEEKLY_POOL,
  dailyMissions,
  grantXp,
  levelCost,
  levelOf,
  missionDayAt,
  missionsAt,
  readXp,
  weekDays,
  weekKeyOf,
  weeklyMissions,
} from './missions'
import { DAILY_BONUS_FRAGMENTS, DAILY_MISSION_FRAGMENTS, WEEKLY_MISSION_FRAGMENTS } from './flagCollection'

// Monday 2026-10-19, 12:00 in Paris (UTC+2).
const NOW = Date.UTC(2026, 9, 19, 10)
const HOUR = 60 * 60 * 1000

const game = (overrides = {}) => ({ gameType: 'FLAGS', mode: 'standard', found: 5, total: 20, playedAt: NOW - HOUR, ...overrides })

describe('periods', () => {
  it('uses the day in Paris', () => {
    expect(missionDayAt(Date.UTC(2026, 9, 18, 21, 59))).toBe('2026-10-18')
    expect(missionDayAt(Date.UTC(2026, 9, 18, 22, 1))).toBe('2026-10-19')
  })

  it('numbers ISO weeks, Monday to Sunday', () => {
    expect(weekKeyOf('2026-10-19')).toBe('2026-W43')
    expect(weekKeyOf('2026-10-25')).toBe('2026-W43')
    expect(weekKeyOf('2026-10-26')).toBe('2026-W44')
    expect(weekKeyOf('2027-01-01')).toBe('2026-W53')
    expect(weekKeyOf('2025-12-29')).toBe('2026-W01')
    expect(weekDays('2026-10-22')).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
  })
})

describe('missions', () => {
  it('draws the same distinct missions for everyone on a day or a week, and other ones on other days', () => {
    const today = dailyMissions('2026-10-19')
    expect(today).toHaveLength(MISSIONS_PER_PERIOD)
    expect(new Set(today.map((mission) => mission.id)).size).toBe(MISSIONS_PER_PERIOD)
    expect(dailyMissions('2026-10-19')).toEqual(today)
    const days = Array.from({ length: 10 }, (_, index) => dailyMissions(`2026-11-${String(index + 1).padStart(2, '0')}`).map((mission) => mission.id).join())
    expect(new Set(days).size).toBeGreaterThan(1)
    expect(weeklyMissions('2026-W43')).toHaveLength(MISSIONS_PER_PERIOD)
  })

  it('has unique ids across both pools', () => {
    const ids = [...DAILY_POOL, ...WEEKLY_POOL].map((mission) => mission.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain(BONUS_ID)
  })

  it("counts today's games for the daily missions and the week's for the weekly ones", () => {
    const games = [
      game(),
      game({ playedAt: NOW - 20 * HOUR }), // Sunday: last week
      game({ playedAt: NOW + 2 * 24 * HOUR - HOUR }), // never happens, but outside today
    ]
    const result = missionsAt(games, NOW)
    expect(result.day).toBe('2026-10-19')
    expect(result.week).toBe('2026-W43')
    expect(result.todayGames).toBe(1)
    const pool = DAILY_POOL.find((mission) => mission.id === 'flags_20')
    expect(pool.value([game(), game({ gameType: 'CAPITALS' })])).toBe(5)
  })

  it('caps the progress at the target', () => {
    const many = Array.from({ length: 30 }, () => game())
    for (const entry of missionsAt(many, NOW).daily) expect(entry.progress).toBeLessThanOrEqual(entry.mission.target)
  })
})

describe('levels', () => {
  it('needs more XP for each level', () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, needed: levelCost(1) })
    expect(levelOf(levelCost(1) - 1).level).toBe(1)
    expect(levelOf(levelCost(1)).level).toBe(2)
    expect(levelOf(levelCost(1) + levelCost(2) + 7)).toEqual({ level: 3, into: 7, needed: levelCost(3) })
    expect(levelOf(-5).level).toBe(1)
  })
})

describe('XP', () => {
  const fresh = () => readXp({}, '2026-10-19', '2026-W43')

  it('reads a missing or malformed state as zero, and forgets the paid missions of past periods', () => {
    expect(readXp({ xp: { total: 'lots' } }, '2026-10-19', '2026-W43')).toMatchObject({ total: 0, level: 1, dayMissions: [], dayGames: 0 })
    const stored = { xp: { total: 500, level: 4, day: '2026-10-18', dayMissions: ['play_3'], dayGames: 4, week: '2026-W43', weekMissions: ['week_play_20'] } }
    expect(readXp(stored, '2026-10-19', '2026-W43')).toMatchObject({ total: 500, dayMissions: [], dayGames: 0, weekMissions: ['week_play_20'] })
  })

  it('pays each game up to the daily cap, once', () => {
    const games = Array.from({ length: GAMES_PER_DAY + 5 }, () => game({ gameType: 'QUIZ', mode: 'infinite', found: undefined }))
    const first = grantXp(fresh(), games.slice(0, 2), NOW)
    expect(first.state.dayGames).toBe(2)
    const second = grantXp(first.state, games, NOW)
    expect(second.state.dayGames).toBe(GAMES_PER_DAY)
    expect(second.gained).toBeGreaterThanOrEqual((GAMES_PER_DAY - 2) * GAME_XP)
    expect(grantXp(second.state, games, NOW).gained).toBe(0)
  })

  it('pays each mission done once, and the bonus when the three are done', () => {
    // Enough games of every kind to finish any daily mission.
    const games = [
      ...Array.from({ length: 3 }, () => game({ mode: 'daily', solved: true, gameType: 'DAILY_CHALLENGE', dailyKey: '2026-10-19' })),
      game({ gameType: 'FLAGS', found: 20, total: 20 }),
      game({ gameType: 'PLACEMENT', found: 20, total: 20, mode: 'ascension' }),
      game({ gameType: 'CAPITALS', found: 15, total: 15 }),
      game({ gameType: 'SURVIVAL', mode: 'survival', found: undefined }),
    ]
    const result = grantXp(fresh(), games, NOW)
    const daily = missionsAt(games, NOW).daily
    expect(daily.every((entry) => entry.done)).toBe(true)
    expect(result.state.dayMissions).toEqual([...daily.map((entry) => entry.mission.id), BONUS_ID])
    expect(result.gained).toBeGreaterThanOrEqual(MISSIONS_PER_PERIOD * DAILY_MISSION_XP + DAILY_BONUS_XP + games.length * GAME_XP)
    expect(result.levelUp).toBe(true)
    expect(result.state.level).toBe(levelOf(result.state.total).level)
    expect(grantXp(result.state, games, NOW).gained).toBe(0)
    // Fragments come with the missions and the bonus, not with the games, and are paid once.
    // (The same games may also finish weekly missions, which pay their own.)
    const weekly = result.state.weekMissions.filter((id) => id !== BONUS_ID).length
    expect(result.fragments).toBe(MISSIONS_PER_PERIOD * DAILY_MISSION_FRAGMENTS + DAILY_BONUS_FRAGMENTS + weekly * WEEKLY_MISSION_FRAGMENTS)
    expect(grantXp(result.state, games, NOW).fragments).toBe(0)
  })

  it('pays no fragment for games alone', () => {
    expect(grantXp(fresh(), [game(), game()], NOW)).toMatchObject({ fragments: 0 })
  })
})

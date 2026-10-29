import { describe, expect, it } from 'vitest'
import {
  BONUS_ID,
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  DAILY_MISSIONS,
  DAILY_POOL,
  GAMES_PER_DAY,
  GAME_XP,
  WEEKLY_BONUS_XP,
  WEEKLY_MISSIONS,
  WEEKLY_MISSIONS_BY_TIER,
  WEEKLY_POOL,
  WEEKLY_TIERS,
  CHALLENGE_WON_SCORE,
  DAILY_TIERS,
  advanceStreak,
  dailiesProgress,
  dailyDays,
  dailyMissions,
  grantXp,
  isDailyWon,
  levelCost,
  levelOf,
  missionDayAt,
  missionsAt,
  nextStreakReward,
  readXp,
  seedStreak,
  streakFromDays,
  streakNow,
  weekDays,
  weekKeyOf,
  weeklyMissions,
} from './missions'
import { GAME_TYPES } from './gameTypes'
import {
  DAILIES_ALL_FRAGMENTS,
  DAILIES_WON_FRAGMENTS,
  DAILY_BONUS_FRAGMENTS,
  DAILY_MISSION_FRAGMENTS,
  LEVEL_UP_FRAGMENTS,
  STREAK_WEEK_FRAGMENTS,
  WEEKLY_BONUS_FRAGMENTS,
  streakFragments,
} from './flagCollection'

// Monday 2026-10-19, 12:00 in Paris (UTC+2).
const NOW = Date.UTC(2026, 9, 19, 10)
const HOUR = 60 * 60 * 1000

const game = (overrides = {}) => ({ gameType: 'FLAGS', mode: 'standard', found: 5, total: 20, playedAt: NOW - HOUR, ...overrides })

// Games finishing any mission of the pools, all played today: every game type as a solved daily on 7 different keys,
// plus survival, hardcore, missing flag, ascension, multiplayer and infinite quiz games.
const everything = () => [
  ...Array.from({ length: 36 }, (_, index) =>
    game({ mode: 'daily', solved: true, gameType: Object.values(GAME_TYPES)[index % 12], score: 12, found: 40, total: 40, difficulty: 'Difficile', dailyKey: `2026-10-${19 + (index % 7)}` }),
  ),
  ...Array.from({ length: 6 }, () => game({ gameType: 'SURVIVAL', mode: 'survival', found: undefined })),
  ...Array.from({ length: 4 }, () => game({ gameType: 'HARDCORE', found: undefined })),
  ...Array.from({ length: 4 }, () => game({ gameType: 'MISSING_FLAG', found: undefined })),
  ...Array.from({ length: 4 }, () => game({ gameType: 'PLACEMENT', mode: 'ascension', found: 20, total: 20 })),
  ...Array.from({ length: 4 }, () => game({ mode: 'multi' })),
  ...Array.from({ length: 2 }, () => game({ gameType: 'QUIZ', mode: 'infinite', found: undefined })),
  ...Array.from({ length: 7 }, (_, index) =>
    game({ gameType: 'COUNTRY_OF_DAY', mode: 'daily', solved: true, errors: 0, score: 400, found: undefined, dailyKey: `2026-10-${19 + index}` }),
  ),
]

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
  it('keeps the draw of the week the Country of the Day came out, and offers its mission from the next one', () => {
    const ids = (week) => weeklyMissions(week).map((mission) => mission.id)
    expect(ids('2026-W44')).toEqual(['week_found_200', 'week_challenge_3', 'week_hardcore_3', 'week_daily_wins_10', 'week_types_10'])
    const later = Array.from({ length: 20 }, (_, i) => ids(`2027-W${String(i + 1).padStart(2, '0')}`)).flat()
    expect(later).toContain('week_country_of_day_5')
  })

  it('never draws a mission about a hidden game', () => {
    for (let day = 1; day <= 28; day += 1) {
      const key = `2026-11-${String(day).padStart(2, '0')}`
      const drawn = [...dailyMissions(key), ...weeklyMissions(key)]
      expect(drawn.some((mission) => mission.game === GAME_TYPES.QUIZ)).toBe(false)
    }
  })

  it('draws the same distinct missions for everyone on a day or a week, and other ones on other days', () => {
    const today = dailyMissions('2026-10-19')
    expect(today).toHaveLength(DAILY_MISSIONS)
    expect(new Set(today.map((mission) => mission.id)).size).toBe(DAILY_MISSIONS)
    expect(dailyMissions('2026-10-19')).toEqual(today)
    const days = Array.from({ length: 10 }, (_, index) => dailyMissions(`2026-11-${String(index + 1).padStart(2, '0')}`).map((mission) => mission.id).join())
    expect(new Set(days).size).toBeGreaterThan(1)
  })

  it('draws 2 easy, 2 medium and 1 hard distinct weekly missions, in that order, the same for everyone', () => {
    expect(WEEKLY_MISSIONS).toBe(5)
    const week = weeklyMissions('2026-W43')
    expect(week.map((mission) => mission.tier)).toEqual(['easy', 'easy', 'medium', 'medium', 'hard'])
    expect(new Set(week.map((mission) => mission.id)).size).toBe(WEEKLY_MISSIONS)
    expect(weeklyMissions('2026-W43')).toEqual(week)
    const weeks = Array.from({ length: 20 }, (_, index) => weeklyMissions(`2026-W${String(index + 1).padStart(2, '0')}`).map((mission) => mission.id).join())
    expect(new Set(weeks).size).toBeGreaterThan(1)
  })

  it('has enough weekly missions in each tier, each with a tier reward', () => {
    expect(Object.keys(WEEKLY_TIERS)).toEqual(['easy', 'medium', 'hard'])
    for (const [tier, size] of Object.entries(WEEKLY_MISSIONS_BY_TIER)) {
      expect(WEEKLY_POOL.filter((mission) => mission.tier === tier).length).toBeGreaterThanOrEqual(size)
    }
    expect(WEEKLY_POOL.every((mission) => WEEKLY_TIERS[mission.tier] && mission.emoji && mission.icon)).toBe(true)
    expect(WEEKLY_TIERS).toEqual({ easy: { xp: 150, fragments: 1 }, medium: { xp: 250, fragments: 2 }, hard: { xp: 400, fragments: 3 } })
    expect(WEEKLY_POOL.map((mission) => [mission.id, mission.tier])).toEqual(
      expect.arrayContaining([['week_found_500', 'medium'], ['week_daily_days_7', 'hard'], ['week_daily_wins_20', 'hard']]),
    )
  })

  it('has unique ids across both pools', () => {
    const ids = [...DAILY_POOL, ...WEEKLY_POOL].map((mission) => mission.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain(BONUS_ID)
  })

  it('gives every mission a family and never draws two of the same family', () => {
    expect([...DAILY_POOL, ...WEEKLY_POOL].every((mission) => typeof mission.family === 'string' && mission.family)).toBe(true)
    const pad = (value) => String(value).padStart(2, '0')
    for (let index = 0; index < 200; index += 1) {
      const day = missionDayAt(Date.UTC(2026, 0, 1) + index * 24 * 60 * 60 * 1000)
      const daily = dailyMissions(day)
      expect(daily).toHaveLength(DAILY_MISSIONS)
      expect(new Set(daily.map((mission) => mission.family)).size, day).toBe(DAILY_MISSIONS)
      const week = weeklyMissions(`${2026 + Math.floor(index / 53)}-W${pad((index % 53) + 1)}`)
      expect(week.map((mission) => mission.tier), `week ${index}`).toEqual(['easy', 'easy', 'medium', 'medium', 'hard'])
      expect(new Set(week.map((mission) => mission.family)).size, `week ${index}`).toBe(WEEKLY_MISSIONS)
    }
  })

  it('computes the progress of the new missions', () => {
    const find = (id) => [...DAILY_POOL, ...WEEKLY_POOL].find((mission) => mission.id === id)
    const value = (id, games) => find(id).value(games)
    const daily = (gameType, overrides = {}) => game({ gameType, mode: 'daily', dailyKey: '2026-10-19', ...overrides })

    expect(value('play_5', [game(), game(), game()])).toBe(3)
    expect(value('challenge_10', [daily('DAILY_CHALLENGE', { score: 9 }), daily('QUIZ', { score: 12 })])).toBe(0)
    expect(value('challenge_10', [daily('DAILY_CHALLENGE', { score: 10 })])).toBe(1)
    expect(value('week_challenge_10', [daily('DAILY_CHALLENGE', { score: 12 })])).toBe(1)
    for (const [id, gameType] of [['border_guess', 'BORDER_GUESS'], ['country_clue', 'COUNTRY_CLUE'], ['daily_quiz', 'QUIZ'], ['ranking', 'RANKING'], ['voyage', 'VOYAGE_VOYAGE']]) {
      expect(value(id, [game({ gameType, mode: 'standard' }), daily('FLAGS')]), id).toBe(0)
      expect(value(id, [daily(gameType)]), id).toBe(1)
    }
    expect(value('quiz_infinite_1', [daily('QUIZ'), game({ gameType: 'QUIZ', mode: 'infinite' })])).toBe(1)
    expect(value('missing_flag_1', [game({ gameType: 'MISSING_FLAG' }), game()])).toBe(1)
    expect(value('week_missing_flag_3', [game({ gameType: 'MISSING_FLAG' }), game({ gameType: 'MISSING_FLAG' })])).toBe(2)
    expect(value('hardcore_1', [game({ gameType: 'HARDCORE' }), game({ difficulty: 'Hardcore' })])).toBe(1)
    expect(value('week_hardcore_3', [game({ gameType: 'HARDCORE' }), game({ gameType: 'HARDCORE' })])).toBe(2)
    expect(value('multi_1', [game({ mode: 'multi' }), game()])).toBe(1)
    expect(value('week_multi_3', [game({ mode: 'multi' }), game({ mode: 'multi', gameType: 'SURVIVAL' }), game()])).toBe(2)
    expect(value('week_survival_5', [game({ gameType: 'SURVIVAL', mode: 'survival' }), game()])).toBe(1)
    expect(value('found_50', [game({ found: 30 }), game({ gameType: 'QUIZ', found: undefined }), game({ found: 25 })])).toBe(55)
    expect(value('week_found_1000', [game({ found: 30 }), game({ found: 25 })])).toBe(55)
    expect(value('week_flags_60', [game({ found: 30 }), game({ gameType: 'CAPITALS', found: 25 })])).toBe(30)
    expect(value('week_placement_60', [game({ gameType: 'PLACEMENT', found: 12 }), game({ found: 25 })])).toBe(12)
    expect(value('week_capitals_40', [game({ gameType: 'CAPITALS', found: 12 }), game({ found: 25 })])).toBe(12)
    expect(
      value('week_challenge_3', [
        daily('DAILY_CHALLENGE', { dailyKey: '2026-10-19' }),
        daily('DAILY_CHALLENGE', { dailyKey: '2026-10-19' }),
        daily('DAILY_CHALLENGE', { dailyKey: '2026-10-20' }),
        daily('FLAGS', { dailyKey: '2026-10-21' }),
      ]),
    ).toBe(2)
    expect(
      value('week_difficult_3', [
        game({ difficulty: 'Difficile' }),
        game({ gameType: 'PLACEMENT', difficulty: 'Impossible' }),
        game({ gameType: 'CAPITALS', difficulty: 'Hardcore' }),
        game({ gameType: 'MISSING_FLAG', difficulty: 'Difficile' }),
        game({ difficulty: 'Moyen' }),
        game({ gameType: 'QUIZ', difficulty: 'Difficile' }),
      ]),
    ).toBe(4)
    expect(value('week_types_10', [game(), game({ gameType: 'QUIZ' }), game({ gameType: 'SURVIVAL' })])).toBe(3)
    expect(value('week_play_50', [game(), game()])).toBe(2)
    const perfect = { found: 20, total: 20 }
    expect(value('week_perfect_hard_1', [game({ ...perfect, difficulty: 'Moyen' }), game({ found: 19, total: 20, difficulty: 'Difficile' })])).toBe(0)
    expect(value('week_perfect_hard_1', [game({ ...perfect, difficulty: 'Moyen' }), game({ ...perfect, difficulty: 'Difficile' })])).toBe(1)
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
    const games = everything()
    const result = grantXp(fresh(), games, NOW)
    const daily = missionsAt(games, NOW).daily
    expect(daily.every((entry) => entry.done)).toBe(true)
    expect(result.state.dayMissions).toEqual([...daily.map((entry) => entry.mission.id), BONUS_ID])
    expect(result.gained).toBeGreaterThanOrEqual(DAILY_MISSIONS * DAILY_MISSION_XP + DAILY_BONUS_XP + GAMES_PER_DAY * GAME_XP)
    expect(result.levelUp).toBe(true)
    expect(result.state.level).toBe(levelOf(result.state.total).level)
    expect(grantXp(result.state, games, NOW).gained).toBe(0)
    // The daily missions pay XP only. Fragments come with the weekly missions the same games may finish, and with
    // the levels gained, and are paid once.
    expect(DAILY_MISSION_FRAGMENTS + DAILY_BONUS_FRAGMENTS).toBe(0)
    const weekly = missionsAt(games, NOW).weekly
    const weeklyFragments = weekly.filter((entry) => entry.done).reduce((sum, entry) => sum + WEEKLY_TIERS[entry.mission.tier].fragments, 0)
    const weeklyBonus = weekly.every((entry) => entry.done) ? WEEKLY_BONUS_FRAGMENTS : 0
    const dailiesFragments = result.rewards.reduce((sum, reward) => sum + reward.fragments, 0)
    expect(result.fragments).toBe(weeklyFragments + weeklyBonus + (result.state.level - 1) * LEVEL_UP_FRAGMENTS + dailiesFragments)
    expect(grantXp(result.state, games, NOW).fragments).toBe(0)
  })

  it('pays the weekly missions by tier, and a bonus with fragments when the 5 are done', () => {
    // Enough games of every kind to finish any weekly mission.
    const games = everything()
    const weekly = missionsAt(games, NOW).weekly
    expect(weekly.every((entry) => entry.done)).toBe(true)
    // The day is already paid: only the week is left
    const day = missionsAt(games, NOW).daily.map((entry) => entry.mission.id)
    const state = { ...fresh(), dayMissions: [...day, BONUS_ID], dayGames: GAMES_PER_DAY }
    const result = grantXp(state, games, NOW)
    const xp = weekly.reduce((sum, entry) => sum + WEEKLY_TIERS[entry.mission.tier].xp, 0) + WEEKLY_BONUS_XP
    const fragments = weekly.reduce((sum, entry) => sum + WEEKLY_TIERS[entry.mission.tier].fragments, 0) + WEEKLY_BONUS_FRAGMENTS
    expect(xp).toBe(2 * 150 + 2 * 250 + 400 + 250)
    expect(fragments).toBe(2 * 1 + 2 * 2 + 3 + 2)
    expect(result.gained).toBe(xp)
    expect(result.state.weekMissions).toEqual([...weekly.map((entry) => entry.mission.id), BONUS_ID])
    expect(result.fragments).toBe(
      fragments + (result.state.level - 1) * LEVEL_UP_FRAGMENTS + result.rewards.reduce((sum, reward) => sum + reward.fragments, 0),
    )
    // Paid once: the ids and the bonus are stored, even if the drawn set changes mid-week
    expect(grantXp(result.state, games, NOW)).toMatchObject({ gained: 0, fragments: 0 })
    const partly = { ...state, weekMissions: [weekly[0].mission.id, BONUS_ID] }
    expect(grantXp(partly, games, NOW).gained).toBe(xp - WEEKLY_TIERS[weekly[0].mission.tier].xp - WEEKLY_BONUS_XP)
  })

  it('pays a fragment for each level gained, once', () => {
    const close = readXp({ xp: { total: levelCost(1) - GAME_XP } }, '2026-10-19', '2026-W43')
    const result = grantXp(close, [game()], NOW)
    expect(result.levelUp).toBe(true)
    expect(result.state.level).toBe(2)
    expect(result.fragments).toBe(LEVEL_UP_FRAGMENTS)
    // The stored total now gives the new level: nothing more to pay
    expect(readXp({ xp: result.state }, '2026-10-19', '2026-W43').level).toBe(2)
    expect(grantXp(readXp({ xp: result.state }, '2026-10-19', '2026-W43'), [game()], NOW)).toMatchObject({ gained: 0, fragments: 0 })
    // Several levels at once
    const far = grantXp(readXp({ xp: { total: 0 } }, '2026-10-19', '2026-W43'), [], NOW)
    expect(far.fragments).toBe(0)
  })

  it('pays no fragment for games alone', () => {
    expect(grantXp(fresh(), [game(), game()], NOW)).toMatchObject({ fragments: 0 })
  })
})

// ---------- Dailies of the day and streak ----------

// Thursday 2026-10-29, 12:00 in Paris: the day the Country of the Day replaced the Geo Quiz (6 dailies).
const TODAY_TIME = Date.UTC(2026, 9, 29, 10)
const TODAY = '2026-10-29'
const SIX = ['DAILY_CHALLENGE', 'COUNTRY_OF_DAY', 'BORDER_GUESS', 'COUNTRY_CLUE', 'VOYAGE_VOYAGE', 'RANKING']
// Played on its dailyKey's day (11:00 in Paris) unless playedAt says otherwise.
const playedOn = (dailyKey) => (typeof dailyKey === 'string' ? Date.parse(`${dailyKey}T09:00:00Z`) : TODAY_TIME - HOUR)
const daily = (gameType, overrides = {}) => {
  const dailyKey = 'dailyKey' in overrides ? overrides.dailyKey : TODAY
  return { gameType, mode: 'daily', dailyKey, solved: true, score: 12, playedAt: playedOn(dailyKey), ...overrides }
}
const lost = (gameType) => daily(gameType, { solved: false, score: 0 })
const freshAt = (xp = {}) => readXp({ xp }, TODAY, weekKeyOf(TODAY))
const rewardKinds = (result) => result.rewards.map((reward) => reward.kind)
const doneOf = (games) => dailiesProgress(games, TODAY).tiers.map((tier) => tier.done)

describe('isDailyWon', () => {
  it('reads a win from the score for the Daily Challenge, whose solved is always true', () => {
    expect(CHALLENGE_WON_SCORE).toBe(8)
    expect(isDailyWon({ gameType: 'DAILY_CHALLENGE', solved: true, score: 8 })).toBe(true)
    expect(isDailyWon({ gameType: 'DAILY_CHALLENGE', solved: true, score: 12 })).toBe(true)
    expect(isDailyWon({ gameType: 'DAILY_CHALLENGE', solved: true, score: 7 })).toBe(false)
    expect(isDailyWon({ gameType: 'DAILY_CHALLENGE', solved: true })).toBe(false)
  })

  it('reads solved for the other dailies: Voyage Voyage only ends once the path is found', () => {
    for (const gameType of ['RANKING', 'BORDER_GUESS', 'COUNTRY_CLUE', 'VOYAGE_VOYAGE', 'COUNTRY_OF_DAY']) {
      expect(isDailyWon({ gameType, solved: true, score: 0 }), gameType).toBe(true)
      expect(isDailyWon({ gameType, solved: false, score: 500 }), gameType).toBe(false)
      expect(isDailyWon({ gameType }), gameType).toBe(false)
    }
  })
})

describe('dailiesProgress', () => {
  it('counts the dailies of the day once per type, and the ones won', () => {
    const games = [daily('RANKING'), daily('RANKING'), lost('BORDER_GUESS'), daily('DAILY_CHALLENGE', { score: 3 })]
    expect(dailiesProgress(games, TODAY)).toMatchObject({ day: TODAY, total: 6, played: 3, won: 1 })
    expect(doneOf(games)).toEqual([false, false, false])
  })

  it('tells each daily of the day played whether it was won', () => {
    const games = [lost('RANKING'), daily('RANKING'), lost('BORDER_GUESS'), daily('DAILY_CHALLENGE', { score: 3 }), daily('FLAGS')]
    expect(dailiesProgress(games, TODAY).status).toEqual({ RANKING: 'won', BORDER_GUESS: 'played', DAILY_CHALLENGE: 'played' })
  })

  it('ignores the dailies of another day, other modes, and games that are not dailies of the day', () => {
    const games = [
      daily('RANKING', { dailyKey: '2026-10-28' }),
      daily('BORDER_GUESS', { mode: 'standard' }),
      daily('QUIZ'), // the Geo Quiz is not a daily any more
      daily('FLAGS'), // not a daily at all
      daily('COUNTRY_CLUE', { dailyKey: undefined }),
    ]
    expect(dailiesProgress(games, TODAY)).toMatchObject({ total: 6, played: 0, won: 0 })
    // The day before, the Geo Quiz was one of them
    expect(dailiesProgress([daily('QUIZ', { dailyKey: '2026-10-28' })], '2026-10-28')).toMatchObject({ total: 6, played: 1 })
  })

  it('has the three tiers in the order they are paid', () => {
    expect(DAILY_TIERS.map((tier) => [tier.id, tier.fragments])).toEqual([
      ['dailies_all', DAILIES_ALL_FRAGMENTS],
      ['dailies_won_3', DAILIES_WON_FRAGMENTS[3]],
      ['dailies_won_all', DAILIES_WON_FRAGMENTS.all],
    ])
    expect(doneOf(SIX.map(lost))).toEqual([true, false, false])
    expect(doneOf([...SIX.slice(0, 3).map((type) => daily(type)), ...SIX.slice(3).map(lost)])).toEqual([true, true, false])
    expect(doneOf(SIX.map((type) => daily(type)))).toEqual([true, true, true])
  })
})

describe('dailies fragments', () => {
  it('pays 1 for all played, 1 for 3 won and 1 for all won, each once a day', () => {
    const three = SIX.slice(0, 3).map((type) => daily(type))
    let result = grantXp(freshAt(), three, TODAY_TIME)
    expect(result.rewards).toEqual([{ kind: 'dailies_won_3', fragments: 1 }])
    expect(result.fragments).toBe(1)
    expect(result.state.dayRewards).toEqual(['dailies_won_3'])

    result = grantXp(result.state, [...three, ...SIX.slice(3).map(lost)], TODAY_TIME)
    expect(result.rewards).toEqual([{ kind: 'dailies_all', fragments: 1 }])
    expect(result.state.dayRewards).toEqual(['dailies_won_3', 'dailies_all'])

    const won = SIX.map((type) => daily(type))
    result = grantXp(result.state, won, TODAY_TIME)
    expect(result.rewards).toEqual([{ kind: 'dailies_won_all', fragments: 1 }])
    expect(result.fragments).toBe(1)
    // Nothing more, however many times it is asked
    expect(grantXp(result.state, won, TODAY_TIME)).toMatchObject({ rewards: [], fragments: 0 })
  })

  it('pays the three at once when everything is won, 3 fragments a day at most', () => {
    const result = grantXp(freshAt(), SIX.map((type) => daily(type)), TODAY_TIME)
    expect(rewardKinds(result)).toEqual(['dailies_all', 'dailies_won_3', 'dailies_won_all'])
    expect(result.rewards.reduce((sum, reward) => sum + reward.fragments, 0)).toBe(3)
  })

  it('does not count the games of another dailyKey, and starts again the next day', () => {
    const yesterday = SIX.map((type) => daily(type, { dailyKey: '2026-10-28' }))
    expect(grantXp(freshAt(), yesterday, TODAY_TIME).rewards).toEqual([])
    const paid = grantXp(freshAt(), SIX.map((type) => daily(type)), TODAY_TIME)
    const tomorrow = TODAY_TIME + 24 * HOUR
    const stateTomorrow = readXp({ xp: paid.state }, '2026-10-30', weekKeyOf('2026-10-30'))
    expect(stateTomorrow.dayRewards).toEqual([])
    const next = SIX.map((type) => daily(type, { dailyKey: '2026-10-30', playedAt: tomorrow - HOUR }))
    expect(rewardKinds(grantXp(stateTomorrow, next, tomorrow))).toEqual(['dailies_all', 'dailies_won_3', 'dailies_won_all'])
  })
})

describe('streak', () => {
  const days = (...list) => list.map((day) => `2026-10-${String(day).padStart(2, '0')}`)

  it('reads the stored streak safely', () => {
    expect(readXp({}, TODAY, 'w').streak).toBeNull()
    expect(readXp({ xp: { streak: { day: TODAY, count: 4 } } }, TODAY, 'w').streak).toEqual({ day: TODAY, count: 4 })
    expect(readXp({ xp: { streak: { day: 'x', count: 4 } } }, TODAY, 'w').streak).toEqual({ day: null, count: 0 })
    expect(readXp({ xp: { streak: { day: TODAY, count: -2 } } }, TODAY, 'w').streak).toEqual({ day: TODAY, count: 0 })
  })

  it('lists the days with a daily, like the profile', () => {
    const games = [daily('RANKING', { dailyKey: '2026-10-05' }), daily('RANKING', { dailyKey: '2026-10-05' }), daily('QUIZ', { dailyKey: '2026-10-04' }), game()]
    expect(dailyDays(games)).toEqual(['2026-10-04', '2026-10-05'])
  })

  it('only counts a daily on the day it was played (playedAt is the server time, dailyKey the player\'s)', () => {
    const forged = days(23, 24, 25, 26, 27, 28).map((day) => daily('RANKING', { dailyKey: day, playedAt: TODAY_TIME - HOUR }))
    expect(dailyDays(forged)).toEqual([])
    expect(dailiesProgress(SIX.map((type) => daily(type, { playedAt: TODAY_TIME + 24 * HOUR })), TODAY)).toMatchObject({ played: 0 })
    // A game not synced yet (no playedAt, on the clients) is taken at its word
    expect(dailyDays([daily('RANKING', { playedAt: undefined })])).toEqual([TODAY])
  })

  it('builds the streak ending on the last day', () => {
    expect(streakFromDays([])).toBeNull()
    expect(streakFromDays(days(10, 11, 12, 8, 7))).toEqual({ day: '2026-10-12', count: 3 })
    expect(streakFromDays(['2026-09-30', '2026-10-01'])).toEqual({ day: '2026-10-01', count: 2 })
  })

  it('goes up on the day after, restarts after a gap, and ignores old, repeated and future days', () => {
    const start = { day: '2026-10-10', count: 3 }
    expect(advanceStreak(start, days(11), '2026-10-11').streak).toEqual({ day: '2026-10-11', count: 4 })
    expect(advanceStreak(start, days(12), '2026-10-12').streak).toEqual({ day: '2026-10-12', count: 1 })
    expect(advanceStreak(start, days(9, 10), '2026-10-12').streak).toEqual(start)
    expect(advanceStreak(start, days(11, 11, 13), '2026-10-12').streak).toEqual({ day: '2026-10-11', count: 4 })
    expect(advanceStreak(null, days(5), '2026-10-05').streak).toEqual({ day: '2026-10-05', count: 1 })
  })

  it('pays every 7th day, the 30th and the 100th, once', () => {
    expect([6, 7, 14, 30, 100, 210].map(streakFragments)).toEqual([0, 2, 2, 5, 10, 2])
    expect(streakFragments(7)).toBe(STREAK_WEEK_FRAGMENTS)
    const first = advanceStreak({ day: '2026-10-12', count: 6 }, days(13), '2026-10-13')
    expect(first.rewards).toEqual([{ kind: 'streak', fragments: 2, streak: 7 }])
    // Asking again with the new streak pays nothing
    expect(advanceStreak(first.streak, days(13), '2026-10-13')).toEqual({ streak: first.streak, rewards: [] })
    // Several days at once pay each milestone crossed (7 and 14)
    const long = advanceStreak({ day: '2026-10-01', count: 1 }, days(2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14), '2026-10-14')
    expect(long.streak.count).toBe(14)
    expect(long.rewards.map((reward) => reward.streak)).toEqual([7, 14])
    const thirty = advanceStreak({ day: '2026-10-28', count: 29 }, ['2026-10-29'], '2026-10-29')
    expect(thirty.rewards).toEqual([{ kind: 'streak', fragments: 5, streak: 30 }])
  })

  it('seeds a player with a history from the days before today, paying nothing', () => {
    const history = ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', TODAY].map((dailyKey) => daily('RANKING', { dailyKey }))
    expect(seedStreak(history, TODAY)).toEqual({ day: '2026-10-28', count: 6 })
    expect(seedStreak([], TODAY)).toEqual({ day: null, count: 0 })
    expect(seedStreak([daily('RANKING')], TODAY)).toEqual({ day: null, count: 0 })
    // Today then makes the 7th day
    const result = grantXp(freshAt({ streak: seedStreak(history, TODAY) }), history, TODAY_TIME)
    expect(result.state.streak).toEqual({ day: TODAY, count: 7 })
    expect(result.rewards).toContainEqual({ kind: 'streak', fragments: 2, streak: 7 })
    // Seeded and today not played yet: nothing is paid
    const before = history.slice(0, -1)
    expect(grantXp(freshAt({ streak: seedStreak(before, TODAY) }), before, TODAY_TIME)).toMatchObject({ rewards: [] })
  })

  it('pays the milestones 7 and 14 once through grantXp, and starts again after a missed day', () => {
    let state = { streak: { day: '2026-10-22', count: 6 } }
    const play = (day) => daily('RANKING', { dailyKey: day, playedAt: Date.parse(`${day}T10:00:00Z`) })
    const played = []
    const claim = (day) => {
      played.push(play(day))
      const result = grantXp(readXp({ xp: state }, day, weekKeyOf(day)), played, Date.parse(`${day}T10:00:00Z`))
      state = result.state
      return result.rewards.filter((reward) => reward.kind === 'streak')
    }
    expect(claim('2026-10-23')).toEqual([{ kind: 'streak', fragments: 2, streak: 7 }])
    expect(claim('2026-10-23')).toEqual([])
    for (const day of ['24', '25', '26', '27', '28', '29']) expect(claim(`2026-10-${day}`)).toEqual([])
    expect(state.streak).toEqual({ day: '2026-10-29', count: 13 })
    expect(claim('2026-10-30')).toEqual([{ kind: 'streak', fragments: 2, streak: 14 }])
    // 31 missed, 2026-11-01 played
    expect(claim('2026-11-01')).toEqual([])
    expect(state.streak).toEqual({ day: '2026-11-01', count: 1 })
  })

  it('is alive until the end of the next day, and tells the next milestone', () => {
    expect(streakNow({ day: TODAY, count: 5 }, TODAY)).toBe(5)
    expect(streakNow({ day: '2026-10-28', count: 5 }, TODAY)).toBe(5)
    expect(streakNow({ day: '2026-10-27', count: 5 }, TODAY)).toBe(0)
    expect(streakNow(null, TODAY)).toBe(0)
    expect(nextStreakReward(0)).toEqual({ count: 7, fragments: 2 })
    expect(nextStreakReward(7)).toEqual({ count: 14, fragments: 2 })
    expect(nextStreakReward(28)).toEqual({ count: 30, fragments: 5 })
    expect(nextStreakReward(98)).toEqual({ count: 100, fragments: 10 })
  })
})

describe('XP state with the dailies', () => {
  it('forgets the dailies paid on a past day, and missionsAt gives the dailies of the day', () => {
    const stored = { xp: { day: '2026-10-28', dayRewards: ['dailies_all'], week: '2026-W44' } }
    expect(readXp(stored, TODAY, '2026-W44').dayRewards).toEqual([])
    expect(readXp({ xp: { ...stored.xp, day: TODAY } }, TODAY, '2026-W44').dayRewards).toEqual(['dailies_all'])
    expect(missionsAt([daily('RANKING')], TODAY_TIME).dailies).toMatchObject({ day: TODAY, played: 1, won: 1, total: 6 })
  })
})

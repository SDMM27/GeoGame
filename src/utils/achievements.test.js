import { describe, expect, it, vi } from 'vitest'
import { ACHIEVEMENTS, TIERS, computeAchievements } from './achievements'
import { BADGES_SHOWN, badgeSummary, readBadges } from './badges'
import { DAILY_GAME_TYPES, computeStats } from './profileStats'

vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), updateDoc: vi.fn() }))
vi.mock('./gameHistory', () => ({ fetchGames: vi.fn() }))

const NOW = Date.parse('2026-10-13T12:00:00Z')
const game = (overrides) => ({ id: String(Math.random()), gameType: 'PLACEMENT', mode: 'standard', playedAt: NOW, ...overrides })
const unlockedIds = (games, friendsCount) =>
  computeAchievements({ stats: computeStats(games, '2026-10-13'), games, friendsCount })
    .filter((achievement) => achievement.unlocked)
    .map((achievement) => achievement.id)

describe('achievements', () => {
  it('only shows the badges of a hidden game once unlocked', () => {
    const ids = (games) => computeAchievements({ stats: computeStats(games, '2026-10-13'), games }).map((a) => a.id)
    expect(ids([])).not.toContain('quiz_streak_10')
    expect(ids([game({ gameType: 'QUIZ', mode: 'infinite', bestStreak: 12 })])).toContain('quiz_streak_10')
  })

  it('unlocks the Country of the Day badges', () => {
    const days = Array.from({ length: 7 }, (_, i) => game({ gameType: 'COUNTRY_OF_DAY', mode: 'daily', dailyKey: `2026-10-0${i + 1}`, solved: i === 0, errors: i === 0 ? 0 : 2 }))
    expect(unlockedIds(days)).toEqual(expect.arrayContaining(['country_of_day_7', 'country_of_day_flawless']))
  })

  it('have unique ids, a known tier and a reachable target', () => {
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(ACHIEVEMENTS.length)
    for (const achievement of ACHIEVEMENTS) {
      expect(TIERS).toContain(achievement.tier)
      expect(achievement.target).toBeGreaterThan(0)
      expect(achievement.emoji).toBeTruthy()
      expect(achievement.icon).toBeTruthy()
    }
  })

  it('unlock the collection ones from the flags and the mastery, with the pool sizes as targets', () => {
    const compute = (collection) => computeAchievements({ stats: computeStats([]), games: [], collection })
    const find = (list, id) => list.find((achievement) => achievement.id === id)
    const partial = compute({ flagsUnlocked: 100, flagsTotal: 239, masteryFound: 5, masteryTotal: 700 })
    expect(find(partial, 'mythic')).toMatchObject({ progress: 100, target: 239, unlocked: false, sticky: true, tier: 'legend' })
    expect(find(partial, 'legend_master')).toMatchObject({ progress: 5, target: 700, unlocked: false })
    const done = compute({ flagsUnlocked: 239, flagsTotal: 239, masteryFound: 700, masteryTotal: 700 })
    expect(find(done, 'mythic').unlocked).toBe(true)
    expect(find(done, 'legend_master').unlocked).toBe(true)
  })

  it('never unlock the collection ones from an empty collection', () => {
    for (const collection of [undefined, {}, { flagsUnlocked: 0, flagsTotal: 0, masteryFound: 0, masteryTotal: 0 }]) {
      const list = computeAchievements({ stats: computeStats([]), games: [], collection })
      expect(list.filter((achievement) => achievement.unlocked)).toEqual([])
      expect(list.find((achievement) => achievement.id === 'mythic')).toMatchObject({ target: 1, progress: 0 })
    }
  })

  it('unlock nothing without games', () => {
    expect(unlockedIds([])).toEqual([])
  })

  it('unlock the survival ones from the rounds survived', () => {
    const run = (score, lives) => game({ gameType: 'SURVIVAL', mode: 'survival', score, lives })
    expect(unlockedIds([run(12, 3)])).toEqual(expect.arrayContaining(['survival_10']))
    expect(unlockedIds([run(12, 3)])).not.toContain('survival_25')
    expect(unlockedIds([run(30, 3)])).not.toContain('survival_one_life')
    expect(unlockedIds([run(30, 1)])).toEqual(expect.arrayContaining(['survival_25', 'survival_one_life']))
  })

  it('unlock the quiz ones from a streak or a flawless run', () => {
    const quiz = (extra) => game({ gameType: 'QUIZ', mode: 'infinite', ...extra })
    expect(unlockedIds([quiz({ answered: 12, correct: 12, bestStreak: 12 })])).toEqual(
      expect.arrayContaining(['quiz_flawless', 'quiz_streak_10'])
    )
    expect(unlockedIds([quiz({ answered: 12, correct: 11, bestStreak: 9 })])).not.toContain('quiz_flawless')
    expect(unlockedIds([quiz({ answered: 30, correct: 28, bestStreak: 26 })])).toContain('quiz_streak_25')
  })

  it('only count a perfect game when every country was found', () => {
    expect(unlockedIds([game({ found: 20, total: 20, difficulty: 'Moyen' })])).toContain('perfect_run')
    expect(unlockedIds([game({ found: 20, total: 20, difficulty: 'Moyen' })])).not.toContain('master')
    expect(unlockedIds([game({ found: 20, total: 20, difficulty: 'Difficile' })])).toContain('master')
    expect(unlockedIds([game({ found: 19, total: 20, difficulty: 'Difficile' })])).not.toContain('perfect_run')
    expect(unlockedIds([game({ found: 3, total: 3 })])).not.toContain('perfect_run')
  })

  it('count the days with every daily challenge done', () => {
    const types = ['BORDER_GUESS', 'COUNTRY_CLUE', 'VOYAGE_VOYAGE', 'RANKING', 'QUIZ']
    const day = (dailyKey) => types.map((gameType) => game({ gameType, mode: 'daily', dailyKey, solved: true, attempts: 3 }))
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']
    expect(unlockedIds(days.flatMap(day))).not.toContain('sweep_7')
    expect(unlockedIds([...days, '2026-10-07'].flatMap(day))).toEqual(expect.arrayContaining(['sweep_7', 'daily_sweep']))
  })

  it('count a sweep with the dailies there were that day', () => {
    const before = ['BORDER_GUESS', 'COUNTRY_CLUE', 'VOYAGE_VOYAGE', 'RANKING', 'QUIZ']
    const day = (dailyKey, types) => types.map((gameType) => game({ gameType, mode: 'daily', dailyKey, solved: true, attempts: 3 }))
    const progress = (games) => computeAchievements({ stats: computeStats(games, '2026-10-20'), games }).find((a) => a.id === 'daily_sweep')
    // A sweep made before the Daily Challenge existed still counts, whatever the number of dailies now
    expect(progress(day('2026-10-14', before))).toMatchObject({ progress: DAILY_GAME_TYPES.length, unlocked: true })
    // After it, the five are no longer a sweep
    expect(progress(day('2026-10-17', before))).toMatchObject({ progress: 5, unlocked: false })
    expect(progress(day('2026-10-17', [...before, 'DAILY_CHALLENGE']))).toMatchObject({ progress: DAILY_GAME_TYPES.length, unlocked: true })
    const sweeps = (days) => unlockedIds(days.flatMap(([dailyKey, types]) => day(dailyKey, types)))
    const old = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map((d) => [d, before])
    expect(sweeps([...old, ['2026-10-16', before]])).not.toContain('sweep_7')
    expect(sweeps([...old, ['2026-10-16', [...before, 'DAILY_CHALLENGE']]])).toContain('sweep_7')
  })

  it('leave the Ranking out of "first try", and check its error for a perfect one', () => {
    const ranking = game({ gameType: 'RANKING', mode: 'daily', dailyKey: '2026-10-13', solved: true, attempts: 1, totalError: 0 })
    expect(unlockedIds([ranking])).toContain('perfect_ranking')
    expect(unlockedIds([ranking])).not.toContain('first_try')
  })

  it('sort the unlocked ones by tier', () => {
    const games = Array.from({ length: 12 }, () => game({ gameType: 'SURVIVAL', mode: 'survival', score: 55, lives: 1 }))
    const unlocked = computeAchievements({ stats: computeStats(games, '2026-10-13'), games }).filter((item) => item.unlocked)
    const ranks = unlocked.map((item) => TIERS.indexOf(item.tier))
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a))
    expect(unlocked[0].tier).toBe('legend')
  })
})

describe('challenges', () => {
  const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
  const TYPES = ['PLACEMENT', 'FLAGS', 'CAPITALS']
  const perfect = (gameType, difficulty) => game({ gameType, difficulty, found: 20, total: 20 })
  const partial = (gameType, difficulty) => game({ gameType, difficulty, found: 19, total: 20 })
  const all = (gameType) => DIFFICULTIES.map((difficulty) => perfect(gameType, difficulty))

  it('unlock a tour with a perfect game on each of the 5 difficulties', () => {
    const tours = { CAPITALS: 'capital_tour', FLAGS: 'flag_tour', PLACEMENT: 'placement_tour' }
    for (const [type, id] of Object.entries(tours)) {
      expect(unlockedIds(all(type))).toContain(id)
      expect(unlockedIds([...all(type).slice(1), partial(type, 'Facile')])).not.toContain(id)
      // Another game type does not count
      expect(unlockedIds(all(TYPES.find((other) => other !== type)))).not.toContain(id)
    }
  })

  it('unlock the Impossible ones from a perfect Impossible game of that type', () => {
    const ids = { CAPITALS: 'capital_impossible', FLAGS: 'flag_impossible', PLACEMENT: 'placement_impossible' }
    for (const [type, id] of Object.entries(ids)) {
      expect(unlockedIds([perfect(type, 'Impossible')])).toContain(id)
      expect(unlockedIds([partial(type, 'Impossible')])).not.toContain(id)
      expect(unlockedIds([perfect(type, 'Hardcore')])).not.toContain(id)
    }
  })

  it('unlock the trios with a perfect game of each type at the difficulty', () => {
    const trio = (difficulty) => TYPES.map((type) => perfect(type, difficulty))
    expect(unlockedIds(trio('Impossible'))).toContain('impossible_trio')
    expect(unlockedIds(trio('Impossible'))).not.toContain('hardcore_trio')
    expect(unlockedIds(trio('Hardcore'))).toContain('hardcore_trio')
    expect(unlockedIds([...trio('Impossible').slice(1), partial('PLACEMENT', 'Impossible')])).not.toContain('impossible_trio')
    expect(unlockedIds([perfect('FLAGS', 'Hardcore'), perfect('FLAGS', 'Hardcore'), perfect('CAPITALS', 'Hardcore')])).not.toContain('hardcore_trio')
  })

  it('unlock world champion with every game type and difficulty perfect', () => {
    const everything = TYPES.flatMap(all)
    expect(unlockedIds(everything)).toContain('world_champion')
    expect(unlockedIds(everything.slice(1))).not.toContain('world_champion')
  })

  it('keep a sticky challenge unlocked from `remembered`, even with an empty history', () => {
    const list = computeAchievements({ stats: computeStats([]), games: [], remembered: ['world_champion', 'games_250'] })
    expect(list.find((item) => item.id === 'world_champion')).toMatchObject({ unlocked: true, progress: 15 })
    // Only sticky achievements are remembered
    expect(list.find((item) => item.id === 'games_250').unlocked).toBe(false)
    expect(list[0].id).toBe('world_champion')
  })
})

describe('badges', () => {
  const games = Array.from({ length: 12 }, () => game({ gameType: 'SURVIVAL', mode: 'survival', score: 55, lives: 1 }))
  const achievements = computeAchievements({ stats: computeStats(games, '2026-10-13'), games, friendsCount: 3 })

  it('summarize the best badges, never more than the limit, without "friend"', () => {
    const summary = badgeSummary(achievements)
    expect(summary.top).toHaveLength(BADGES_SHOWN)
    expect(summary.top[0]).toBe('survival_50')
    expect(summary.count).toBe(achievements.filter((item) => item.unlocked && item.id !== 'friend').length)
    expect(badgeSummary(computeAchievements({ stats: computeStats([]), games: [], friendsCount: 1 }))).toEqual({ top: [], count: 0 })
  })

  it('read what a user document holds, ignoring what is unknown or malformed', () => {
    expect(readBadges(undefined)).toEqual({ top: [], count: 0 })
    expect(readBadges({ badges: 'x' })).toEqual({ top: [], count: 0 })
    const read = readBadges({ badges: { top: ['survival_50', 'nope', 'games_10', 'games_50', 'first_game'], count: 4 } })
    expect(read.top.map((badge) => badge.id)).toEqual(['survival_50', 'games_10', 'games_50'])
    expect(read.top[0]).toMatchObject({ tier: 'legend', emoji: '🛡️' })
    expect(read.count).toBe(4)
  })
})

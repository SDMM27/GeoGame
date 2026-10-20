// Missions and XP (docs/plan-fonctionnalites.md, step 5): the rules, shared by the server (api/_lib/xp.mjs, which alone
// writes XP) and the clients (progress shown on the home page and the profile). No Firebase import: the API bundles
// this file.
//
// - Every day (Paris midnight, like the dailies) 3 missions are drawn from DAILY_POOL, the same for everyone; every
//   week (Monday to Sunday, Paris) 5 from WEEKLY_POOL: 2 easy, 2 medium and 1 hard (WEEKLY_TIERS: the harder, the
//   more XP and fragments). A mission is done when the player's games of that day or week reach its target. Each
//   one pays once, plus a bonus when all those of the period are done.
// - Each game in the history also pays GAME_XP, for at most GAMES_PER_DAY games a day.
// - Progress is read from the game history (users/{uid}/games, see gameHistory.js), so a mission is only as honest as
//   the history; what bounds a cheater is that the XP of a day and of a week is capped.
// - XP makes a level: going from level n to n + 1 takes LEVEL_BASE + LEVEL_STEP × (n - 1) XP. Levels unlock items
//   (decorations.js).
// - Flag fragments (flagCollection.js) are paid in the same call as the XP: by the weekly missions and bonus, and by
//   each level gained. The daily missions pay XP only.
import {
  DAILY_BONUS_FRAGMENTS,
  DAILY_MISSION_FRAGMENTS,
  LEVEL_UP_FRAGMENTS,
  WEEKLY_BONUS_FRAGMENTS,
  WEEKLY_TIER_FRAGMENTS,
} from './flagCollection.js'
import { GAME_TYPES } from './gameTypes.js'
import { seededShuffle } from './prng.js'

export const DAILY_MISSIONS = 3
// Weekly missions drawn from each tier of WEEKLY_POOL, easy first.
export const WEEKLY_MISSIONS_BY_TIER = { easy: 2, medium: 2, hard: 1 }
export const WEEKLY_MISSIONS = Object.values(WEEKLY_MISSIONS_BY_TIER).reduce((sum, count) => sum + count, 0)
export const DAILY_MISSION_XP = 60
export const DAILY_BONUS_XP = 40
// What a weekly mission pays, by tier.
export const WEEKLY_TIERS = {
  easy: { xp: 150, fragments: WEEKLY_TIER_FRAGMENTS.easy },
  medium: { xp: 250, fragments: WEEKLY_TIER_FRAGMENTS.medium },
  hard: { xp: 400, fragments: WEEKLY_TIER_FRAGMENTS.hard },
}
export const WEEKLY_BONUS_XP = 250
export const GAME_XP = 10
export const GAMES_PER_DAY = 10
export const LEVEL_BASE = 100
export const LEVEL_STEP = 50
// Id stored with the missions of a period once its bonus is paid.
export const BONUS_ID = 'bonus'

const SETUP_TYPES = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]

const isDaily = (game) => game.mode === 'daily'
const isPerfect = (game) => SETUP_TYPES.includes(game.gameType) && game.total >= 10 && game.found === game.total
const count = (games, predicate) => games.filter(predicate).length
const sumFound = (games, gameType) =>
  games.reduce((sum, game) => (game.gameType === gameType && Number.isFinite(game.found) ? sum + game.found : sum), 0)
const allFound = (games) => games.reduce((sum, game) => (Number.isFinite(game.found) ? sum + game.found : sum), 0)
const distinct = (values) => new Set(values).size

// `value(games)`: progress from the games of the period; weekly missions have a `tier` (WEEKLY_TIERS). Titles are in
// i18n under `missions.<id>`, with {{count}} the target. `emoji` is used by the website, `icon`
// (MaterialCommunityIcons) by the app.
export const DAILY_POOL = [
  { id: 'play_3', emoji: '🎮', icon: 'gamepad-variant-outline', target: 3, value: (games) => games.length },
  { id: 'dailies_3', emoji: '📅', icon: 'calendar-check-outline', target: 3, value: (games) => count(games, isDaily) },
  {
    id: 'daily_challenge',
    emoji: '🎯',
    icon: 'bullseye-arrow',
    target: 1,
    value: (games) => count(games, (game) => isDaily(game) && game.gameType === GAME_TYPES.DAILY_CHALLENGE),
  },
  { id: 'daily_wins_2', emoji: '✅', icon: 'check-decagram-outline', target: 2, value: (games) => count(games, (game) => isDaily(game) && game.solved) },
  { id: 'flags_20', emoji: '🚩', icon: 'flag-variant-outline', target: 20, value: (games) => sumFound(games, GAME_TYPES.FLAGS) },
  { id: 'placement_20', emoji: '🌍', icon: 'earth', target: 20, value: (games) => sumFound(games, GAME_TYPES.PLACEMENT) },
  { id: 'capitals_15', emoji: '🏛️', icon: 'bank-outline', target: 15, value: (games) => sumFound(games, GAME_TYPES.CAPITALS) },
  { id: 'ascension_1', emoji: '⛰️', icon: 'image-filter-hdr', target: 1, value: (games) => count(games, (game) => game.mode === 'ascension') },
  { id: 'survival_1', emoji: '❤️', icon: 'heart-pulse', target: 1, value: (games) => count(games, (game) => game.gameType === GAME_TYPES.SURVIVAL) },
  { id: 'perfect_1', emoji: '💎', icon: 'diamond-stone', target: 1, value: (games) => count(games, isPerfect) },
  { id: 'types_3', emoji: '🧭', icon: 'compass-outline', target: 3, value: (games) => distinct(games.map((game) => game.gameType)) },
]

export const WEEKLY_POOL = [
  { id: 'week_play_20', tier: 'easy', emoji: '🕹️', icon: 'controller-classic-outline', target: 20, value: (games) => games.length },
  { id: 'week_daily_days_5', tier: 'medium', emoji: '🔥', icon: 'fire', target: 5, value: (games) => distinct(games.filter(isDaily).map((game) => game.dailyKey)) },
  { id: 'week_dailies_15', tier: 'easy', emoji: '📆', icon: 'calendar-multiselect', target: 15, value: (games) => count(games, isDaily) },
  { id: 'week_daily_wins_10', tier: 'medium', emoji: '🏅', icon: 'medal-outline', target: 10, value: (games) => count(games, (game) => isDaily(game) && game.solved) },
  { id: 'week_found_200', tier: 'easy', emoji: '🗺️', icon: 'map-marker-multiple-outline', target: 200, value: allFound },
  { id: 'week_found_500', tier: 'medium', emoji: '🌐', icon: 'map-search-outline', target: 500, value: allFound },
  { id: 'week_daily_days_7', tier: 'hard', emoji: '🗓️', icon: 'calendar-star', target: 7, value: (games) => distinct(games.filter(isDaily).map((game) => game.dailyKey)) },
  { id: 'week_daily_wins_20', tier: 'hard', emoji: '🏆', icon: 'trophy-outline', target: 20, value: (games) => count(games, (game) => isDaily(game) && game.solved) },
  { id: 'week_perfect_3', tier: 'hard', emoji: '💠', icon: 'star-four-points-outline', target: 3, value: (games) => count(games, isPerfect) },
  { id: 'week_types_6', tier: 'easy', emoji: '🧩', icon: 'puzzle-outline', target: 6, value: (games) => distinct(games.map((game) => game.gameType)) },
  { id: 'week_ascension_3', tier: 'medium', emoji: '🏔️', icon: 'summit', target: 3, value: (games) => count(games, (game) => game.mode === 'ascension') },
]

// ---------- Periods (Paris time, like dailyKey.js, which can't be imported here: it reads the server clock) ----------

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
const DAY_MS = 24 * 60 * 60 * 1000

// '2026-10-19'
export const missionDayAt = (time) => dayFormatter.format(new Date(time))

const dayTime = (day) => Date.parse(`${day}T00:00:00Z`)
const dayOf = (time) => new Date(time).toISOString().slice(0, 10)

// ISO week of a day: '2026-W43' (weeks start on Monday; the week of January 4th is the first).
export function weekKeyOf(day) {
  const time = dayTime(day)
  const weekday = (new Date(time).getUTCDay() + 6) % 7
  const thursday = new Date(time + (3 - weekday) * DAY_MS)
  const year = thursday.getUTCFullYear()
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / DAY_MS / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// The 7 days of the week of `day`, Monday first.
export function weekDays(day) {
  const time = dayTime(day)
  const monday = time - ((new Date(time).getUTCDay() + 6) % 7) * DAY_MS
  return Array.from({ length: 7 }, (_, index) => dayOf(monday + index * DAY_MS))
}

// ---------- Missions of a period ----------

function seedOf(text) {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export const dailyMissions = (day) => seededShuffle(DAILY_POOL, seedOf(`missions:day:${day}`)).slice(0, DAILY_MISSIONS)

// Each tier is shuffled with its own seed; the missions come in the order easy, medium, hard.
export const weeklyMissions = (week) =>
  Object.entries(WEEKLY_MISSIONS_BY_TIER).flatMap(([tier, size]) =>
    seededShuffle(
      WEEKLY_POOL.filter((mission) => mission.tier === tier),
      seedOf(`missions:week:${week}:${tier}`),
    ).slice(0, size),
  )

// Games of the history with their day: `playedAt` in ms (fromSnapshot in gameHistory.js), Firestore Timestamps too.
const playedTime = (game) => (typeof game.playedAt === 'number' ? game.playedAt : game.playedAt?.toMillis?.())

/**
 * Missions of the day and week of `now` with their progress from `games` (any order, may hold older games):
 * { day, week, daily: [{ mission, progress, done }], weekly: [...], todayGames }.
 */
export function missionsAt(games, now) {
  const day = missionDayAt(now)
  const week = weekKeyOf(day)
  const days = new Set(weekDays(day))
  const dated = games.map((game) => ({ game, day: Number.isFinite(playedTime(game)) ? missionDayAt(playedTime(game)) : null }))
  const ofWeek = dated.filter((entry) => days.has(entry.day)).map((entry) => entry.game)
  const ofDay = dated.filter((entry) => entry.day === day).map((entry) => entry.game)
  const withProgress = (games) => (mission) => {
    const progress = Math.min(mission.target, mission.value(games))
    return { mission, progress, done: progress >= mission.target }
  }
  return {
    day,
    week,
    daily: dailyMissions(day).map(withProgress(ofDay)),
    weekly: weeklyMissions(week).map(withProgress(ofWeek)),
    todayGames: ofDay.length,
  }
}

// ---------- XP state (users/{uid}.xp, written by the server only) ----------
//   { total, level, day, dayMissions: [ids paid today, BONUS_ID], dayGames: games paid today,
//     week, weekMissions: [ids paid this week, BONUS_ID] }

// XP from level n to n + 1.
export const levelCost = (level) => LEVEL_BASE + LEVEL_STEP * (level - 1)

/** Level from total XP: { level, into: XP earned in this level, needed: XP of this level }. Level 1 at 0 XP. */
export function levelOf(total) {
  let level = 1
  let rest = Math.max(0, Math.floor(total ?? 0))
  while (rest >= levelCost(level)) {
    rest -= levelCost(level)
    level += 1
  }
  return { level, into: rest, needed: levelCost(level) }
}

const idList = (value) => (Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [])

/** users/{uid}.xp read safely (any document, even without it), as it stands on `day` / `week`. */
export function readXp(data, day, week) {
  const raw = data?.xp ?? {}
  const total = Number.isFinite(raw.total) && raw.total > 0 ? Math.floor(raw.total) : 0
  const sameDay = raw.day === day
  const sameWeek = raw.week === week
  return {
    total,
    ...levelOf(total),
    day,
    dayMissions: sameDay ? idList(raw.dayMissions) : [],
    dayGames: sameDay && Number.isInteger(raw.dayGames) ? raw.dayGames : 0,
    week,
    weekMissions: sameWeek ? idList(raw.weekMissions) : [],
  }
}

/**
 * What `games` earn on top of the `state` already paid (readXp at `now`): { gained, fragments, state } with the new
 * state to store, `fragments` earned by the missions, bonuses and levels newly paid, and `levelUp` when the
 * level went up. Missions done but already paid pay nothing.
 */
export function grantXp(state, games, now) {
  const progress = missionsAt(games, now)
  let gained = 0
  let fragments = 0
  const pay = (paid, entries, rewardOf, bonusXp, bonusFragments) => {
    const next = [...paid]
    for (const { mission, done } of entries) {
      if (done && !next.includes(mission.id)) {
        next.push(mission.id)
        const reward = rewardOf(mission)
        gained += reward.xp
        fragments += reward.fragments
      }
    }
    if (entries.every((entry) => entry.done) && !next.includes(BONUS_ID)) {
      next.push(BONUS_ID)
      gained += bonusXp
      fragments += bonusFragments
    }
    return next
  }
  const dailyReward = { xp: DAILY_MISSION_XP, fragments: DAILY_MISSION_FRAGMENTS }
  const dayMissions = pay(state.dayMissions, progress.daily, () => dailyReward, DAILY_BONUS_XP, DAILY_BONUS_FRAGMENTS)
  const weekMissions = pay(state.weekMissions, progress.weekly, (mission) => WEEKLY_TIERS[mission.tier], WEEKLY_BONUS_XP, WEEKLY_BONUS_FRAGMENTS)
  const dayGames = Math.max(state.dayGames, Math.min(GAMES_PER_DAY, progress.todayGames))
  gained += (dayGames - state.dayGames) * GAME_XP
  const total = state.total + gained
  const { level } = levelOf(total)
  // state.level is levelOf(stored total) (readXp), so each level gained is paid once.
  fragments += (level - state.level) * LEVEL_UP_FRAGMENTS
  return {
    gained,
    fragments,
    levelUp: level > state.level,
    state: { total, level, day: progress.day, dayMissions, dayGames, week: progress.week, weekMissions },
  }
}

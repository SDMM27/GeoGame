// Missions and XP (docs/plan-fonctionnalites.md, step 5): the rules, shared by the server (api/_lib/xp.mjs, which alone
// writes XP) and the clients (progress shown on the home page and the profile). No Firebase import: the API bundles
// this file.
//
// - Every day (Paris midnight, like the dailies) 3 missions are drawn from DAILY_POOL, the same for everyone; every
//   week (Monday to Sunday, Paris) 5 from WEEKLY_POOL: 2 easy, 2 medium and 1 hard (WEEKLY_TIERS: the harder, the
//   more XP and fragments). Every mission has a family, and a draw never holds two of the same family, even across
//   the tiers of the week. A mission is done when the player's games of that day or week reach its target. Each
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
import { isGameHidden } from './gameAvailability.js'
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
const ofType = (gameType) => (game) => game.gameType === gameType
const dailyOf = (gameType) => (game) => isDaily(game) && game.gameType === gameType
const isChallenge = dailyOf(GAME_TYPES.DAILY_CHALLENGE)
const isCountryOfDay = dailyOf(GAME_TYPES.COUNTRY_OF_DAY)
// The daily challenge has 12 questions: `score` is the number of correct answers.
const isChallengeOf10 = (game) => isChallenge(game) && game.score >= 10
const isMulti = (game) => game.mode === 'multi'
const HARD_DIFFICULTIES = ['Difficile', 'Impossible', 'Hardcore']
const DIFFICULTY_TYPES = [...SETUP_TYPES, GAME_TYPES.HARDCORE, GAME_TYPES.MISSING_FLAG]
const isHardDifficulty = (game) => HARD_DIFFICULTIES.includes(game.difficulty)
const isDifficult = (game) => DIFFICULTY_TYPES.includes(game.gameType) && isHardDifficulty(game)

// `value(games)`: progress from the games of the period; weekly missions have a `tier` (WEEKLY_TIERS). `family`: a draw
// never holds two missions of the same family (they would measure almost the same thing). Titles are in i18n under
// `missions.<id>`, with {{count}} the target. `emoji` is used by the website, `icon` (MaterialCommunityIcons) by the app.
// `game`: the mission is only about that game, and isn't drawn while it is hidden (gameAvailability.js).
export const DAILY_POOL = [
  { id: 'play_3', family: 'volume', emoji: '🎮', icon: 'gamepad-variant-outline', target: 3, value: (games) => games.length },
  { id: 'play_5', family: 'volume', emoji: '🕹️', icon: 'controller-classic-outline', target: 5, value: (games) => games.length },
  { id: 'dailies_3', family: 'dailies', emoji: '📅', icon: 'calendar-check-outline', target: 3, value: (games) => count(games, isDaily) },
  { id: 'daily_wins_2', family: 'dailies', emoji: '✅', icon: 'check-decagram-outline', target: 2, value: (games) => count(games, (game) => isDaily(game) && game.solved) },
  { id: 'daily_challenge', family: 'challenge', emoji: '🎯', icon: 'bullseye-arrow', target: 1, value: (games) => count(games, isChallenge) },
  { id: 'challenge_10', family: 'challenge', emoji: '🥇', icon: 'bullseye', target: 1, value: (games) => count(games, isChallengeOf10) },
  { id: 'border_guess', family: 'border', emoji: '🗾', icon: 'map-outline', target: 1, value: (games) => count(games, dailyOf(GAME_TYPES.BORDER_GUESS)) },
  { id: 'country_clue', family: 'clue', emoji: '🔎', icon: 'magnify', target: 1, value: (games) => count(games, dailyOf(GAME_TYPES.COUNTRY_CLUE)) },
  { id: 'country_of_day', family: 'country_of_day', emoji: '🌐', icon: 'earth', target: 1, value: (games) => count(games, isCountryOfDay) },
  { id: 'country_of_day_flawless', family: 'country_of_day', emoji: '💯', icon: 'star-circle-outline', target: 1, value: (games) => count(games, (game) => isCountryOfDay(game) && game.solved && game.errors === 0) },
  { id: 'daily_quiz', game: GAME_TYPES.QUIZ, family: 'quiz', emoji: '❓', icon: 'help-circle-outline', target: 1, value: (games) => count(games, dailyOf(GAME_TYPES.QUIZ)) },
  { id: 'quiz_infinite_1', game: GAME_TYPES.QUIZ, family: 'quiz', emoji: '♾️', icon: 'infinity', target: 1, value: (games) => count(games, (game) => game.gameType === GAME_TYPES.QUIZ && game.mode === 'infinite') },
  { id: 'ranking', family: 'ranking', emoji: '📊', icon: 'sort-descending', target: 1, value: (games) => count(games, dailyOf(GAME_TYPES.RANKING)) },
  { id: 'voyage', family: 'voyage', emoji: '🧳', icon: 'airplane', target: 1, value: (games) => count(games, dailyOf(GAME_TYPES.VOYAGE_VOYAGE)) },
  { id: 'flags_20', family: 'flags', emoji: '🚩', icon: 'flag-variant-outline', target: 20, value: (games) => sumFound(games, GAME_TYPES.FLAGS) },
  { id: 'missing_flag_1', family: 'flags', emoji: '🏳️', icon: 'flag-outline', target: 1, value: (games) => count(games, ofType(GAME_TYPES.MISSING_FLAG)) },
  { id: 'placement_20', family: 'placement', emoji: '🌍', icon: 'earth', target: 20, value: (games) => sumFound(games, GAME_TYPES.PLACEMENT) },
  { id: 'hardcore_1', family: 'hardcore', emoji: '🔥', icon: 'fire', target: 1, value: (games) => count(games, ofType(GAME_TYPES.HARDCORE)) },
  { id: 'capitals_15', family: 'capitals', emoji: '🏛️', icon: 'bank-outline', target: 15, value: (games) => sumFound(games, GAME_TYPES.CAPITALS) },
  { id: 'ascension_1', family: 'ascension', emoji: '⛰️', icon: 'image-filter-hdr', target: 1, value: (games) => count(games, (game) => game.mode === 'ascension') },
  { id: 'survival_1', family: 'survival', emoji: '❤️', icon: 'heart-pulse', target: 1, value: (games) => count(games, ofType(GAME_TYPES.SURVIVAL)) },
  { id: 'perfect_1', family: 'perfect', emoji: '💎', icon: 'diamond-stone', target: 1, value: (games) => count(games, isPerfect) },
  { id: 'types_3', family: 'types', emoji: '🧭', icon: 'compass-outline', target: 3, value: (games) => distinct(games.map((game) => game.gameType)) },
  { id: 'multi_1', family: 'multi', emoji: '👥', icon: 'account-group-outline', target: 1, value: (games) => count(games, isMulti) },
  { id: 'found_50', family: 'found', emoji: '🗺️', icon: 'map-marker-multiple-outline', target: 50, value: allFound },
]

export const WEEKLY_POOL = [
  // Easy
  { id: 'week_play_20', family: 'volume', tier: 'easy', emoji: '🕹️', icon: 'controller-classic-outline', target: 20, value: (games) => games.length },
  { id: 'week_dailies_15', family: 'dailies', tier: 'easy', emoji: '📆', icon: 'calendar-multiselect', target: 15, value: (games) => count(games, isDaily) },
  { id: 'week_types_6', family: 'types', tier: 'easy', emoji: '🧩', icon: 'puzzle-outline', target: 6, value: (games) => distinct(games.map((game) => game.gameType)) },
  { id: 'week_found_200', family: 'found', tier: 'easy', emoji: '🗺️', icon: 'map-marker-multiple-outline', target: 200, value: allFound },
  { id: 'week_flags_60', family: 'flags', tier: 'easy', emoji: '🚩', icon: 'flag-variant-outline', target: 60, value: (games) => sumFound(games, GAME_TYPES.FLAGS) },
  { id: 'week_placement_60', family: 'placement', tier: 'easy', emoji: '🌍', icon: 'earth', target: 60, value: (games) => sumFound(games, GAME_TYPES.PLACEMENT) },
  { id: 'week_capitals_40', family: 'capitals', tier: 'easy', emoji: '🏛️', icon: 'bank-outline', target: 40, value: (games) => sumFound(games, GAME_TYPES.CAPITALS) },
  { id: 'week_country_of_day_5', family: 'country_of_day', tier: 'easy', emoji: '🌐', icon: 'earth', target: 5, value: (games) => distinct(games.filter(isCountryOfDay).map((game) => game.dailyKey)) },
  { id: 'week_challenge_3', family: 'challenge', tier: 'easy', emoji: '🎯', icon: 'bullseye-arrow', target: 3, value: (games) => distinct(games.filter(isChallenge).map((game) => game.dailyKey)) },
  // Medium
  { id: 'week_daily_days_5', family: 'daily_days', tier: 'medium', emoji: '🔥', icon: 'fire', target: 5, value: (games) => distinct(games.filter(isDaily).map((game) => game.dailyKey)) },
  { id: 'week_daily_wins_10', family: 'daily_wins', tier: 'medium', emoji: '🏅', icon: 'medal-outline', target: 10, value: (games) => count(games, (game) => isDaily(game) && game.solved) },
  { id: 'week_ascension_3', family: 'ascension', tier: 'medium', emoji: '🏔️', icon: 'summit', target: 3, value: (games) => count(games, (game) => game.mode === 'ascension') },
  { id: 'week_found_500', family: 'found', tier: 'medium', emoji: '🌐', icon: 'map-search-outline', target: 500, value: allFound },
  { id: 'week_survival_5', family: 'survival', tier: 'medium', emoji: '❤️', icon: 'heart-pulse', target: 5, value: (games) => count(games, ofType(GAME_TYPES.SURVIVAL)) },
  { id: 'week_hardcore_3', family: 'hardcore', tier: 'medium', emoji: '🔥', icon: 'skull-outline', target: 3, value: (games) => count(games, ofType(GAME_TYPES.HARDCORE)) },
  { id: 'week_multi_3', family: 'multi', tier: 'medium', emoji: '👥', icon: 'account-group-outline', target: 3, value: (games) => count(games, isMulti) },
  { id: 'week_difficult_3', family: 'difficulty', tier: 'medium', emoji: '💪', icon: 'arm-flex-outline', target: 3, value: (games) => count(games, isDifficult) },
  { id: 'week_missing_flag_3', family: 'flags', tier: 'medium', emoji: '🏳️', icon: 'flag-outline', target: 3, value: (games) => count(games, ofType(GAME_TYPES.MISSING_FLAG)) },
  // Hard
  { id: 'week_daily_days_7', family: 'daily_days', tier: 'hard', emoji: '🗓️', icon: 'calendar-star', target: 7, value: (games) => distinct(games.filter(isDaily).map((game) => game.dailyKey)) },
  { id: 'week_daily_wins_20', family: 'daily_wins', tier: 'hard', emoji: '🏆', icon: 'trophy-outline', target: 20, value: (games) => count(games, (game) => isDaily(game) && game.solved) },
  { id: 'week_perfect_3', family: 'perfect', tier: 'hard', emoji: '💠', icon: 'star-four-points-outline', target: 3, value: (games) => count(games, isPerfect) },
  { id: 'week_types_10', family: 'types', tier: 'hard', emoji: '🧭', icon: 'compass-outline', target: 10, value: (games) => distinct(games.map((game) => game.gameType)) },
  { id: 'week_found_1000', family: 'found', tier: 'hard', emoji: '🌏', icon: 'earth-arrow-right', target: 1000, value: allFound },
  { id: 'week_play_50', family: 'volume', tier: 'hard', emoji: '🎮', icon: 'gamepad-variant-outline', target: 50, value: (games) => games.length },
  { id: 'week_perfect_hard_1', family: 'perfect', tier: 'hard', emoji: '👑', icon: 'crown-outline', target: 1, value: (games) => count(games, (game) => isPerfect(game) && isHardDifficulty(game)) },
  { id: 'week_challenge_10', family: 'challenge', tier: 'hard', emoji: '🥇', icon: 'bullseye', target: 1, value: (games) => count(games, isChallengeOf10) },
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

// The first `size` missions of `shuffled` whose family isn't in `families` yet (which gets the families taken).
function pickDistinctFamilies(shuffled, size, families) {
  const picked = []
  for (const mission of shuffled) {
    if (picked.length === size) break
    if (families.has(mission.family)) continue
    families.add(mission.family)
    picked.push(mission)
  }
  return picked
}

// The missions that can be drawn: none about a hidden game
const drawable = (pool) => pool.filter((mission) => !isGameHidden(mission.game))

export const dailyMissions = (day) => pickDistinctFamilies(seededShuffle(drawable(DAILY_POOL), seedOf(`missions:day:${day}`)), DAILY_MISSIONS, new Set())

// Each tier is shuffled with its own seed. The hard tier is drawn first, then medium, then easy, each skipping the
// families already taken; the missions come in the order easy, medium, hard.
export function weeklyMissions(week) {
  const families = new Set()
  const drawn = {}
  for (const tier of Object.keys(WEEKLY_MISSIONS_BY_TIER).reverse()) {
    const shuffled = seededShuffle(
      drawable(WEEKLY_POOL).filter((mission) => mission.tier === tier),
      seedOf(`missions:week:${week}:${tier}`),
    )
    drawn[tier] = pickDistinctFamilies(shuffled, WEEKLY_MISSIONS_BY_TIER[tier], families)
  }
  return Object.keys(WEEKLY_MISSIONS_BY_TIER).flatMap((tier) => drawn[tier])
}

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

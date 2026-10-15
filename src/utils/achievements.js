// Achievements unlocked from a player's history. Pure functions.
// Each one reports a progress value against a target; titles are in i18n under `achievements.<id>`.
// `emoji` is used by the website, `icon` (MaterialCommunityIcons) by the app.
// `sticky` (challenges): once unlocked it stays unlocked, even when the game left the capped history (see `remembered`).
// `tier` ranks the badge (see TIERS): a player's best badges are the highest tiers they unlocked (src/utils/badges.js).
import { GAME_TYPES } from './gameTypes'
import { DAILY_GAME_TYPES, dailyTypesOn } from './profileStats'

const ALL_GAME_TYPES = Object.values(GAME_TYPES)

export const TIERS = ['bronze', 'silver', 'gold', 'legend']
export const TIER_COLORS = { bronze: '#D08A4E', silver: '#B8C4D6', gold: '#F5B83D', legend: '#C792FF' }

export const tierRank = (achievement) => TIERS.indexOf(achievement.tier)

// Same list as DIFFICULTIES in leaderboards.js (not imported: this file stays free of Firebase).
const CHALLENGE_DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const CHALLENGE_GAME_TYPES = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]
const HARD_DIFFICULTIES = ['Difficile', 'Impossible', 'Hardcore']

const isDaily = (game) => game.mode === 'daily'
const isSolvedDaily = (game) => isDaily(game) && game.solved
const isSetupGame = (game) => game.mode === 'standard' || game.mode === 'ascension'
// A setup game where every country was found.
const isPerfect = (game) => game.total >= 10 && game.found === game.total
// Daily game solved on the first guess (the Ranking has no "first try").
const isFirstTry = (game) => isSolvedDaily(game) && game.attempts === 1 && game.gameType !== GAME_TYPES.RANKING

// "<gameType>|<difficulty>" of every perfect game of the three setup games.
const perfectPairs = (games) =>
  new Set(
    games
      .filter((game) => CHALLENGE_GAME_TYPES.includes(game.gameType) && CHALLENGE_DIFFICULTIES.includes(game.difficulty) && isPerfect(game))
      .map((game) => `${game.gameType}|${game.difficulty}`)
  )
// Difficulties in which `gameType` has a perfect game.
const perfectDifficulties = (games, gameType) => CHALLENGE_DIFFICULTIES.filter((difficulty) => perfectPairs(games).has(`${gameType}|${difficulty}`)).length
// Game types that have a perfect game at `difficulty`.
const perfectTypes = (games, difficulty) => CHALLENGE_GAME_TYPES.filter((gameType) => perfectPairs(games).has(`${gameType}|${difficulty}`)).length
const perfectAt = (games, gameType, difficulty) => perfectPairs(games).has(`${gameType}|${difficulty}`) ? 1 : 0

const count = (games, predicate) => games.reduce((sum, game) => sum + (predicate(game) ? 1 : 0), 0)
const flag = (games, predicate) => (games.some(predicate) ? 1 : 0)
const sumFound = (games, gameType) =>
  games.reduce((sum, game) => (game.gameType === gameType && typeof game.found === 'number' ? sum + game.found : sum), 0)
const bestOf = (games, gameType, read) =>
  games.reduce((max, game) => (game.gameType === gameType ? Math.max(max, read(game) ?? 0) : max), 0)

export const ACHIEVEMENTS = [
  // Games played
  { id: 'first_game', tier: 'bronze', emoji: '🎯', icon: 'flag-checkered', target: 1, value: ({ stats }) => stats.total },
  { id: 'games_10', tier: 'bronze', emoji: '🔟', icon: 'numeric-10-box-outline', target: 10, value: ({ stats }) => stats.total },
  { id: 'games_50', tier: 'bronze', emoji: '🎮', icon: 'gamepad-variant-outline', target: 50, value: ({ stats }) => stats.total },
  { id: 'games_100', tier: 'silver', emoji: '💯', icon: 'trophy-outline', target: 100, value: ({ stats }) => stats.total },
  { id: 'games_250', tier: 'gold', emoji: '🕹️', icon: 'controller-classic-outline', target: 250, value: ({ stats }) => stats.total },
  {
    id: 'all_games',
    tier: 'silver',
    emoji: '🧭',
    icon: 'compass-rose',
    target: ALL_GAME_TYPES.length,
    value: ({ stats }) => ALL_GAME_TYPES.filter((type) => stats.byGame[type]).length,
  },
  { id: 'marathon', tier: 'silver', emoji: '🏃', icon: 'run-fast', target: 10, value: ({ games }) => bestGamesInADay(games) },
  {
    id: 'night_owl',
    tier: 'bronze',
    emoji: '🦉',
    icon: 'owl',
    target: 1,
    value: ({ games }) => flag(games, (game) => game.playedAt && new Date(game.playedAt).getHours() < 5),
  },
  {
    id: 'early_bird',
    tier: 'bronze',
    emoji: '🐦',
    icon: 'weather-sunset-up',
    target: 1,
    value: ({ games }) =>
      flag(games, (game) => {
        const hour = game.playedAt ? new Date(game.playedAt).getHours() : null
        return hour != null && hour >= 5 && hour < 7
      }),
  },

  // Daily challenges
  { id: 'streak_3', tier: 'bronze', emoji: '🔥', icon: 'fire', target: 3, value: ({ stats }) => stats.streak.best },
  { id: 'streak_7', tier: 'silver', emoji: '📅', icon: 'calendar-check-outline', target: 7, value: ({ stats }) => stats.streak.best },
  { id: 'streak_30', tier: 'legend', emoji: '🏅', icon: 'medal-outline', target: 30, value: ({ stats }) => stats.streak.best },
  {
    id: 'daily_sweep',
    tier: 'silver',
    emoji: '🌞',
    icon: 'white-balance-sunny',
    target: DAILY_GAME_TYPES.length,
    value: ({ games }) => bestDailySweep(games),
  },
  { id: 'sweep_7', tier: 'gold', emoji: '👑', icon: 'crown-outline', target: 7, value: ({ games }) => sweepDays(games) },
  { id: 'daily_wins_25', tier: 'silver', emoji: '✅', icon: 'check-all', target: 25, value: ({ stats }) => stats.dailyWins },
  { id: 'daily_wins_100', tier: 'legend', emoji: '🏆', icon: 'trophy-award', target: 100, value: ({ stats }) => stats.dailyWins },
  { id: 'first_try', tier: 'silver', emoji: '⚡', icon: 'lightning-bolt-outline', target: 1, value: ({ games }) => flag(games, isFirstTry) },
  { id: 'sharp_5', tier: 'gold', emoji: '🎯', icon: 'target', target: 5, value: ({ games }) => count(games, isFirstTry) },
  {
    id: 'perfect_ranking',
    tier: 'gold',
    emoji: '📊',
    icon: 'format-list-numbered',
    target: 1,
    value: ({ games }) => flag(games, (game) => isDaily(game) && game.gameType === GAME_TYPES.RANKING && game.totalError === 0),
  },
  {
    id: 'no_hint',
    tier: 'silver',
    emoji: '🧠',
    icon: 'lightbulb-off-outline',
    target: 10,
    value: ({ games }) => count(games, (game) => isSolvedDaily(game) && game.gameType === GAME_TYPES.QUIZ && game.hints === 0),
  },

  // Exploring the world
  { id: 'explorer', tier: 'silver', emoji: '🗺️', icon: 'map-outline', target: 500, value: ({ stats }) => stats.countriesFound },
  { id: 'globetrotter', tier: 'legend', emoji: '🌍', icon: 'earth', target: 5000, value: ({ stats }) => stats.countriesFound },
  {
    id: 'continent_trotter',
    tier: 'silver',
    emoji: '🧳',
    icon: 'earth-box',
    target: 5,
    value: ({ games }) => new Set(games.map((game) => game.continent).filter(Boolean)).size,
  },
  { id: 'cartographer', tier: 'silver', emoji: '📍', icon: 'map-marker-star-outline', target: 300, value: ({ games }) => sumFound(games, GAME_TYPES.PLACEMENT) },
  { id: 'vexillologist', tier: 'silver', emoji: '🚩', icon: 'flag-variant-outline', target: 300, value: ({ games }) => sumFound(games, GAME_TYPES.FLAGS) },
  { id: 'capital_expert', tier: 'silver', emoji: '🏛️', icon: 'bank-outline', target: 300, value: ({ games }) => sumFound(games, GAME_TYPES.CAPITALS) },
  { id: 'perfect_run', tier: 'silver', emoji: '✨', icon: 'star-circle-outline', target: 1, value: ({ games }) => flag(games, (game) => isSetupGame(game) && isPerfect(game)) },
  {
    id: 'hardcore',
    tier: 'gold',
    emoji: '💀',
    icon: 'skull-outline',
    target: 1,
    value: ({ games }) => flag(games, (game) => game.mode === 'standard' && game.difficulty === 'Hardcore'),
  },
  {
    id: 'master',
    tier: 'legend',
    emoji: '🎓',
    icon: 'school-outline',
    target: 1,
    value: ({ games }) => flag(games, (game) => game.mode === 'standard' && HARD_DIFFICULTIES.includes(game.difficulty) && isPerfect(game)),
  },
  { id: 'ascension', tier: 'silver', emoji: '🏔️', icon: 'image-filter-hdr', target: 1, value: ({ games }) => flag(games, (game) => game.mode === 'ascension') },

  // Quiz
  {
    id: 'quiz_flawless',
    tier: 'silver',
    emoji: '💎',
    icon: 'diamond-stone',
    target: 1,
    value: ({ games }) => flag(games, (game) => game.gameType === GAME_TYPES.QUIZ && game.answered >= 10 && game.correct === game.answered),
  },
  { id: 'quiz_streak_10', tier: 'silver', emoji: '🔗', icon: 'link-variant', target: 10, value: ({ games }) => bestOf(games, GAME_TYPES.QUIZ, (game) => game.bestStreak) },
  { id: 'quiz_streak_25', tier: 'legend', emoji: '🧬', icon: 'brain', target: 25, value: ({ games }) => bestOf(games, GAME_TYPES.QUIZ, (game) => game.bestStreak) },

  // Survival (the score is the number of rounds survived)
  { id: 'survival_10', tier: 'bronze', emoji: '❤️', icon: 'heart-outline', target: 10, value: ({ games }) => bestOf(games, GAME_TYPES.SURVIVAL, (game) => game.score) },
  { id: 'survival_25', tier: 'silver', emoji: '💪', icon: 'heart-pulse', target: 25, value: ({ games }) => bestOf(games, GAME_TYPES.SURVIVAL, (game) => game.score) },
  { id: 'survival_50', tier: 'legend', emoji: '🛡️', icon: 'shield-check-outline', target: 50, value: ({ games }) => bestOf(games, GAME_TYPES.SURVIVAL, (game) => game.score) },
  {
    id: 'survival_one_life',
    tier: 'gold',
    emoji: '☝️',
    icon: 'numeric-1-box-outline',
    target: 15,
    value: ({ games }) => bestOf(games, GAME_TYPES.SURVIVAL, (game) => (game.lives === 1 ? game.score : 0)),
  },

  // Playing together
  { id: 'multiplayer', tier: 'bronze', emoji: '🤝', icon: 'account-group-outline', target: 1, value: ({ games }) => flag(games, (game) => game.mode === 'multi') },
  { id: 'multi_5', tier: 'silver', emoji: '🎉', icon: 'account-group', target: 5, value: ({ games }) => count(games, (game) => game.mode === 'multi') },
  { id: 'multi_25', tier: 'gold', emoji: '🥳', icon: 'party-popper', target: 25, value: ({ games }) => count(games, (game) => game.mode === 'multi') },
  { id: 'friend', tier: 'bronze', emoji: '💬', icon: 'account-heart-outline', target: 1, value: ({ friendsCount }) => friendsCount ?? 0 },

  // Challenges (sticky): perfect games across difficulties and game types
  { id: 'capital_tour', sticky: true, tier: 'gold', emoji: '🏙️', icon: 'city-variant-outline', target: 5, value: ({ games }) => perfectDifficulties(games, GAME_TYPES.CAPITALS) },
  { id: 'flag_tour', sticky: true, tier: 'gold', emoji: '🎌', icon: 'flag-triangle', target: 5, value: ({ games }) => perfectDifficulties(games, GAME_TYPES.FLAGS) },
  { id: 'placement_tour', sticky: true, tier: 'gold', emoji: '🧭', icon: 'map-search-outline', target: 5, value: ({ games }) => perfectDifficulties(games, GAME_TYPES.PLACEMENT) },
  { id: 'capital_impossible', sticky: true, tier: 'legend', emoji: '🏰', icon: 'castle', target: 1, value: ({ games }) => perfectAt(games, GAME_TYPES.CAPITALS, 'Impossible') },
  { id: 'flag_impossible', sticky: true, tier: 'legend', emoji: '🏴', icon: 'flag-variant', target: 1, value: ({ games }) => perfectAt(games, GAME_TYPES.FLAGS, 'Impossible') },
  { id: 'placement_impossible', sticky: true, tier: 'legend', emoji: '📌', icon: 'map-marker-check-outline', target: 1, value: ({ games }) => perfectAt(games, GAME_TYPES.PLACEMENT, 'Impossible') },
  { id: 'impossible_trio', sticky: true, tier: 'gold', emoji: '🔱', icon: 'trident', target: 3, value: ({ games }) => perfectTypes(games, 'Impossible') },
  { id: 'hardcore_trio', sticky: true, tier: 'legend', emoji: '☠️', icon: 'skull-crossbones-outline', target: 3, value: ({ games }) => perfectTypes(games, 'Hardcore') },
  {
    id: 'world_champion',
    sticky: true,
    tier: 'legend',
    emoji: '🌐',
    icon: 'earth-arrow-right',
    target: CHALLENGE_GAME_TYPES.length * CHALLENGE_DIFFICULTIES.length,
    value: ({ games }) => perfectPairs(games).size,
  },
]

// Most games played on a single (local) day.
function bestGamesInADay(games) {
  const perDay = {}
  for (const game of games) {
    if (!game.playedAt) continue
    const day = new Date(game.playedAt).toDateString()
    perDay[day] = (perDay[day] ?? 0) + 1
  }
  return Math.max(0, ...Object.values(perDay))
}

// Daily challenges done per day, as [dailies there were that day, done among them].
function dailyTypesByDay(games) {
  const perDay = {}
  for (const game of games) {
    if (!isDaily(game) || !game.dailyKey) continue
    ;(perDay[game.dailyKey] ??= new Set()).add(game.gameType)
  }
  return Object.entries(perDay).map(([day, types]) => {
    const existing = dailyTypesOn(day)
    return [existing, existing.filter((type) => types.has(type))]
  })
}

// Most daily challenges done on a single day. A day with every daily of that day done counts as all of today's dailies,
// so that a sweep made before a daily was added still reaches the target.
const bestDailySweep = (games) =>
  Math.max(0, ...dailyTypesByDay(games).map(([existing, done]) => (done.length >= existing.length ? DAILY_GAME_TYPES.length : done.length)))

// Days on which every daily challenge (there was that day) was done.
const sweepDays = (games) => dailyTypesByDay(games).filter(([existing, done]) => done.length >= existing.length).length

// Ids of the sticky achievements (challenges) unlocked in a computeAchievements() list.
export const unlockedStickyIds = (achievements) => achievements.filter((achievement) => achievement.sticky && achievement.unlocked).map((achievement) => achievement.id)

const sortAchievements = (list) =>
  list.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || (a.unlocked ? tierRank(b) - tierRank(a) : 0))

// Marks the sticky achievements whose id is in `remembered` as unlocked, then sorts again.
export function withRemembered(achievements, remembered = []) {
  if (!remembered.length) return achievements
  return sortAchievements(
    achievements.map((achievement) =>
      achievement.sticky && !achievement.unlocked && remembered.includes(achievement.id)
        ? { ...achievement, progress: achievement.target, unlocked: true }
        : achievement
    )
  )
}

// [{ ...achievement, progress, unlocked }], unlocked first (the highest tiers first), then in list order.
// Without `friendsCount` (another player's profile: their friends aren't readable), 'friend' is left out.
// `remembered`: ids of the challenges the player unlocked before (users/{uid}.challenges), which stay unlocked.
export function computeAchievements({ stats, games, friendsCount, remembered = [] }) {
  const list = ACHIEVEMENTS.filter((achievement) => friendsCount != null || achievement.id !== 'friend').map((achievement) => {
    const progress = Math.min(achievement.value({ stats, games, friendsCount }), achievement.target)
    return { ...achievement, progress, unlocked: progress >= achievement.target }
  })
  return withRemembered(sortAchievements(list), remembered)
}

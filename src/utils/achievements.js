// Achievements unlocked from a player's history. Pure functions.
// Each one reports a progress value against a target; titles are in i18n under `achievements.<id>`.
// `emoji` is used by the website, `icon` (MaterialCommunityIcons) by the app.
import { GAME_TYPES } from './gameTypes'
import { DAILY_GAME_TYPES } from './profileStats'

const ALL_GAME_TYPES = Object.values(GAME_TYPES)

export const ACHIEVEMENTS = [
  { id: 'first_game', emoji: '🎯', icon: 'flag-checkered', target: 1, value: ({ stats }) => stats.total },
  { id: 'games_50', emoji: '🎮', icon: 'gamepad-variant-outline', target: 50, value: ({ stats }) => stats.total },
  { id: 'games_250', emoji: '🕹️', icon: 'controller-classic-outline', target: 250, value: ({ stats }) => stats.total },
  {
    id: 'all_games',
    emoji: '🧭',
    icon: 'compass-rose',
    target: ALL_GAME_TYPES.length,
    value: ({ stats }) => ALL_GAME_TYPES.filter((type) => stats.byGame[type]).length,
  },
  { id: 'streak_3', emoji: '🔥', icon: 'fire', target: 3, value: ({ stats }) => stats.streak.best },
  { id: 'streak_7', emoji: '📅', icon: 'calendar-check-outline', target: 7, value: ({ stats }) => stats.streak.best },
  { id: 'streak_30', emoji: '🏅', icon: 'medal-outline', target: 30, value: ({ stats }) => stats.streak.best },
  {
    id: 'daily_sweep',
    emoji: '🌞',
    icon: 'white-balance-sunny',
    target: DAILY_GAME_TYPES.length,
    value: ({ games }) => bestDailySweep(games),
  },
  {
    id: 'first_try',
    emoji: '⚡',
    icon: 'lightning-bolt-outline',
    target: 1,
    value: ({ games }) =>
      games.some((game) => game.mode === 'daily' && game.solved && game.attempts === 1 && game.gameType !== GAME_TYPES.RANKING) ? 1 : 0,
  },
  { id: 'explorer', emoji: '🗺️', icon: 'map-outline', target: 500, value: ({ stats }) => stats.countriesFound },
  { id: 'globetrotter', emoji: '🌍', icon: 'earth', target: 5000, value: ({ stats }) => stats.countriesFound },
  {
    id: 'hardcore',
    emoji: '💀',
    icon: 'skull-outline',
    target: 1,
    value: ({ games }) => (games.some((game) => game.mode === 'standard' && game.difficulty === 'Hardcore') ? 1 : 0),
  },
  {
    id: 'ascension',
    emoji: '🏔️',
    icon: 'image-filter-hdr',
    target: 1,
    value: ({ games }) => (games.some((game) => game.mode === 'ascension') ? 1 : 0),
  },
  {
    id: 'multiplayer',
    emoji: '🤝',
    icon: 'account-group-outline',
    target: 1,
    value: ({ games }) => (games.some((game) => game.mode === 'multi') ? 1 : 0),
  },
  { id: 'friend', emoji: '💬', icon: 'account-heart-outline', target: 1, value: ({ friendsCount }) => friendsCount ?? 0 },
  {
    id: 'night_owl',
    emoji: '🦉',
    icon: 'owl',
    target: 1,
    value: ({ games }) => (games.some((game) => game.playedAt && new Date(game.playedAt).getHours() < 5) ? 1 : 0),
  },
]

// Most daily challenges done on a single day.
function bestDailySweep(games) {
  const perDay = {}
  for (const game of games) {
    if (game.mode !== 'daily' || !game.dailyKey) continue
    ;(perDay[game.dailyKey] ??= new Set()).add(game.gameType)
  }
  return Math.max(0, ...Object.values(perDay).map((types) => types.size))
}

// [{ ...achievement, progress, unlocked }], unlocked first.
// Without `friendsCount` (another player's profile: their friends aren't readable), 'friend' is left out.
export function computeAchievements({ stats, games, friendsCount }) {
  return ACHIEVEMENTS.filter((achievement) => friendsCount != null || achievement.id !== 'friend').map((achievement) => {
    const progress = Math.min(achievement.value({ stats, games, friendsCount }), achievement.target)
    return { ...achievement, progress, unlocked: progress >= achievement.target }
  }).sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
}

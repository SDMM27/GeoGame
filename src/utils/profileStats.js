// Profile statistics computed from a player's game history (see gameHistory.js). Pure functions.
import { dailyKeyAt } from './dailyKey'
import { GAME_TYPES } from './gameTypes'
import { serverNow } from './serverTime'

export const DAILY_GAME_TYPES = [
  GAME_TYPES.DAILY_CHALLENGE,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.COUNTRY_CLUE,
  GAME_TYPES.VOYAGE_VOYAGE,
  GAME_TYPES.RANKING,
  GAME_TYPES.QUIZ,
]

// First day of the dailies added after the others (the other ones have always been there).
export const DAILY_GAME_SINCE = {
  [GAME_TYPES.DAILY_CHALLENGE]: '2026-10-16',
}

// The dailies there were on a day ('2026-10-13'): "every daily done" on a day means those ones, so that a player keeps
// the sweeps they made before a daily was added.
export function dailyTypesOn(day) {
  return DAILY_GAME_TYPES.filter((type) => !DAILY_GAME_SINCE[type] || day >= DAILY_GAME_SINCE[type])
}

// Same day as the daily challenges (server time by default).
export function dayKey(date = new Date(serverNow())) {
  return dailyKeyAt(date)
}

const DAY_MS = 24 * 60 * 60 * 1000
const keyToTime = (key) => Date.parse(`${key}T00:00:00Z`)

export function previousDayKey(key) {
  return new Date(keyToTime(key) - DAY_MS).toISOString().slice(0, 10)
}

// Consecutive days with at least one daily challenge played.
// The current streak is still alive when today's challenges aren't done yet.
export function computeStreaks(dailyKeys, todayKey = dayKey()) {
  const days = [...new Set(dailyKeys)].sort()
  let best = 0
  let run = 0
  let previous = null
  for (const day of days) {
    run = previous && previousDayKey(day) === previous ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }

  const played = new Set(days)
  let current = 0
  let cursor = played.has(todayKey) ? todayKey : previousDayKey(todayKey)
  while (played.has(cursor)) {
    current += 1
    cursor = previousDayKey(cursor)
  }
  return { current, best }
}

function emptyGameStats() {
  return { played: 0, wins: 0, dailies: 0, bestScore: null, bestAttempts: null, totalTime: 0 }
}

export function computeStats(games, todayKey = dayKey()) {
  const byGame = {}
  const dailyKeys = []
  const daysPlayed = new Set()
  const todayDaily = {}
  let totalTime = 0
  let countriesFound = 0
  let dailyWins = 0

  for (const game of games) {
    const stats = (byGame[game.gameType] ??= emptyGameStats())
    stats.played += 1
    if (typeof game.score === 'number') stats.bestScore = Math.max(stats.bestScore ?? -Infinity, game.score)
    if (game.solved && typeof game.attempts === 'number') {
      stats.bestAttempts = Math.min(stats.bestAttempts ?? Infinity, game.attempts)
    }
    if (typeof game.elapsedTime === 'number') {
      stats.totalTime += game.elapsedTime
      totalTime += game.elapsedTime
    }
    if (typeof game.found === 'number') countriesFound += game.found
    if (game.playedAt) daysPlayed.add(dayKey(new Date(game.playedAt)))

    if (game.mode === 'daily' && game.dailyKey) {
      stats.dailies += 1
      dailyKeys.push(game.dailyKey)
      if (game.solved) {
        stats.wins += 1
        dailyWins += 1
      }
      if (game.dailyKey === todayKey) todayDaily[game.gameType] = game
    }
  }

  const favorite = Object.entries(byGame).sort((a, b) => b[1].played - a[1].played)[0]

  return {
    total: games.length,
    totalTime,
    countriesFound,
    daysPlayed: daysPlayed.size,
    dailyPlayed: dailyKeys.length,
    dailyWins,
    streak: computeStreaks(dailyKeys, todayKey),
    todayDaily,
    favoriteGame: favorite ? favorite[0] : null,
    byGame,
  }
}

// "2 h 05", "12 min", "45 s"
export function formatPlayTime(ms) {
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60)
    return `${hours} h ${String(totalMinutes % 60).padStart(2, '0')}`
  }
  if (totalMinutes > 0) return `${totalMinutes} min`
  return `${Math.round(ms / 1000)} s`
}

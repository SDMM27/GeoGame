// Labels for a game of the history (see gameHistory.js), shared by the website and the app.
import { formatTime } from './formatTime'
import { GAME_TYPES } from './gameTypes'

const formatPoints = (score) => (Number.isInteger(score) ? String(score) : score.toFixed(1))

// "Défi du jour", "Classique · Moyen", "Ascension · Progressif", "Multijoueur · AB3K7Z", "Survie · 3 vies"
export function describeMode(game, t) {
  const mode = t(`profile.modes.${game.mode}`)
  const detail =
    game.mode === 'survival'
      ? game.lives != null ? t('survival.lives_count', { count: game.lives }) : null
      : game.mode === 'multi'
      ? game.roomCode
      : game.presetName
        ? game.presetName === 'Progressif'
          ? t('presets.progressive')
          : game.presetName
        : game.continent
          ? t(`continents.${game.continent}`)
          : game.difficulty
            ? t(`difficulties.${game.difficulty}`)
            : null
  return detail ? `${mode} · ${detail}` : mode
}

// "42 pts · 30/40", "Trouvé · 3 essais", "Raté", "7/10"
export function describeResult(game, t) {
  const parts = []
  if (game.gameType === GAME_TYPES.SURVIVAL) return t('survival.rounds_count', { count: game.score ?? 0 })
  if (game.solved != null && game.attempts != null && game.score == null) {
    parts.push(game.solved ? t('profile.solved') : t('profile.failed'))
    if (game.solved) parts.push(t('profile.attempts_count', { count: game.attempts }))
  } else if (game.score != null) {
    parts.push(`${formatPoints(game.score)} ${t('units.pts')}`)
  }
  if (game.found != null && game.total != null) parts.push(`${game.found}/${game.total}`)
  if (game.correct != null && game.answered != null) parts.push(`${game.correct}/${game.answered}`)
  return parts.join(' · ')
}

// Best result of a game type for the "by game" list.
export function describeBest(gameStats, t, gameType = null) {
  if (gameType === GAME_TYPES.SURVIVAL && gameStats.bestScore != null) {
    return t('survival.best', { rounds: t('survival.rounds_count', { count: gameStats.bestScore }) })
  }
  if (gameStats.bestAttempts != null && gameStats.bestScore == null) {
    return t('profile.best_attempts', { count: gameStats.bestAttempts })
  }
  if (gameStats.bestScore != null) return t('profile.best_score', { score: formatPoints(gameStats.bestScore) })
  return null
}

// Today: time only; otherwise a short date.
export function formatPlayedAt(playedAt, language) {
  const date = new Date(playedAt)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
  })
}

// Every field recorded for one game, as { key, label, value } rows for its detail sheet.
export function describeDetails(game, t, language) {
  const rows = []
  const add = (key, value, extra) => {
    if (value != null && value !== '') rows.push({ key, label: t(`profile.details.${key}`), value: String(value), ...extra })
  }
  const playedAt = new Date(game.playedAt)
  add('played_at', playedAt.toLocaleString(language, { dateStyle: 'full', timeStyle: 'short' }))
  if (game.mode === 'daily' && game.dailyKey) {
    add('daily', new Date(`${game.dailyKey}T00:00:00Z`).toLocaleDateString(language, { dateStyle: 'long', timeZone: 'UTC' }))
  }
  if (game.solved != null) add('result', game.solved ? t('profile.solved') : t('profile.failed'), { failed: !game.solved })
  if (game.score != null) {
    add(
      'score',
      game.gameType === GAME_TYPES.SURVIVAL
        ? t('survival.rounds_count', { count: game.score })
        : `${formatPoints(game.score)} ${t('units.pts')}`
    )
  }
  const ratio = (part, whole) =>
    whole > 0 ? `${part}/${whole} (${new Intl.NumberFormat(language, { style: 'percent' }).format(part / whole)})` : null
  if (game.found != null) add('found', ratio(game.found, game.total))
  if (game.correct != null) add('correct', ratio(game.correct, game.answered))
  add('attempts', game.attempts)
  add('optimal', game.optimal)
  add('errors', game.errors)
  add('total_error', game.totalError)
  add('hints', game.hints)
  add('best_streak', game.bestStreak)
  add('lives', game.lives)
  if (game.elapsedTime > 0) add('time', formatTime(game.elapsedTime))
  if (game.mode === 'multi') add('room', game.roomCode)
  return rows
}

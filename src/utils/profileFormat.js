// Labels for a game of the history (see gameHistory.js), shared by the website and the app.

const formatPoints = (score) => (Number.isInteger(score) ? String(score) : score.toFixed(1))

// "Défi du jour", "Classique · Moyen", "Ascension · Progressif", "Multijoueur · AB3K7Z"
export function describeMode(game, t) {
  const mode = t(`profile.modes.${game.mode}`)
  const detail =
    game.mode === 'multi'
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
export function describeBest(gameStats, t) {
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

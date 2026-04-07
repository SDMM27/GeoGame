export function sortDailyScores(scores) {
  return [...scores].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })
}

export function isBetterDailyScore(newScore, existing) {
  if (newScore.attempts < existing.attempts) return true
  if (newScore.attempts === existing.attempts && newScore.elapsedTime < existing.elapsedTime) return true
  return false
}

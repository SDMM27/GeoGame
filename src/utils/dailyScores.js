function effectiveAttempts(score) {
  return score.attempts + (score.hints ?? 0)
}

export function sortDailyScores(scores) {
  return [...scores].sort((a, b) => {
    const effDiff = effectiveAttempts(a) - effectiveAttempts(b)
    if (effDiff !== 0) return effDiff
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })
}

export function isBetterDailyScore(newScore, existing) {
  const newEff = effectiveAttempts(newScore)
  const existingEff = effectiveAttempts(existing)
  if (newEff < existingEff) return true
  if (newEff === existingEff) {
    return (newScore.elapsedTime ?? Infinity) < (existing.elapsedTime ?? Infinity)
  }
  return false
}

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

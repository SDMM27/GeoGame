function effectiveAttempts(score) {
  return score.attempts + (score.hints ?? 0)
}

export function sortDailyScores(scores) {
  return [...scores].sort((a, b) => {
    // Map assist (Country Clue, Border Guess): every player without the map ranks ahead of every player with it.
    const tierDiff = (a.mapAssist === true) - (b.mapAssist === true)
    if (tierDiff !== 0) return tierDiff
    const effDiff = effectiveAttempts(a) - effectiveAttempts(b)
    if (effDiff !== 0) return effDiff
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })
}

// Daily Challenge: the most right answers first, then the shortest total time (a missing time is the worst one).
export function sortChallengeScores(scores) {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })
}

export function sortRankingScores(scores) {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.totalError ?? Infinity) - (b.totalError ?? Infinity)
  })
}

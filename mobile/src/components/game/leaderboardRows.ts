// Rows a daily leaderboard shows: the first `max` entries, plus the signed-in player's own entry
// (with its real rank) when it's further down.
export function visibleRows<T extends { uid?: string }>(scores: T[], uid: string | undefined, max: number) {
  const rows = scores.slice(0, max).map((score, index) => ({ score, index }))
  const mine = uid ? scores.findIndex((score) => score.uid === uid) : -1
  if (mine >= max) rows.push({ score: scores[mine], index: mine })
  return rows
}

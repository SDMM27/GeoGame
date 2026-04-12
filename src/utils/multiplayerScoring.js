// src/utils/multiplayerScoring.js

/**
 * Classe les résultats d'un jeu et attribue les points.
 *
 * scoringMode 'weighted' (défaut — Placement, Flags, Capitals) :
 *   1. weightedScore DESC
 *   2. elapsedTime   ASC
 *
 * scoringMode 'solved' (Border Guess, Country Clue) :
 *   1. countriesSolved DESC
 *   2. attempts        ASC
 *   3. elapsedTime     ASC
 *
 * @param {Array<{
 *   playerId: string,
 *   weightedScore?: number,
 *   countriesSolved?: number,
 *   attempts?: number,
 *   elapsedTime?: number|null,
 *   perfects?: number,
 *   stumbles?: number,
 *   failures?: number,
 * }>} results
 * @param {number} totalPlayers
 * @param {'weighted'|'solved'} [scoringMode='weighted']
 * @returns {Array<{...result, rank: number, points: number}>}
 */
export function rankResults(results, totalPlayers, scoringMode = 'weighted') {
  const active   = results.filter(r => !r.abandoned)
  const abandoned = results.filter(r => r.abandoned)

  const sorted = [...active].sort((a, b) => {
    if (scoringMode === 'solved') {
      // 1. Pays trouvés (plus = mieux)
      const solvedDiff = (b.countriesSolved ?? 0) - (a.countriesSolved ?? 0)
      if (solvedDiff !== 0) return solvedDiff

      // 2. Tentatives totales (moins = mieux)
      const attemptsDiff = (a.attempts ?? 0) - (b.attempts ?? 0)
      if (attemptsDiff !== 0) return attemptsDiff

      // 3. Temps (moins = mieux)
      return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
    }

    // Mode 'weighted' (défaut)
    const scoreDiff = (b.weightedScore ?? 0) - (a.weightedScore ?? 0)
    if (scoreDiff !== 0) return scoreDiff
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })

  const abandonedRank   = active.length + 1
  // Si tous abandonnent → 1 pt ; sinon, dernier rang actif + 1
  const abandonedPoints = active.length === 0 ? 1 : totalPlayers - active.length

  const rankedActive = sorted.map((result, index) => ({
    ...result,
    rank:   index + 1,
    points: totalPlayers - index,
  }))

  const rankedAbandoned = abandoned.map(result => ({
    ...result,
    rank:   abandonedRank,
    points: abandonedPoints,
  }))

  return [...rankedActive, ...rankedAbandoned]
}

/**
 * Agrège les points de tous les jeux pour chaque joueur.
 *
 * @param {Array<{playerId: string, gameIndex: number, points: number}>} allGameResults
 * @returns {Object} { [playerId]: totalPoints }
 */
export function aggregatePoints(allGameResults) {
  return allGameResults.reduce((acc, result) => {
    acc[result.playerId] = (acc[result.playerId] ?? 0) + result.points
    return acc
  }, {})
}

// src/utils/multiplayerScoring.js

/**
 * Classe les résultats d'un jeu et attribue les points.
 *
 * scoringMode 'attempts' (défaut) :
 *   1. attempts        ASC
 *   2. elapsedTime     ASC
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
 * @param {'attempts'|'solved'} [scoringMode='attempts']
 * @returns {Array<{...result, rank: number, points: number}>}
 */
export function rankResults(results, totalPlayers, scoringMode = 'attempts') {
  const sorted = [...results].sort((a, b) => {
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

    // Mode 'attempts' (défaut)
    const attemptsDiff = (a.attempts ?? 0) - (b.attempts ?? 0)
    if (attemptsDiff !== 0) return attemptsDiff
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })

  return sorted.map((result, index) => ({
    ...result,
    rank: index + 1,
    points: totalPlayers - index,
  }))
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

// src/utils/multiplayerScoring.js

/**
 * Classe les résultats d'un jeu et attribue les points.
 * Tri : attempts ASC, puis elapsedTime ASC.
 * Points : 1er → totalPlayers pts, dernier → 1 pt.
 *
 * @param {Array<{playerId: string, attempts: number, elapsedTime: number}>} results
 * @param {number} totalPlayers - nombre de joueurs actifs (non déconnectés)
 * @returns {Array<{playerId, attempts, elapsedTime, rank, points}>}
 */
export function rankResults(results, totalPlayers) {
  const sorted = [...results].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts
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

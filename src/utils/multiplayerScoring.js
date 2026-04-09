// src/utils/multiplayerScoring.js

/**
 * Classe les résultats d'un jeu et attribue les points.
 *
 * Priorité stricte :
 *   1. weightedScore  DESC — récompense l'expertise (first-try + difficulté)
 *   2. countriesSolved DESC — départage en cas d'égalité aux points
 *   3. elapsedTime    ASC  — tie-breaker final : le plus rapide gagne
 *
 * @param {Array<{
 *   playerId: string,
 *   weightedScore: number,
 *   countriesSolved: number,
 *   elapsedTime: number|null,
 *   attempts: number,
 *   perfects: number,
 *   stumbles: number,
 *   failures: number,
 * }>} results
 * @param {number} totalPlayers
 * @returns {Array<{...result, rank: number, points: number}>}
 */
export function rankResults(results, totalPlayers) {
  const sorted = [...results].sort((a, b) => {
    // 1. Score pondéré (reflète la qualité des réponses)
    const scoreDiff = (b.weightedScore ?? 0) - (a.weightedScore ?? 0)
    if (scoreDiff !== 0) return scoreDiff

    // 2. Nombre de pays résolus (même en tâtonnant)
    const solvedDiff = (b.countriesSolved ?? 0) - (a.countriesSolved ?? 0)
    if (solvedDiff !== 0) return solvedDiff

    // 3. Temps total
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

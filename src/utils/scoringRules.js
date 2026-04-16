// src/utils/scoringRules.js
// Source unique de vérité pour les règles de scoring — utilisée par les hooks solo ET le moteur multi.

/**
 * Points attribués selon la difficulté et le nombre d'erreurs.
 * Index 0 = 0 erreur (first try), 1 = 1 erreur, 2 = 2+ erreurs.
 */
export const SCORE_TABLE = {
  Facile:     [3, 2, 1],
  Moyen:      [5, 3, 2],
  Difficile:  [7, 5, 3],
  Impossible: [9, 7, 5],
}

/**
 * Placement — les erreurs comptent directement.
 * 0 erreur → index 0, 1 erreur → index 1, 2+ erreurs → index 2.
 */
export function getPlacementPoints(difficulty, consecutiveErrors) {
  const row = SCORE_TABLE[difficulty]
  if (!row) return 0
  return row[Math.min(consecutiveErrors, 2)]
}

/**
 * Drapeaux / Capitales — 1 erreur reste toléré (full points).
 * La première erreur ne pénalise pas ; la deuxième descend d'un cran.
 */
export function getWordGamePoints(difficulty, consecutiveErrors) {
  const row = SCORE_TABLE[difficulty]
  if (!row) return 0
  return row[Math.min(Math.max(0, consecutiveErrors - 1), 2)]
}

/**
 * Border Guess / Country Clue — pas de difficulté par pays.
 * Barème fixe basé sur le nombre de mauvaises réponses par round.
 * 0 erreur → 3 pts, 1-2 erreurs → 2 pts, 3+ erreurs → 0 pt.
 */
export function getGuessGamePoints(wrongGuesses) {
  if (wrongGuesses === 0) return 3
  if (wrongGuesses <= 2) return 2
  return 0
}

/**
 * Ranking Game — based on sum of absolute position errors across all N countries.
 * totalError = Σ |player_position[i] - correct_position[i]|
 * 0 (perfect) → 3 pts, ≤ n → 2 pts, ≤ 2n → 1 pt, > 2n → 0 pt.
 */
export function getRankingGamePoints(totalError, n) {
  if (totalError === 0) return 3
  if (totalError <= n) return 2
  if (totalError <= 2 * n) return 1
  return 0
}

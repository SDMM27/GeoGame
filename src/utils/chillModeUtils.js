import { checkAnswer, normalize } from './normalizeAnswer'
import { getPlacementPoints, getWordGamePoints, getGuessGamePoints } from './scoringRules'

export const CHILL_COUNTDOWN_MS = {
  Facile:     6000,
  Moyen:      8000,
  Difficile:  10000,
  Impossible: 15000,
}

/**
 * Retourne la durée du countdown en ms pour une difficulté donnée.
 * @param {string} difficulty
 * @param {{ Facile?: number, Moyen?: number, Difficile?: number, Impossible?: number }} [timers] - secondes custom (depuis chillConfig)
 */
export function getCountdownMs(difficulty, timers) {
  if (timers?.[difficulty] != null) return timers[difficulty] * 1000
  return CHILL_COUNTDOWN_MS[difficulty] ?? 10000
}

/**
 * Évalue une réponse textuelle (FLAGS, CAPITALS).
 * @param {string|null} submitted - réponse du joueur
 * @param {string} target - nom attendu (ADMIN ou capital)
 * @param {string[]} aliases - noms alternatifs acceptés
 * @param {string} difficulty - difficulté pour le scoring
 * @returns {{ correct: boolean, score: number }}
 */
export function evaluateTextAnswer(submitted, target, aliases, difficulty) {
  if (!submitted || !submitted.trim()) return { correct: false, score: 0 }
  const correct = checkAnswer(submitted.trim(), target, aliases)
  const score = correct ? getWordGamePoints(difficulty, 0) : 0
  return { correct, score }
}

/**
 * Évalue une réponse textuelle pour les jeux sans difficulté (BORDER_GUESS, COUNTRY_CLUE).
 * @param {string|null} submitted
 * @param {string} target
 * @param {string[]} aliases
 * @returns {{ correct: boolean, score: number }}
 */
export function evaluateGuessAnswer(submitted, target, aliases) {
  if (!submitted || !submitted.trim()) return { correct: false, score: 0 }
  const correct = checkAnswer(submitted.trim(), target, aliases)
  const score = correct ? getGuessGamePoints(0) : 0
  return { correct, score }
}

/**
 * Évalue un placement sur la carte.
 * @param {string|null} clickedAdmin - ADMIN du pays cliqué (null si pas de clic)
 * @param {string} targetName - nom attendu (string depuis getSeededPlacementCountries)
 * @param {string} difficulty
 * @returns {{ correct: boolean, score: number }}
 */
export function evaluatePlacement(clickedAdmin, targetName, difficulty) {
  if (!clickedAdmin) return { correct: false, score: 0 }
  const correct = normalize(clickedAdmin) === normalize(targetName)
  const score = correct ? getPlacementPoints(difficulty, 0) : 0
  return { correct, score }
}

/**
 * Aplatit getSeededAscensionOverrides en tableau séquentiel avec difficulty par pays.
 * Ordre : Facile → Moyen → Difficile → Impossible.
 * @param {{ [difficulty: string]: object[] }} overrides
 * @returns {{ country: object, difficulty: string }[]}
 */
export function flattenAscensionCountries(overrides) {
  const ORDER = Object.keys(CHILL_COUNTDOWN_MS)
  return ORDER.flatMap(diff =>
    (overrides[diff] ?? []).map(country => ({ country, difficulty: diff }))
  )
}

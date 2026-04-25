import { checkAnswer, normalize } from './normalizeAnswer'
import { getPlacementPoints, getWordGamePoints, getGuessGamePoints } from './scoringRules'

export const CHILL_COUNTDOWN_MS = {
  Facile:     6000,
  Moyen:      8000,
  Difficile:  10000,
  Impossible: 15000,
}

export function getCountdownMs(difficulty) {
  return CHILL_COUNTDOWN_MS[difficulty] ?? 10000
}

export function evaluateTextAnswer(submitted, target, aliases, difficulty) {
  if (!submitted || !submitted.trim()) return { correct: false, score: 0 }
  const correct = checkAnswer(submitted.trim(), target, aliases)
  const score = correct ? getWordGamePoints(difficulty, 0) : 0
  return { correct, score }
}

export function evaluateGuessAnswer(submitted, target, aliases) {
  if (!submitted || !submitted.trim()) return { correct: false, score: 0 }
  const correct = checkAnswer(submitted.trim(), target, aliases)
  const score = correct ? getGuessGamePoints(0) : 0
  return { correct, score }
}

export function evaluatePlacement(clickedAdmin, targetName, difficulty) {
  if (!clickedAdmin) return { correct: false, score: 0 }
  const correct = normalize(clickedAdmin) === normalize(targetName)
  const score = correct ? getPlacementPoints(difficulty, 0) : 0
  return { correct, score }
}

export function flattenAscensionCountries(overrides) {
  const ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return ORDER.flatMap(diff =>
    (overrides[diff] ?? []).map(country => ({ country, difficulty: diff }))
  )
}

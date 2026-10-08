// src/utils/survivalConfig.js
// Survival mode settings, light enough for the setup screens (the rounds themselves: utils/survival.js).
import { GAME_TYPES } from './gameTypes'

// Games a survival round can be, in the order the setup shows them.
export const SURVIVAL_ROUND_TYPES = [
  GAME_TYPES.PLACEMENT,
  GAME_TYPES.FLAGS,
  GAME_TYPES.CAPITALS,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.COUNTRY_CLUE,
  GAME_TYPES.QUIZ,
]

// Lives to choose from; each has its own leaderboard.
export const SURVIVAL_LIVES = [1, 3, 5, 10]
export const DEFAULT_SURVIVAL_LIVES = 3

// A run that clears every round wins. firestore.rules caps the scores at this.
export const SURVIVAL_MAX_ROUNDS = 300

/** The chosen games in setup order, without unknown or repeated ones. */
export function normalizeSurvivalModes(types) {
  const chosen = new Set(types ?? [])
  return SURVIVAL_ROUND_TYPES.filter((type) => chosen.has(type))
}

/** One label per set of games, for the leaderboards: 'FLAGS+CAPITALS'. */
export const survivalModesKey = (types) => normalizeSurvivalModes(types).join('+')

export const parseSurvivalModes = (key) => normalizeSurvivalModes(String(key ?? '').split('+'))

/** Lives left after `errors` mistakes. */
export const livesLeft = (lives, errors) => Math.max(0, lives - errors)


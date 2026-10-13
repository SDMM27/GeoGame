// src/utils/survivalConfig.js
// Survival mode settings, light enough for the setup screens (the rounds themselves: utils/survival.js).
import { GAME_TYPES } from './gameTypes'

// Games a survival round can be, in the order the setup shows them.
export const SURVIVAL_ROUND_TYPES = [
  GAME_TYPES.PLACEMENT,
  GAME_TYPES.FLAGS,
  GAME_TYPES.CAPITALS,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.QUIZ,
]

// Lives to choose from; each has its own leaderboard.
export const SURVIVAL_LIVES = [1, 3, 5, 10]
export const DEFAULT_SURVIVAL_LIVES = 3

// Seconds per round (0: no limit); each one has its own leaderboard too. Time up: a life lost, next round.
export const SURVIVAL_TIMERS = [0, 15, 30, 60]
export const DEFAULT_SURVIVAL_TIMER = 30

// How fast the difficulty rises: the number of rounds at Facile, Moyen and Difficile, Impossible after them.
// The presets have their own leaderboards; a custom ramp is not ranked.
export const SURVIVAL_RAMP_TIERS = ['Facile', 'Moyen', 'Difficile']
export const SURVIVAL_RAMPS = {
  express: { Facile: 3, Moyen: 4, Difficile: 5 },
  normal: { Facile: 5, Moyen: 7, Difficile: 8 },
  gentle: { Facile: 10, Moyen: 15, Difficile: 20 },
  expert: { Facile: 0, Moyen: 0, Difficile: 15 },
  hardcore: { Facile: 0, Moyen: 0, Difficile: 0 },
}
export const SURVIVAL_RAMP_NAMES = Object.keys(SURVIVAL_RAMPS)
export const DEFAULT_SURVIVAL_RAMP = 'normal'
// Most rounds a custom ramp can give a difficulty
export const SURVIVAL_RAMP_MAX = 50

/** The preset these steps are ('normal'...), or null for a custom ramp. */
export function matchSurvivalRamp(steps) {
  return SURVIVAL_RAMP_NAMES.find((name) =>
    SURVIVAL_RAMP_TIERS.every((tier) => SURVIVAL_RAMPS[name][tier] === (steps?.[tier] ?? 0))
  ) ?? null
}

/** Steps from anything (a room, a link): whole numbers within bounds, the default preset when missing. */
export function normalizeSurvivalRamp(steps) {
  if (!steps || typeof steps !== 'object') return { ...SURVIVAL_RAMPS[DEFAULT_SURVIVAL_RAMP] }
  return Object.fromEntries(SURVIVAL_RAMP_TIERS.map((tier) => {
    const count = Math.round(Number(steps[tier]) || 0)
    return [tier, Math.min(SURVIVAL_RAMP_MAX, Math.max(0, count))]
  }))
}

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


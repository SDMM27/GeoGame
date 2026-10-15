// src/utils/dailyChallenge.js
// Daily Challenge, shared by the website and the app: the same 12 rounds for every player each day, mixing a country to
// place on the map, a flag to name and a capital to name. One try per round, 20 s per round, no lives; the score is the
// number of right answers, ties broken by the total time. The rounds themselves are built by utils/survival.js
// (buildSurvivalRounds) and played by hooks/useDailyChallengeState.js. Pure: no DOM, no Firestore.
import { GAME_TYPES } from './gameTypes'

export const CHALLENGE_ROUND_TYPES = [GAME_TYPES.PLACEMENT, GAME_TYPES.FLAGS, GAME_TYPES.CAPITALS]
export const CHALLENGE_ROUNDS = 12
// Seconds per round
export const CHALLENGE_TIMER = 20
// Rounds at each difficulty (Facile, Moyen, Difficile): 4 + 4 + 4
export const CHALLENGE_RAMP = { Facile: 4, Moyen: 4, Difficile: 4 }

// Stable 32-bit hash of the day, so that everybody plays the same rounds (and the same on the site and in the app)
export function challengeSeed(dailyKey) {
  const text = `challenge:${dailyKey}`
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0
  }
  return hash >>> 0
}

// Icon of each kind of round
export const CHALLENGE_ROUND_EMOJI = {
  [GAME_TYPES.PLACEMENT]: '🗺️',
  [GAME_TYPES.FLAGS]: '🏳️',
  [GAME_TYPES.CAPITALS]: '🏛️',
}
const PER_LINE = 4

/**
 * The result as a grid to share, 4 rounds per line: "🗺️✅ 🏳️❌ 🏛️✅ 🗺️✅". `rounds`: [{ type }], `results`: 'correct' |
 * 'failed' | null for each (a round not played counts as failed).
 */
export function challengeShareGrid(rounds, results) {
  const cells = rounds.map((round, i) => `${CHALLENGE_ROUND_EMOJI[round.type] ?? '❔'}${results?.[i] === 'correct' ? '✅' : '❌'}`)
  const lines = []
  for (let i = 0; i < cells.length; i += PER_LINE) lines.push(cells.slice(i, i + PER_LINE).join(' '))
  return lines.join('\n')
}

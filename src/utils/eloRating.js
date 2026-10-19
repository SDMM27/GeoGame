// Elo ratings (docs/plan-fonctionnalites.md, step 4): the math, shared by the server (api/_lib/elo.mjs, which alone
// writes ratings) and the clients (labels, seasons). No Firebase import: the API bundles this file.
//
// - Duels: one global rating, updated after each finished two-player room game (both players signed in).
// - Solo: one rating per mode. Each country is a "question" with its own rating per mode; finding it is a win
//   against it. A player only gains: the most on the first try, less with each error (FIRST_TRY_FLOOR at least),
//   nothing when not found. A country pays once per player, mode and season (its difficulty is fixed per mode).
// - Seasons: calendar quarters, Paris time. A new season pulls every rating halfway back to ELO_START, and every
//   country can be won again.
import { GAME_TYPES } from './gameTypes.js'

export const ELO_START = 1000
export const DUEL_K = 32
export const SOLO_K = 32
// Questions move slower than players: each player counts once per country and season.
export const QUESTION_K = 16
export const ERROR_STEP = 0.2
export const FIRST_TRY_FLOOR = 0.2
export const SEASON_RESET = 0.5

// Modes with a solo rating. Their countries come from the same data, each with its difficulty for that mode.
export const ELO_MODES = [
  GAME_TYPES.PLACEMENT,
  GAME_TYPES.HARDCORE,
  GAME_TYPES.FLAGS,
  GAME_TYPES.MISSING_FLAG,
  GAME_TYPES.CAPITALS,
  GAME_TYPES.BORDER_GUESS,
  GAME_TYPES.SURVIVAL,
]

// Starting rating of a country, from its difficulty in the mode.
export const QUESTION_START = { Facile: 800, Moyen: 1000, Difficile: 1200, Impossible: 1400 }

// Difficulty field of a country (countries.meta.json properties) for a mode.
export function difficultyField(mode) {
  if (mode === GAME_TYPES.FLAGS) return 'DifficultyFlag'
  if (mode === GAME_TYPES.MISSING_FLAG) return 'DifficultyFlag'
  if (mode === GAME_TYPES.CAPITALS) return 'DifficultyCapitals'
  return 'Difficulty'
}

// Chance that `rating` beats `opponent`.
export function expectedScore(rating, opponent) {
  return 1 / (1 + 10 ** ((opponent - rating) / 400))
}

// Share of the gain kept after `errors` wrong answers on the country.
export function errorFactor(errors) {
  return round1(Math.max(FIRST_TRY_FLOOR, 1 - ERROR_STEP * Math.max(0, errors)))
}

function round1(value) {
  return Math.round(value * 10) / 10
}

/**
 * One country answered in solo: { gain, question } with the player's gain (0 when not found or already won this
 * season) and the country's new rating (unchanged when `rateQuestion` is false: the player already answered it
 * this season).
 */
export function soloResult({ rating, question, found, errors, alreadyWon, rateQuestion }) {
  const expected = expectedScore(rating, question)
  const score = found ? errorFactor(errors) : 0
  const gain = found && !alreadyWon ? round1(SOLO_K * (1 - expected) * score) : 0
  const nextQuestion = rateQuestion ? round1(question + QUESTION_K * ((1 - score) - (1 - expected))) : question
  return { gain, question: nextQuestion }
}

/** A duel between ratings `a` and `b`; `score` is a's result (1 win, 0.5 draw, 0 loss). New ratings { a, b }. */
export function duelResult(a, b, score) {
  const delta = DUEL_K * (score - expectedScore(a, b))
  return { a: round1(a + delta), b: round1(b - delta) }
}

/** A rating carried into the next season. */
export function seasonReset(rating) {
  return round1(ELO_START + (rating - ELO_START) * SEASON_RESET)
}

const quarterFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' })

/** Season of a date: '2026-Q4'. Quarters start at midnight Paris time, like the daily challenges. */
export function seasonKeyAt(date) {
  const parts = Object.fromEntries(quarterFormatter.formatToParts(date).map(({ type, value }) => [type, value]))
  return `${parts.year}-Q${Math.floor((Number(parts.month) - 1) / 3) + 1}`
}

// Keys of a player's ratings: 'duel' and the solo modes.
export const ELO_KEYS = ['duel', ...ELO_MODES]

const entryOf = (state, key) => (key === 'duel' ? state?.duel : state?.solo?.[key])

/**
 * The player's elo/{uid} document as it stands in `season`. The document holds only what was played in its season:
 *   { name, season, duel?: { rating, games, wins }, solo: { [mode]?: { rating, found } }, carry: { [key]: rating } }
 * `carry`: ratings from earlier seasons, already reset, for the keys not played yet this season. So a season's
 * leaderboards only list the players who played in it. A document from an earlier season comes back empty, with
 * everything it held moved to `carry` (seasonReset once more for what was already carried).
 */
export function ratingsForSeason(doc, season) {
  if (!doc) return { duel: null, solo: {}, carry: {} }
  if (doc.season === season) return { duel: doc.duel ?? null, solo: doc.solo ?? {}, carry: doc.carry ?? {} }
  const carry = {}
  for (const key of ELO_KEYS) {
    const rating = entryOf(doc, key)?.rating ?? doc.carry?.[key]
    if (rating != null) carry[key] = seasonReset(rating)
  }
  return { duel: null, solo: {}, carry }
}

/** Current rating for a key ('duel' or a mode) of a ratingsForSeason state: played, carried, or ELO_START. */
export function ratingOf(state, key) {
  return entryOf(state, key)?.rating ?? state?.carry?.[key] ?? ELO_START
}

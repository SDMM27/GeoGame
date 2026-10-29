// Flag collection and mastery (docs/plan-fonctionnalites.md, step 6). Pure rules shared by the server (api/_lib/xp.mjs
// pays the fragments, api/_lib/elo.mjs records the mastery) and the clients (collection screens, achievements). No
// Firebase import and no JSON import: the data is passed in, and the API bundles this file.
//
// Flags
// - Fragments come from (missions.js grantXp, paid by the server in the same call as the XP): the weekly missions and
//   bonus, each level gained, the dailies of the day (all played, 3 won, all won) and the streak of days with a daily
//   (every 7th day, the 30th and the 100th). The daily missions pay XP only. A flag costs PIECES_BY_RARITY[rarity]
//   pieces (the rarer, the more); the flags are drawn at random among those not unlocked yet, the rarer ones less often.
// - Pace: a week pays 2 × 1 + 2 × 2 + 3 for the weekly missions + 2 for the weekly bonus = 11 fragments, up to 3 a day
//   (21 a week) for the dailies and 2 for a 7-day streak, plus about 1 per level gained: at most about 34 a week
//   besides the levels. The 239 flags cost 911 pieces in all (33 common × 2, 73 uncommon × 3, 86 rare × 4, 47 legendary × 6).
// - users/{uid}.flags, written by the server only: { unlocked: [iso, in the order they were unlocked],
//   current: iso being rebuilt | null, pieces: 0..piecesFor(rarity of current) - 1 pieces of `current` }.
//
// Mastery (the "Légende" badge)
// - mastery/{uid}, written by the server only (api/_lib/elo.mjs rateSolo): { placement: [ADMIN names], flags: [...],
//   hardcore: [...], updatedAt }, the countries the player found at the first try (found, no error) in that mode,
//   for good (not per season). In Hardcore (no borders, one tap per country), "first try" is a tap inside the country.
//   Like Elo, the answers are reported by the client, so the badge is as honest as Elo.
import { mulberry32 } from './prng.js'

// Fragments paid with the missions (same moments as the XP; the weekly missions pay by tier, see WEEKLY_TIERS in
// missions.js), with each level gained, with the dailies of the day and with the streak.
export const DAILY_MISSION_FRAGMENTS = 0
export const DAILY_BONUS_FRAGMENTS = 0
export const WEEKLY_TIER_FRAGMENTS = { easy: 1, medium: 2, hard: 3 }
export const WEEKLY_BONUS_FRAGMENTS = 2
export const LEVEL_UP_FRAGMENTS = 1
// The dailies of a day (dailyTypesOn): once all are played, once 3 are won, once all are won (3 a day at most).
export const DAILIES_ALL_FRAGMENTS = 1
export const DAILIES_WON_FRAGMENTS = { 3: 1, all: 1 }
// Streak of days with a daily played: every 7th day pays STREAK_WEEK_FRAGMENTS, and the days of
// STREAK_MILESTONE_FRAGMENTS pay more on top.
export const STREAK_WEEK_FRAGMENTS = 2
export const STREAK_MILESTONE_FRAGMENTS = { 30: 5, 100: 10 }

// Fragments the streak pays on reaching its `count`th day.
export const streakFragments = (count) =>
  (count > 0 && count % 7 === 0 ? STREAK_WEEK_FRAGMENTS : 0) + (STREAK_MILESTONE_FRAGMENTS[count] ?? 0)

export const RARITIES = ['common', 'uncommon', 'rare', 'legendary']
export const RARITY_COLORS = { common: '#9AA5B1', uncommon: '#4CAF7A', rare: '#4A90E2', legendary: '#C792FF' }
// Odds of being drawn as the next flag, relative to each other.
export const RARITY_WEIGHTS = { common: 4, uncommon: 3, rare: 2, legendary: 1 }
// Pieces that rebuild a flag of each rarity.
export const PIECES_BY_RARITY = { common: 2, uncommon: 3, rare: 4, legendary: 6 }

// Pieces of a flag of `rarity` ('uncommon' when unknown, like rarityOf).
export const piecesFor = (rarity) => PIECES_BY_RARITY[rarity] ?? PIECES_BY_RARITY.uncommon

// How the pieces of a flag cut into columns × rows when it is drawn (2 side by side, 3 strips, 4 quarters, 6 in two rows).
export const pieceGrid = (pieces) => {
  const cols = pieces >= 6 ? 3 : pieces === 4 ? 2 : pieces
  return { cols, rows: Math.ceil(pieces / cols) }
}

// Pieces of the flag `iso` of `pool`.
export const piecesOf = (iso, pool) => piecesFor(pool.find((flag) => flag.iso === iso)?.rarity)

const RARITY_BY_DIFFICULTY = { Facile: 'common', Moyen: 'uncommon', Difficile: 'rare', Impossible: 'legendary' }

// Rarity of a flag from the country's DifficultyFlag ('uncommon' when it has none).
export const rarityOf = (difficultyFlag) => RARITY_BY_DIFFICULTY[difficultyFlag] ?? 'uncommon'

/** The flags of GeoJSON `features` (properties.ISO_A2, properties.DifficultyFlag), one per iso, sorted: [{ iso, rarity }]. */
export function flagPool(features) {
  const byIso = new Map()
  for (const { properties } of features) {
    const iso = properties?.ISO_A2
    if (iso && !byIso.has(iso)) byIso.set(iso, { iso, rarity: rarityOf(properties.DifficultyFlag) })
  }
  return [...byIso.values()].sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0))
}

// ---------- Collection state ----------

/** users/{uid}.flags read safely (any document, even without it) against `pool`: unknown and repeated flags dropped. */
export function readFlags(data, pool) {
  const known = new Set(pool.map((flag) => flag.iso))
  const raw = data?.flags ?? {}
  const unlocked = [...new Set(Array.isArray(raw.unlocked) ? raw.unlocked : [])].filter((iso) => known.has(iso))
  const current = known.has(raw.current) && !unlocked.includes(raw.current) ? raw.current : null
  const pieces = current && Number.isFinite(raw.pieces) ? Math.min(piecesOf(current, pool) - 1, Math.max(0, Math.floor(raw.pieces))) : 0
  return { unlocked, current, pieces }
}

function seedOf(text) {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

// The next flag among those not unlocked (weighted by rarity), or null when none is left. Same seed, same flag.
function drawFlag(unlocked, pool, seed) {
  const taken = new Set(unlocked)
  const left = pool.filter((flag) => !taken.has(flag.iso))
  if (left.length === 0) return null
  const total = left.reduce((sum, flag) => sum + RARITY_WEIGHTS[flag.rarity], 0)
  let roll = mulberry32(seedOf(seed))() * total
  for (const flag of left) {
    roll -= RARITY_WEIGHTS[flag.rarity]
    if (roll < 0) return flag.iso
  }
  return left[left.length - 1].iso
}

/**
 * Adds `count` fragments to a readFlags() `state`: { state, unlocked: [iso completed by these fragments] }. Each
 * fragment is a piece of the current flag; the last piece unlocks it and the next one is drawn, from `seed` and the
 * number of flags already unlocked (so each draw can be reproduced). Once every flag is unlocked, fragments are dropped.
 */
export function addFragments(state, count, pool, seed) {
  let { unlocked, current, pieces } = state
  unlocked = [...unlocked]
  const completed = []
  const draw = () => drawFlag(unlocked, pool, `${seed}:${unlocked.length}`)
  if (count > 0 && !current) current = draw()
  for (let left = Math.max(0, Math.floor(count)); left > 0 && current; left -= 1) {
    pieces += 1
    if (pieces >= piecesOf(current, pool)) {
      unlocked.push(current)
      completed.push(current)
      pieces = 0
      current = draw()
    }
  }
  return { state: { unlocked, current, pieces: current ? pieces : 0 }, unlocked: completed }
}

// ---------- Mastery ----------

export const MASTERY_MODES = ['placement', 'flags', 'hardcore']

/**
 * The countries (ADMIN names) to find at the first try for each mode, from GeoGame GeoJSON `features`: Placement and
 * hardcore have every country with a Difficulty; Flags has the flags of the pool that the Flags game can ask (it
 * needs a DifficultyFlag). Returns { placement, flags, hardcore } arrays of names.
 */
export function masterySets(features) {
  const placement = features.filter(({ properties }) => properties?.Difficulty).map(({ properties }) => properties.ADMIN)
  const pooled = new Set(flagPool(features).map((flag) => flag.iso))
  const flags = features
    .filter(({ properties }) => pooled.has(properties?.ISO_A2) && properties.DifficultyFlag)
    .map(({ properties }) => properties.ADMIN)
  return { placement, flags, hardcore: [...placement] }
}

/** Progress of a mastery document against masterySets(): { placement: { found, total }, flags, hardcore, found, total }. */
export function masteryProgress(masteryDoc, sets) {
  const progress = { found: 0, total: 0 }
  for (const mode of MASTERY_MODES) {
    const names = new Set(Array.isArray(masteryDoc?.[mode]) ? masteryDoc[mode] : [])
    const found = sets[mode].filter((name) => names.has(name)).length
    progress[mode] = { found, total: sets[mode].length }
    progress.found += found
    progress.total += sets[mode].length
  }
  return progress
}

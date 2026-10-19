// Flag collection and mastery (docs/plan-fonctionnalites.md, step 6). Pure rules shared by the server (api/_lib/xp.mjs
// pays the fragments, api/_lib/elo.mjs records the mastery) and the clients (collection screens, achievements). No
// Firebase import and no JSON import: the data is passed in, and the API bundles this file.
//
// Flags
// - Completed missions and bonuses pay fragments (missions.js grantXp). PIECES_PER_FLAG pieces rebuild one flag; the
//   flags are drawn at random among those not unlocked yet, the rarer (harder) ones less often.
// - Pace: a week pays 3 daily missions × 7 + 7 daily bonuses + 3 weekly missions × 3 + a weekly bonus × 3 at most,
//   about 40 fragments, so about 10 flags a week and about 6 months to collect the 239 flags.
// - users/{uid}.flags, written by the server only: { unlocked: [iso, in the order they were unlocked],
//   current: iso being rebuilt | null, pieces: 0..PIECES_PER_FLAG - 1 pieces of `current` }.
//
// Mastery (the "Légende" badge)
// - mastery/{uid}, written by the server only (api/_lib/elo.mjs rateSolo): { placement: [ADMIN names], flags: [...],
//   hardcore: [...], updatedAt }, the countries the player found at the first try (found, no error) in that mode,
//   for good (not per season). 'hardcore' is reserved for the no-borders mode (step 7): nothing writes it yet.
//   Like Elo, the answers are reported by the client, so the badge is as honest as Elo.
import { mulberry32 } from './prng.js'

export const PIECES_PER_FLAG = 4
// Fragments paid with the missions (same moments as the XP).
export const DAILY_MISSION_FRAGMENTS = 1
export const DAILY_BONUS_FRAGMENTS = 1
export const WEEKLY_MISSION_FRAGMENTS = 3
export const WEEKLY_BONUS_FRAGMENTS = 3

export const RARITIES = ['common', 'uncommon', 'rare', 'legendary']
export const RARITY_COLORS = { common: '#9AA5B1', uncommon: '#4CAF7A', rare: '#4A90E2', legendary: '#C792FF' }
// Odds of being drawn as the next flag, relative to each other.
export const RARITY_WEIGHTS = { common: 4, uncommon: 3, rare: 2, legendary: 1 }

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
  const pieces = current && Number.isFinite(raw.pieces) ? Math.min(PIECES_PER_FLAG - 1, Math.max(0, Math.floor(raw.pieces))) : 0
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
    if (pieces >= PIECES_PER_FLAG) {
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

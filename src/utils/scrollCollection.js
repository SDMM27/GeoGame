// Scroll collection (docs/plan-parchemins.md): historical maps earned with seals. Pure rules shared by the server
// (api/_lib/xp.mjs pays the seals with the XP, api/_lib/weeklyTop.mjs pays the league champion) and the clients
// (collection screens). No Firebase import and no JSON import: the catalogue (src/data/scrolls.js) is passed in as
// `pool`, and the API bundles this file.
//
// - Seals come from (missions.js grantXp): the weekly missions bonus, each LEVEL_SEAL_EVERY levels, and a league win.
//   SEALS_PER_SCROLL seals unlock one scroll, drawn at random among those not unlocked yet, the rarer ones less often
//   (RARITY_WEIGHTS of flagCollection.js). Everybody gets STARTER_SCROLL for free, once.
// - Once every scroll of the pool is unlocked, seals stay banked (MAX_BANKED_SEALS at most) and are spent as soon as
//   new scrolls join the pool.
// - users/{uid}.scrolls, written by the server only: { unlocked: [id, in the order they were unlocked], seals: banked
//   seals, 0..SEALS_PER_SCROLL - 1 while a scroll is missing }.
import { RARITY_WEIGHTS, seedOf } from './flagCollection.js'
import { mulberry32 } from './prng.js'

export const SEALS_PER_SCROLL = 2
export const MAX_BANKED_SEALS = 4
export const WEEKLY_BONUS_SEALS = 1
// A seal for every multiple of this level reached.
export const LEVEL_SEAL_EVERY = 5
export const LEAGUE_WIN_SEALS = 1
export const STARTER_SCROLL = 'continents-1858'

/** users/{uid}.scrolls read safely (any document, even without it) against `pool`: unknown and repeated scrolls dropped. */
export function readScrolls(data, pool) {
  const known = new Set(pool.map((scroll) => scroll.id))
  const raw = data?.scrolls ?? {}
  const unlocked = [...new Set(Array.isArray(raw.unlocked) ? raw.unlocked : [])].filter((id) => known.has(id))
  const seals = Number.isFinite(raw.seals) ? Math.max(0, Math.floor(raw.seals)) : 0
  return { unlocked, seals }
}

// The next scroll among those not unlocked (weighted by rarity), or null when none is left. Same seed, same scroll.
function drawScroll(unlocked, pool, seed) {
  const taken = new Set(unlocked)
  const left = pool.filter((scroll) => !taken.has(scroll.id))
  if (left.length === 0) return null
  const total = left.reduce((sum, scroll) => sum + RARITY_WEIGHTS[scroll.rarity], 0)
  let roll = mulberry32(seedOf(seed))() * total
  for (const scroll of left) {
    roll -= RARITY_WEIGHTS[scroll.rarity]
    if (roll < 0) return scroll.id
  }
  return left[left.length - 1].id
}

/**
 * Adds `count` seals to a readScrolls() `state`: { state, unlocked: [ids completed by these seals] }. Each
 * SEALS_PER_SCROLL seals unlock a scroll, drawn from `seed` and the number of scrolls already unlocked (so each draw can
 * be reproduced). When none is left to unlock, the seals are banked, MAX_BANKED_SEALS at most.
 */
export function addSeals(state, count, pool, seed) {
  const unlocked = [...state.unlocked]
  const completed = []
  let seals = state.seals + Math.max(0, Math.floor(count))
  while (seals >= SEALS_PER_SCROLL) {
    const id = drawScroll(unlocked, pool, `${seed}:scrolls:${unlocked.length}`)
    if (!id) break
    unlocked.push(id)
    completed.push(id)
    seals -= SEALS_PER_SCROLL
  }
  const complete = unlocked.length >= pool.length
  return { state: { unlocked, seals: complete ? Math.min(seals, MAX_BANKED_SEALS) : seals }, unlocked: completed }
}

/**
 * What a player's document holds after `seals` seals are paid: { state, unlocked, changed }. The starter scroll is
 * granted first, for free, when they don't own it (it is then part of `unlocked`, and never comes from a draw). `changed`
 * is false when `state` is what the document already stores, so that nothing needs to be written.
 */
export function payScrolls(data, seals, pool, seed) {
  const read = readScrolls(data, pool)
  const starter = !read.unlocked.includes(STARTER_SCROLL) && pool.some((scroll) => scroll.id === STARTER_SCROLL)
  const start = starter ? { ...read, unlocked: [...read.unlocked, STARTER_SCROLL] } : read
  const paid = addSeals(start, seals, pool, seed)
  const stored = data?.scrolls
  return {
    state: paid.state,
    unlocked: starter ? [STARTER_SCROLL, ...paid.unlocked] : paid.unlocked,
    changed: !stored || JSON.stringify(stored) !== JSON.stringify(paid.state),
  }
}

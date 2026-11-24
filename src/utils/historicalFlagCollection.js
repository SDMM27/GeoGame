import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COST } from '../data/historicalFlags.js'
import { drawFlag, piecesOf, readFlags, seedOf } from './flagCollection.js'

export { HISTORICAL_FLAG_COST }
export const HISTORICAL_PACK = 'historical-pack'

const historicalIds = new Set(HISTORICAL_FLAGS.map(({ id }) => id))

export const isHistoricalFlag = (id) => historicalIds.has(id)

export function readHistoricalFlags(userData) {
  const raw = userData?.historicalFlags
  const unlocked = [...new Set(Array.isArray(raw?.unlocked) ? raw.unlocked.filter(isHistoricalFlag) : [])]
  const active = (isHistoricalFlag(raw?.active) || raw?.active === HISTORICAL_PACK) && !unlocked.includes(raw.active) ? raw.active : null
  const progress = {}
  for (const id of [...historicalIds, HISTORICAL_PACK]) {
    const count = raw?.progress?.[id]
    if (!unlocked.includes(id) && Number.isFinite(count) && count >= 1) {
      progress[id] = Math.min(Math.floor(count), HISTORICAL_FLAG_COST - 1)
    }
  }
  const next = (raw?.next === HISTORICAL_PACK || (isHistoricalFlag(raw?.next) && raw.next !== active)) && !unlocked.includes(raw.next) ? raw.next : null
  return { active, progress, unlocked, ...(next && { next }) }
}

function availableHistoricalFlags({ unlocked, active, next }) {
  return HISTORICAL_FLAGS.filter(({ id }) => id !== active && id !== next && !unlocked.includes(id))
}

// A mystery pack is only worth queueing while it can still reveal a flag the player doesn't own.
export const hasHistoricalPackReward = (state) => availableHistoricalFlags(state).length > 0

function drawCollectionFlag(flags, historical, pool, seed) {
  const remainingLegendaries = pool.filter(({ iso, rarity }) => rarity === 'legendary' && !flags.unlocked.includes(iso)).length
  const candidates = availableHistoricalFlags(historical)
  const weight = Math.min(0.5, (remainingLegendaries || candidates.length) / (2 * (candidates.length || 1)))
  const combined = candidates.length ? [...pool, { iso: HISTORICAL_PACK, weight: candidates.length * weight }] : pool
  return drawFlag(flags.unlocked, combined, `${seed}:${flags.unlocked.length + historical.unlocked.length}`)
}

// Both kinds share one active assembly and the same incoming fragments. Old accounts can have a paused classic flag.
export function awardFlagFragments(userData, count, pool, seed, { weeklyChoice = false, drawPackIndex } = {}) {
  const historical = readHistoricalFlags(userData)
  const before = JSON.stringify(historical)
  const flags = readFlags(userData, pool)
  const available = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  let historicalFragments = 0
  const unlockedFlags = []
  const unlockedHistoricalFlags = []
  const selectNext = () => {
    if (historical.next) {
      historical.active = historical.next
      delete historical.next
    } else if (!flags.current) {
      const id = drawCollectionFlag(flags, historical, pool, seed)
      if (id === HISTORICAL_PACK) historical.active = id
      else flags.current = id
    }
  }

  if (available && !historical.active && !flags.current) selectNext()
  for (let left = available; left > 0 && (historical.active || flags.current); left -= 1) {
    const id = historical.active
    if (id) {
      historicalFragments += 1
      const pieces = (historical.progress[id] ?? 0) + 1
      if (pieces < HISTORICAL_FLAG_COST) {
        historical.progress[id] = pieces
        continue
      }
      delete historical.progress[id]
      const candidates = availableHistoricalFlags(historical)
      const index = id === HISTORICAL_PACK && candidates.length
        ? (drawPackIndex?.(candidates.length) ?? seedOf(`${seed}:pack:${historical.unlocked.length}`) % candidates.length)
        : -1
      const unlocked = id === HISTORICAL_PACK ? candidates[index]?.id : id
      if (unlocked) {
        historical.unlocked.push(unlocked)
        unlockedHistoricalFlags.push(unlocked)
      }
      historical.active = null
    } else {
      flags.pieces += 1
      if (flags.pieces < piecesOf(flags.current, pool)) continue
      flags.unlocked.push(flags.current)
      unlockedFlags.push(flags.current)
      flags.current = null
      flags.pieces = 0
    }
    selectNext()
  }

  // The weekly bonus needs no reservation: the pack is queued at once, as the next assembly after the current one.
  if (weeklyChoice && !historical.next && historical.active !== HISTORICAL_PACK && hasHistoricalPackReward(historical)) {
    if (historical.active || flags.current) historical.next = HISTORICAL_PACK
    else historical.active = HISTORICAL_PACK
  }
  const historicalPackQueued = weeklyChoice && (historical.active === HISTORICAL_PACK || historical.next === HISTORICAL_PACK)
  return {
    flags,
    historicalFlags: JSON.stringify(historical) !== before ? historical : null,
    unlockedFlags,
    unlockedHistoricalFlags,
    classicFragments: available - historicalFragments,
    historicalFragments,
    ...(historicalPackQueued && { historicalPackQueued: true }),
  }
}

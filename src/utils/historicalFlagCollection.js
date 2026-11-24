import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COST } from '../data/historicalFlags.js'
import { addFragments, readFlags } from './flagCollection.js'

export { HISTORICAL_FLAG_COST }

const historicalIds = new Set(HISTORICAL_FLAGS.map(({ id }) => id))

export const isHistoricalFlag = (id) => historicalIds.has(id)

export function readHistoricalFlags(userData) {
  const raw = userData?.historicalFlags
  const unlocked = [...new Set(Array.isArray(raw?.unlocked) ? raw.unlocked.filter(isHistoricalFlag) : [])]
  const active = isHistoricalFlag(raw?.active) && !unlocked.includes(raw.active) ? raw.active : null
  const progress = {}
  for (const id of historicalIds) {
    const count = raw?.progress?.[id]
    if (!unlocked.includes(id) && Number.isFinite(count) && count >= 1) {
      progress[id] = Math.min(Math.floor(count), HISTORICAL_FLAG_COST - 1)
    }
  }
  return { active, progress, unlocked }
}

// Historical progress belongs to each card. Once the selected card is complete,
// any fragments left in the same reward go to the classic collection.
export function awardFlagFragments(userData, count, pool, seed) {
  const historical = readHistoricalFlags(userData)
  const { active, progress, unlocked } = historical
  const available = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const previous = active ? (progress[active] ?? 0) : 0
  const remainingCost = active ? HISTORICAL_FLAG_COST - previous : 0
  const historicalFragments = Math.min(available, remainingCost)
  const classicFragments = available - historicalFragments
  const unlockedHistoricalFlags = []
  if (historicalFragments > 0) {
    if (historicalFragments === remainingCost) {
      delete progress[active]
      unlocked.push(active)
      unlockedHistoricalFlags.push(active)
      historical.active = null
    } else {
      progress[active] = previous + historicalFragments
    }
  }

  const classic = addFragments(readFlags(userData, pool), classicFragments, pool, seed)
  return {
    flags: classic.state,
    historicalFlags: historicalFragments > 0 ? historical : null,
    unlockedFlags: classic.unlocked,
    unlockedHistoricalFlags,
    classicFragments,
    historicalFragments,
  }
}

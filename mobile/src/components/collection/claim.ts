// What the reward overlays read from an XP claim (onXpClaimed in @shared/utils/xp) and from the cached account.
import { readFlags, RARITY_COLORS } from '@shared/utils/flagCollection'
import { FLAG_POOL } from '@shared/utils/flagCollectionData'
import { cachedPublicData } from '@shared/utils/publicProfile'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type FlagsState = { unlocked: string[]; current: string | null; pieces: number }
export type Claim = {
  gained: number
  levelUp: boolean
  level: number
  fragments?: number
  unlockedFlags?: string[]
  // Dev only (see __emitXpClaimed): stands in for the cached account, to preview the overlays without a server.
  demoFlags?: FlagsState
}

const RARITY_OF = new Map((FLAG_POOL as { iso: string; rarity: Rarity }[]).map((flag) => [flag.iso, flag.rarity]))

export const rarityOf = (iso: string): Rarity => RARITY_OF.get(iso) ?? 'common'
export const rarityColor = (rarity: Rarity): string => (RARITY_COLORS as Record<Rarity, string>)[rarity]

/** The flags of the account after the claim (patched in the cache before the listeners run), or null when unknown. */
export function flagsAfter(claim: Claim, uid: string | undefined): FlagsState | null {
  if (claim.demoFlags) return claim.demoFlags
  const data = uid ? cachedPublicData(uid) : null
  return data ? (readFlags(data, FLAG_POOL) as FlagsState) : null
}

/** Runs a haptic call; nothing happens on the platforms without haptics. */
export function haptic(run: () => Promise<void>) {
  try {
    run().catch(() => {})
  } catch {
    // no haptics here
  }
}

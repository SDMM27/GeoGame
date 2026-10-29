// What the reward overlays read from an XP claim (onXpClaimed in @shared/utils/xp) and from the cached account.
import type { TFunction } from 'i18next'

import { readFlags, RARITY_COLORS } from '@shared/utils/flagCollection'
import { FLAG_POOL } from '@shared/utils/flagCollectionData'
import { cachedPublicData } from '@shared/utils/publicProfile'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type FlagsState = { unlocked: string[]; current: string | null; pieces: number }
// What the dailies and the streak paid (grantXp in @shared/utils/missions): { kind, fragments, streak? }.
export type Reward = { kind: 'dailies_all' | 'dailies_won_3' | 'dailies_won_all' | 'streak'; fragments: number; streak?: number }
export type Claim = {
  gained: number
  levelUp: boolean
  level: number
  fragments?: number
  rewards?: Reward[]
  unlockedFlags?: string[]
  // Dev only (see __emitXpClaimed): stands in for the cached account, to preview the overlays without a server.
  demoFlags?: FlagsState
}

const RARITY_OF = new Map((FLAG_POOL as { iso: string; rarity: Rarity }[]).map((flag) => [flag.iso, flag.rarity]))

export const rarityOf = (iso: string): Rarity => RARITY_OF.get(iso) ?? 'common'
export const rarityColor = (rarity: Rarity): string => (RARITY_COLORS as Record<Rarity, string>)[rarity]

/** Why a claim paid fragments beyond the missions and levels, one line per reward of the dailies and the streak: "Tous les défis du jour : +1 fragment". */
export const rewardLines = (t: TFunction, claim: Claim): string[] =>
  (claim.rewards ?? [])
    .filter((reward) => reward.fragments > 0)
    .map((reward) =>
      t('missions.reward_line', {
        reason: t(`missions.reward_${reward.kind}`, { days: reward.streak }),
        reward: t('missions.fragments', { count: reward.fragments }),
      }),
    )

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

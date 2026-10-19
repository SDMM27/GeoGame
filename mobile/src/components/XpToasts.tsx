// Toasts for the XP and flag fragments the server pays after a game or when the missions load (see onXpClaimed in
// @shared/utils/xp).
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { RARITY_COLORS } from '@shared/utils/flagCollection'
import { FLAG_POOL } from '@shared/utils/flagCollectionData'
import { getCountryName } from '@shared/utils/getCountryName'
import { onXpClaimed } from '@shared/utils/xp'

import { getFlag } from '@/flags'
import { showFlagToast, toast } from '@/shims/react-toastify'

type Claimed = { gained: number; levelUp: boolean; level: number; fragments?: number; unlockedFlags?: string[] }

export function XpToasts() {
  const { t, i18n } = useTranslation()
  useEffect(
    () =>
      onXpClaimed(({ gained, levelUp, level, fragments = 0, unlockedFlags = [] }: Claimed) => {
        if (gained > 0) toast.success(t('level.gained', { xp: gained }))
        if (fragments > 0) toast.success(t('level.fragments', { count: fragments }))
        for (const iso of unlockedFlags) {
          const rarity = (FLAG_POOL as { iso: string; rarity: string }[]).find((flag) => flag.iso === iso)?.rarity ?? 'common'
          const name = (getCountryName(iso, i18n.language) as string) || iso
          showFlagToast(
            t('level.flag_unlocked', { name, rarity: t(`collection.rarity.${rarity}`) }),
            getFlag(iso),
            (RARITY_COLORS as Record<string, string>)[rarity],
          )
        }
        if (levelUp) toast.success(t('level.up', { level }))
      }),
    [t, i18n.language],
  )
  return null
}

// Toasts for the XP and level the server pays after a game or when the missions load (see onXpClaimed in
// @shared/utils/xp). Fragments and flags have their own reward: components/collection.
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { onXpClaimed } from '@shared/utils/xp'

import { toast } from '@/shims/react-toastify'

type Claimed = { gained: number; levelUp: boolean; level: number }

export function XpToasts() {
  const { t } = useTranslation()
  useEffect(
    () =>
      onXpClaimed(({ gained, levelUp, level }: Claimed) => {
        if (gained > 0) toast.success(t('level.gained', { xp: gained }))
        if (levelUp) toast.success(t('level.up', { level }))
      }),
    [t],
  )
  return null
}

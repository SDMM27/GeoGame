// Toasts for the XP the server pays after a game or when the missions load (see onXpClaimed in @shared/utils/xp).
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { onXpClaimed } from '@shared/utils/xp'

import { toast } from '@/shims/react-toastify'

export function XpToasts() {
  const { t } = useTranslation()
  useEffect(
    () =>
      onXpClaimed(({ gained, levelUp, level }: { gained: number; levelUp: boolean; level: number }) => {
        if (gained > 0) toast.success(t('level.gained', { xp: gained }))
        if (levelUp) toast.success(t('level.up', { level }))
      }),
    [t],
  )
  return null
}

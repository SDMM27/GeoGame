// A short toast for the XP the server just paid ("+60 XP", "Niveau 4 atteint !"), mounted once for the whole site.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { onXpClaimed } from '../utils/xp'
import { FLAG_POOL } from '../utils/flagCollectionData'
import { RARITY_COLORS } from '../utils/flagCollection'
import { getCountryName } from '../utils/getCountryName'
import './XpToast.css'

const TOAST_MS = 3500

export default function XpToast() {
  const { t, i18n } = useTranslation()
  const [toast, setToast] = useState(null)

  useEffect(
    () =>
      onXpClaimed(({ gained, levelUp, level, fragments = 0, unlockedFlags = [] }) => {
        if (!(gained > 0) && !levelUp && !(fragments > 0) && unlockedFlags.length === 0) return
        setToast({ id: Date.now(), gained, levelUp, level, fragments, unlockedFlags })
      }),
    []
  )

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null
  return (
    <div className="xp-toast" role="status" key={toast.id}>
      {toast.gained > 0 && <strong>{t('level.gained', { xp: toast.gained })}</strong>}
      {toast.levelUp && <span>{t('level.up', { level: toast.level })}</span>}
      {toast.fragments > 0 && <span>{t('level.fragments', { count: toast.fragments })}</span>}
      {toast.unlockedFlags.map((iso) => {
        const rarity = FLAG_POOL.find((flag) => flag.iso === iso)?.rarity ?? 'common'
        return (
          <span key={iso} className="xp-toast-flag" style={{ color: RARITY_COLORS[rarity] }}>
            <img src={`/flags/${iso.toLowerCase()}.png`} alt="" />
            {t('level.flag_unlocked', { name: getCountryName(iso, i18n.language) ?? iso, rarity: t(`collection.rarity.${rarity}`) })}
          </span>
        )
      })}
    </div>
  )
}

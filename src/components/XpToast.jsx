// A short toast for the XP the server just paid ("+60 XP", "Niveau 4 atteint !"), mounted once for the whole site.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { onXpClaimed } from '../utils/xp'
import './XpToast.css'

const TOAST_MS = 3500

export default function XpToast() {
  const { t } = useTranslation()
  const [toast, setToast] = useState(null)

  useEffect(
    () =>
      onXpClaimed(({ gained, levelUp, level }) => {
        if (!(gained > 0) && !levelUp) return
        setToast({ id: Date.now(), gained, levelUp, level })
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
    </div>
  )
}

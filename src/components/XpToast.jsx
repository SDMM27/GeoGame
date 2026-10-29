// A short toast for the XP the server just paid ("+60 XP", "Niveau 4 atteint !"), mounted once for the whole site.
// Flags and fragments have their own rewards (collection/); the fragments line stays only when FragmentToast has no data.
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { onXpClaimed } from '../utils/xp'
import { useAccount } from '../auth'
import { flagsAfter } from './collection/claim'
import './XpToast.css'

const TOAST_MS = 3500

export default function XpToast() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const uid = account?.uid
  const [toast, setToast] = useState(null)

  useEffect(
    () =>
      onXpClaimed((claim) => {
        const { gained, levelUp, level, fragments = 0, unlockedFlags = [] } = claim
        // Fragments get a card of their own (FragmentToast) when the current flag is known
        const text = fragments > 0 && unlockedFlags.length === 0 && !flagsAfter(claim, uid)?.current ? fragments : 0
        if (!(gained > 0) && !levelUp && !(text > 0)) return
        setToast({ id: Date.now(), gained, levelUp, level, fragments: text })
      }),
    [uid]
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
    </div>
  )
}

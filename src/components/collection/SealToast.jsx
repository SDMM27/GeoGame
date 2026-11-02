// Small card above the XP toast when a claim pays scroll seals: "+1 seal (1/2)". The scroll the seals open has its own
// reward (ScrollUnlockOverlay).
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { onXpClaimed } from '../../utils/xp'
import { SEALS_PER_SCROLL, scrollsAfter, sealProgress } from '../../utils/scrollCollectionData'
import './SealToast.css'

const DURATION = 3200

export default function SealToast() {
  const { t } = useTranslation()
  const { account } = useAccount()
  const uid = account?.uid
  const [card, setCard] = useState(null)
  const nextId = useRef(0)
  const timer = useRef(null)

  useEffect(
    () =>
      onXpClaimed((claim) => {
        const seals = claim.seals ?? 0
        if (seals <= 0) return
        const scrolls = scrollsAfter(claim, uid)
        nextId.current += 1
        // Without the account's seals the count of this claim is all there is to show
        setCard({ id: nextId.current, seals, progress: scrolls ? sealProgress(scrolls.seals, seals) : Math.min(seals, SEALS_PER_SCROLL) })
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCard(null), DURATION)
      }),
    [uid]
  )
  useEffect(() => () => clearTimeout(timer.current), [])

  if (!card) return null
  return (
    <div className="seal-toast" role="status" key={card.id}>
      <span className="seal-toast-seal" aria-hidden="true" />
      <strong>{t('scrolls.seal_gain', { count: card.seals, progress: card.progress, total: SEALS_PER_SCROLL })}</strong>
    </div>
  )
}

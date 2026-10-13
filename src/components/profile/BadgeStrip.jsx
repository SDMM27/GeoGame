import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TIER_COLORS } from '../../utils/achievements'
import './BadgeStrip.css'

const CARD_WIDTH = 220
const MARGIN = 8

// Where the card goes: under the chip, kept inside the screen (above it when there is no room below).
function cardPosition(rect) {
  const left = Math.min(Math.max(rect.left + rect.width / 2 - CARD_WIDTH / 2, MARGIN), window.innerWidth - CARD_WIDTH - MARGIN)
  const below = rect.bottom + 8
  const flip = below + 110 > window.innerHeight
  return flip ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: below }
}

// A player's best badges (see utils/badges.js), small, next to their name. The tier gives the color.
// Hover, focus or tap a badge to see the challenge behind it.
export default function BadgeStrip({ badges }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(null) // { badge, style }
  const stripRef = useRef(null)

  // A tap elsewhere closes the card (there is no mouse leave on a phone)
  useEffect(() => {
    if (!shown) return undefined
    const close = (event) => {
      if (!stripRef.current?.contains(event.target)) setShown(null)
    }
    const dismiss = () => setShown(null)
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [shown])

  if (!badges?.top?.length) return null
  const show = (badge, element) => setShown({ badge, style: cardPosition(element.getBoundingClientRect()) })

  return (
    <span className="badge-strip" ref={stripRef}>
      {badges.top.map((badge) => {
        const label = `${t(`achievements.${badge.id}.title`)} · ${t(`achievements.tiers.${badge.tier}`)}`
        return (
          <button
            key={badge.id}
            type="button"
            className="badge-strip__chip"
            style={{ '--tier': TIER_COLORS[badge.tier] }}
            aria-label={label}
            onMouseEnter={(event) => show(badge, event.currentTarget)}
            onMouseLeave={() => setShown(null)}
            onFocus={(event) => show(badge, event.currentTarget)}
            onBlur={() => setShown(null)}
            onClick={(event) => (shown?.badge.id === badge.id ? setShown(null) : show(badge, event.currentTarget))}
          >
            {badge.emoji}
          </button>
        )
      })}
      {shown && (
        <span
          className="badge-card"
          role="tooltip"
          style={{ ...shown.style, width: CARD_WIDTH, '--tier': TIER_COLORS[shown.badge.tier] }}
        >
          <span className="badge-card__emoji">{shown.badge.emoji}</span>
          <span className="badge-card__body">
            <strong>{t(`achievements.${shown.badge.id}.title`)}</strong>
            <span className="badge-card__tier">{t(`achievements.tiers.${shown.badge.tier}`)}</span>
            <span className="badge-card__desc">{t(`achievements.${shown.badge.id}.desc`)}</span>
          </span>
        </span>
      )}
    </span>
  )
}

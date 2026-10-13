import React from 'react'
import { useTranslation } from 'react-i18next'
import { TIER_COLORS } from '../../utils/achievements'
import './BadgeStrip.css'

// A player's best badges (see utils/badges.js), small, next to their name. The tier gives the color.
export default function BadgeStrip({ badges }) {
  const { t } = useTranslation()
  if (!badges?.top?.length) return null
  return (
    <span className="badge-strip">
      {badges.top.map((badge) => {
        const label = `${t(`achievements.${badge.id}.title`)} · ${t(`achievements.tiers.${badge.tier}`)}`
        return (
          <span
            key={badge.id}
            className="badge-strip__chip"
            style={{ '--tier': TIER_COLORS[badge.tier] }}
            title={label}
            aria-label={label}
            role="img"
          >
            {badge.emoji}
          </span>
        )
      })}
    </span>
  )
}

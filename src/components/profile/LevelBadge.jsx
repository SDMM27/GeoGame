// Level chip and XP bar of an account (own and public profile). Nothing while the XP loads or for a visitor.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useXp } from '../../hooks/useXp'
import './LevelBadge.css'

export function XpBar({ xp }) {
  const { t } = useTranslation()
  const ratio = xp.needed > 0 ? Math.min(1, xp.into / xp.needed) : 0
  return (
    <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={xp.needed} aria-valuenow={xp.into} aria-label={t('level.progress', { into: xp.into, needed: xp.needed })}>
      <div className="xp-bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  )
}

export function LevelChip({ level }) {
  const { t } = useTranslation()
  return <span className="level-chip">{t('level.label', { level })}</span>
}

export default function LevelBadge({ uid }) {
  const { t } = useTranslation()
  const xp = useXp(uid)
  if (!xp) return null
  return (
    <div className="level-badge">
      <div className="level-badge-head">
        <LevelChip level={xp.level} />
        <small>{t('level.progress', { into: xp.into, needed: xp.needed })}</small>
      </div>
      <XpBar xp={xp} />
    </div>
  )
}

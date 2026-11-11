// Identity page of the passport: avatar, name in display type, level and « since » field on the tear-off stub.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { decorationStyle } from '../../utils/decorations'
import { Avatar } from './ProfileBody'
import LevelBadge from './LevelBadge'

export default function ProfileHeader({ player, decoration, children }) {
  const { t, i18n } = useTranslation()
  const since = player.createdAt && new Date(player.createdAt).toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })
  return (
    <header className="profile-header gg-ticket">
      <div className="profile-header-main">
        <Avatar username={player.username} size={72} decoration={decoration} />
        <div className="profile-header-text">
          <p className="gg-kicker">{t('profile.passport')}</p>
          <h1 style={{ color: decorationStyle(decoration).nameColor ?? undefined }}>{player.username}</h1>
          <LevelBadge uid={player.uid} />
          {children}
        </div>
      </div>
      {since && (
        <div className="gg-ticket-stub profile-header-stub">
          <span className="gg-field">
            <small>{t('profile.field_since')}</small>
            <strong>{since}</strong>
          </span>
        </div>
      )}
    </header>
  )
}

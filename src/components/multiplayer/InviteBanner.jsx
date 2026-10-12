// Pops up anywhere on the site when a friend invites the player to a room (same as the app's InviteBanner).
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import useInvites, { acceptInvite } from '../../hooks/useInvites'
import { isGamePath } from '../../utils/gamePaths'
import { roomGameIcon } from '../../utils/roomGames'
import './Invites.css'

export function InviteRow({ invite, onJoin, onClose, closeLabel }) {
  const { t } = useTranslation()
  return (
    <div className="invite-row">
      <span className="invite-icon" aria-hidden="true">{roomGameIcon(invite.gameId)}</span>
      <div className="invite-text">
        <strong>{t('invites.banner', { username: invite.fromUsername, game: t(`games.${invite.gameId}.title`) })}</strong>
        <span>{t(invite.mode === 'live' ? 'mp_room.live' : 'mp_room.challenge')}</span>
      </div>
      <button type="button" className="invite-join" onClick={onJoin}>
        {t('mp_room.join')}
      </button>
      <button type="button" className="invite-close" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
        ✕
      </button>
    </div>
  )
}

export default function InviteBanner() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { account } = useAccount()
  const invites = useInvites(account?.uid)
  // Invites already shown (or closed) on this page load: the banner only announces new ones.
  const [seen, setSeen] = useState(() => new Set())

  // Never interrupt a game. The Multi page lists the invites; a room page may be in a game.
  const hidden = isGamePath(pathname) || pathname.startsWith('/multiplayer')
  const invite = invites.find((item) => !seen.has(`${item.id}:${item.at}`))
  if (hidden || !invite) return null

  const hide = () => setSeen((previous) => new Set(previous).add(`${invite.id}:${invite.at}`))

  return (
    <div className="invite-banner" role="status" aria-live="polite">
      <InviteRow
        key={invite.id}
        invite={invite}
        onJoin={() => {
          hide()
          acceptInvite(invite, navigate)
        }}
        onClose={hide}
        closeLabel={t('invites.later')}
      />
    </div>
  )
}

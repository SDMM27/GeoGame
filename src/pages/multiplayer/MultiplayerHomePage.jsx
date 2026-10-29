// src/pages/multiplayer/MultiplayerHomePage.jsx
// The Multi section, like the app's tab: friends' invites, join with a code, start a game, reopen recent rooms.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../../components/NavBar'
import { InviteRow } from '../../components/multiplayer/InviteBanner'
import { useAccount } from '../../auth'
import useInvites, { acceptInvite } from '../../hooks/useInvites'
import { dismissInvite } from '../../utils/invites'
import { getRecentRooms } from '../../utils/recentRooms'
import { LISTED_ROOM_GAMES, gameColor, roomGameIcon } from '../../utils/roomGames'
import '../../components/multiplayer/Invites.css'
import './MultiplayerHomePage.css'

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const normalizeCode = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

export default function MultiplayerHomePage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [joinCode, setJoinCode] = useState('')
  const [recent] = useState(getRecentRooms)
  const { account } = useAccount()
  const invites = useInvites(account?.uid)
  const canJoin = joinCode.length === 6

  const handleJoin = (e) => {
    e.preventDefault()
    if (canJoin) navigate(`/multiplayer/room/${joinCode}`)
  }

  return (
    <div className="mp-home">
      <NavBar />
      <main className="mp-home-main">
        <header className="mp-home-header">
          <h1 className="mp-home-title">{t('multiplayer.title')}</h1>
          <p>{t('multiplayer.subtitle')}</p>
        </header>

        {invites.length > 0 && (
          <section className="invite-list">
            <h2>{t('invites.received_title')}</h2>
            {invites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onJoin={() => acceptInvite(invite, navigate)}
                onClose={() => dismissInvite(invite.id)}
                closeLabel={t('invites.decline')}
              />
            ))}
          </section>
        )}

        <form className="mp-join-card" onSubmit={handleJoin}>
          <h2>{t('multiplayer.join_title')}</h2>
          <div className="mp-join-form">
            <input
              className="mp-join-input"
              placeholder={t('multiplayer.code_placeholder')}
              aria-label={t('placeholders.room_code')}
              value={joinCode}
              onChange={(e) => setJoinCode(normalizeCode(e.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
            />
            <button type="submit" className="mp-join-btn" disabled={!canJoin}>
              {t('buttons.join')}
            </button>
          </div>
        </form>

        <section className="mp-section">
          <div className="mp-section-head">
            <h2>{t('multiplayer.create_title')}</h2>
            <p>{t('multiplayer.create_subtitle')}</p>
          </div>
          <div className="mp-rows">
            {LISTED_ROOM_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                className="mp-row"
                style={{ '--game': gameColor(game.id) }}
                onClick={() => navigate('/multiplayer/create', { state: { gameId: game.id } })}
              >
                <span className="mp-row-icon" aria-hidden="true">{game.icon}</span>
                <span className="mp-row-title">{t(`games.${game.id}.title`)}</span>
                <span className="mp-row-end"><PlusIcon /></span>
              </button>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <section className="mp-section">
            <div className="mp-section-head">
              <h2>{t('multiplayer.recent_title')}</h2>
            </div>
            <div className="mp-rows">
              {recent.map((room) => (
                <button
                  key={room.code}
                  type="button"
                  className="mp-row"
                  style={{ '--game': gameColor(room.gameId) }}
                  onClick={() => navigate(`/multiplayer/room/${room.code}`)}
                >
                  <span className="mp-row-icon" aria-hidden="true">{roomGameIcon(room.gameId)}</span>
                  <span className="mp-row-text">
                    <span className="mp-row-title">{t(`games.${room.gameId}.title`)}</span>
                    <span className="mp-row-desc">
                      {t(room.mode === 'live' ? 'mp_room.live' : 'mp_room.challenge')} ·{' '}
                      {new Date(room.at).toLocaleDateString(i18n.language)}
                    </span>
                  </span>
                  <span className="mp-row-code">{room.code}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

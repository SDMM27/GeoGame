// src/pages/multiplayer/MultiplayerHomePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../../components/NavBar'
import { InviteRow } from '../../components/multiplayer/InviteBanner'
import { useAccount } from '../../auth'
import useInvites, { acceptInvite } from '../../hooks/useInvites'
import { dismissInvite } from '../../utils/invites'
import './MultiplayerHomePage.css'

export default function MultiplayerHomePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [joinCode, setJoinCode] = useState('')
  const { account } = useAccount()
  const invites = useInvites(account?.uid)

  const handleJoin = (e) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length === 6) navigate(`/multiplayer/room/${code}`)
  }

  return (
    <div className="mp-home">
      <NavBar />
      <main className="mp-home-main">
        <h1 className="mp-home-title">{t('multiplayer.title')}</h1>
        {invites.length > 0 && (
          <section className="invite-list mp-home-invites">
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
        <div className="mp-home-cards">
          <button
            className="mp-card mp-card--create"
            onClick={() => navigate('/multiplayer/create')}
          >
            <span className="mp-card-icon">🎮</span>
            <span className="mp-card-label">{t('buttons.create_game')}</span>
          </button>
          <div className="mp-card mp-card--join">
            <span className="mp-card-icon">🔗</span>
            <span className="mp-card-label">{t('buttons.join')}</span>
            <form onSubmit={handleJoin} className="mp-join-form">
              <input
                className="mp-join-input"
                placeholder={t('placeholders.room_code')}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                type="submit"
                className="mp-join-btn"
                disabled={joinCode.trim().length !== 6}
              >
                {t('buttons.join')}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

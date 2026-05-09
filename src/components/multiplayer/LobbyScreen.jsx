// src/components/multiplayer/LobbyScreen.jsx
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { joinRoom, launchRoom } from '../../utils/multiplayerRoom'
import './LobbyScreen.css'

export default function LobbyScreen({ room, playerId, onPseudoSet }) {
  const { t } = useTranslation()
  const [pseudo, setPseudo] = useState('')
  const [joining, setJoining] = useState(false)

  const isInRoom = playerId in room.players
  const isHost = room.hostId === playerId
  const activePlayers = Object.values(room.players).filter(p => !p.disconnected)
  const canLaunch = activePlayers.length >= 2

  const handleJoin = async (e) => {
    e.preventDefault()
    const trimmed = pseudo.trim()
    if (!trimmed) return
    setJoining(true)
    try {
      await joinRoom({ roomId: room.id, playerId, pseudo: trimmed })
      onPseudoSet(trimmed)
    } finally {
      setJoining(false)
    }
  }

  const handleLaunch = () => launchRoom(room.id)

  const handleCopyLink = () => navigator.clipboard.writeText(window.location.href)

  if (!isInRoom) {
    return (
      <div className="lobby-join">
        <h2 className="lobby-join-title">{t('lobby.join_title')}</h2>
        <p className="lobby-join-code">{t('labels.code')} <strong>{room.id}</strong></p>
        <form onSubmit={handleJoin} className="lobby-join-form">
          <input
            className="lobby-pseudo-input"
            placeholder={t('placeholders.username')}
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="lobby-join-btn" disabled={!pseudo.trim() || joining}>
            {joining ? t('lobby.connecting') : t('buttons.join')}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="lobby">
      <h2 className="lobby-title">{t('lobby.waiting_room')}</h2>

      <div className="lobby-invite">
        <span className="lobby-invite-label">{t('lobby.invite_link')}</span>
        <div className="lobby-invite-row">
          <code className="lobby-invite-code">{room.id}</code>
          <button className="lobby-copy-btn" type="button" onClick={handleCopyLink}>
            {t('buttons.copy_link')}
          </button>
        </div>
      </div>

      <ul className="lobby-players">
        {Object.entries(room.players).map(([pid, player]) => (
          <li
            key={pid}
            className={`lobby-player${player.disconnected ? ' lobby-player--disconnected' : ''}${pid === room.hostId ? ' lobby-player--host' : ''}`}
          >
            <span className="lobby-player-pseudo">{player.pseudo}</span>
            {pid === room.hostId && <span className="lobby-host-badge">{t('labels.host')}</span>}
            {player.disconnected && <span className="lobby-dc-badge">{t('labels.disconnected')}</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="lobby-launch-btn"
          type="button"
          onClick={handleLaunch}
          disabled={!canLaunch}
        >
          {canLaunch ? t('buttons.launch_game') : t('lobby.waiting_for_players')}
        </button>
      ) : (
        <p className="lobby-waiting">{t('lobby.waiting_for_host')}</p>
      )}
    </div>
  )
}

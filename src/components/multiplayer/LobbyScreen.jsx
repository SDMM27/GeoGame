// src/components/multiplayer/LobbyScreen.jsx
import React, { useState } from 'react'
import { joinRoom, launchRoom } from '../../utils/multiplayerRoom'
import './LobbyScreen.css'

export default function LobbyScreen({ room, playerId, onPseudoSet }) {
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
    await joinRoom({ roomId: room.id, playerId, pseudo: trimmed })
    onPseudoSet(trimmed)
    setJoining(false)
  }

  const handleLaunch = () => launchRoom(room.id)

  const handleCopyLink = () => navigator.clipboard.writeText(window.location.href)

  if (!isInRoom) {
    return (
      <div className="lobby-join">
        <h2 className="lobby-join-title">Rejoindre la partie</h2>
        <p className="lobby-join-code">Code : <strong>{room.id}</strong></p>
        <form onSubmit={handleJoin} className="lobby-join-form">
          <input
            className="lobby-pseudo-input"
            placeholder="Ton pseudo"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="lobby-join-btn" disabled={!pseudo.trim() || joining}>
            {joining ? 'Connexion...' : 'Rejoindre'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="lobby">
      <h2 className="lobby-title">Salle d'attente</h2>

      <div className="lobby-invite">
        <span className="lobby-invite-label">Lien d'invitation</span>
        <div className="lobby-invite-row">
          <code className="lobby-invite-code">{room.id}</code>
          <button className="lobby-copy-btn" type="button" onClick={handleCopyLink}>
            Copier le lien
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
            {pid === room.hostId && <span className="lobby-host-badge">Host</span>}
            {player.disconnected && <span className="lobby-dc-badge">Déconnecté</span>}
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
          {canLaunch ? 'Lancer la partie' : 'En attente de joueurs... (min. 2)'}
        </button>
      ) : (
        <p className="lobby-waiting">En attente du lancement par le host...</p>
      )}
    </div>
  )
}

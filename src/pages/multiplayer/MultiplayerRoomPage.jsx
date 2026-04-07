// src/pages/multiplayer/MultiplayerRoomPage.jsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import LobbyScreen from '../../components/multiplayer/LobbyScreen'
import CountdownOverlay from '../../components/multiplayer/CountdownOverlay'
import useMultiplayerRoom from '../../hooks/useMultiplayerRoom'
import { getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerRoomPage.css'

export default function MultiplayerRoomPage() {
  const { roomId } = useParams()
  const [playerId] = useState(getOrCreatePlayerId)
  const [gameStarted, setGameStarted] = useState(false)
  const { room, progress, gameResults, loading, error } = useMultiplayerRoom(roomId)

  if (loading) {
    return (
      <div className="mp-room">
        <NavBar />
        <div className="mp-room-loading">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mp-room">
        <NavBar />
        <div className="mp-room-error">{error}</div>
      </div>
    )
  }

  if (!room) return null

  const showCountdown = room.status === 'playing' && room.startAt && !gameStarted
  const showLobby = room.status === 'lobby'

  return (
    <div className="mp-room">
      <NavBar />

      {showCountdown && (
        <CountdownOverlay
          startAt={room.startAt}
          onStart={() => setGameStarted(true)}
        />
      )}

      {showLobby && (
        <LobbyScreen
          room={room}
          playerId={playerId}
          // No-op: the Firestore onSnapshot subscription automatically updates
          // room.players when joinRoom() resolves, re-rendering LobbyScreen with
          // the player now in the room (isInRoom becomes true).
          onPseudoSet={() => {}}
        />
      )}

      {(room.status === 'playing' && gameStarted) && (
        <div className="mp-game-placeholder">
          {/* Plan 2 : remplacer par le composant de jeu en cours */}
          <p>Jeu {room.currentGameIndex + 1} / {room.config.games.length} en cours...</p>
        </div>
      )}
    </div>
  )
}

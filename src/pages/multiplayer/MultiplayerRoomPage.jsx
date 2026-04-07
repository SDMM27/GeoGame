// src/pages/multiplayer/MultiplayerRoomPage.jsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import LobbyScreen from '../../components/multiplayer/LobbyScreen'
import CountdownOverlay from '../../components/multiplayer/CountdownOverlay'
import MultiplayerGame from '../../components/multiplayer/MultiplayerGame'
import BetweenGamesScreen from '../../components/multiplayer/BetweenGamesScreen'
import FinalLeaderboard from '../../components/multiplayer/FinalLeaderboard'
import useMultiplayerRoom from '../../hooks/useMultiplayerRoom'
import { getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerRoomPage.css'

export default function MultiplayerRoomPage() {
  const { roomId } = useParams()
  const [playerId] = useState(getOrCreatePlayerId)
  const [gameStarted, setGameStarted] = useState(false)
  const { room, progress, gameResults, loading, error } = useMultiplayerRoom(roomId)

  // Réinitialiser gameStarted quand un nouveau jeu démarre (nouveau gameIndex)
  const [lastGameIndex, setLastGameIndex] = useState(null)
  if (room && room.status === 'playing' && room.currentGameIndex !== lastGameIndex) {
    setLastGameIndex(room.currentGameIndex)
    if (lastGameIndex !== null) setGameStarted(false)  // nouveau jeu → remettre le countdown
  }

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

  // ── Lobby ────────────────────────────────────────────────────
  if (room.status === 'lobby') {
    return (
      <div className="mp-room">
        <NavBar />
        <LobbyScreen
          room={room}
          playerId={playerId}
          onPseudoSet={() => {}}
        />
      </div>
    )
  }

  // ── Jeu en cours ─────────────────────────────────────────────
  if (room.status === 'playing') {
    const showCountdown = room.startAt && !gameStarted
    return (
      <div className="mp-room mp-room--playing">
        <NavBar />
        {showCountdown && (
          <CountdownOverlay
            startAt={room.startAt}
            onStart={() => setGameStarted(true)}
          />
        )}
        {gameStarted && (
          <MultiplayerGame
            room={room}
            progress={progress}
            playerId={playerId}
            roomId={roomId}
          />
        )}
      </div>
    )
  }

  // ── Entre deux jeux ──────────────────────────────────────────
  if (room.status === 'between_games') {
    return (
      <div className="mp-room">
        <NavBar />
        <BetweenGamesScreen
          room={room}
          gameResults={gameResults}
          playerId={playerId}
          roomId={roomId}
        />
      </div>
    )
  }

  // ── Classement final ─────────────────────────────────────────
  if (room.status === 'finished') {
    return (
      <div className="mp-room">
        <NavBar />
        <FinalLeaderboard
          room={room}
          gameResults={gameResults}
          playerId={playerId}
          roomId={roomId}
        />
      </div>
    )
  }

  return (
    <div className="mp-room">
      <NavBar />
      <div className="mp-room-loading">Statut inconnu : {room.status}</div>
    </div>
  )
}

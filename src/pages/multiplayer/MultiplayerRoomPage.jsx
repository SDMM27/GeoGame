// src/pages/multiplayer/MultiplayerRoomPage.jsx
import React, { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../../components/NavBar'
import MultiplayerRoom from '../../components/multiplayer/MultiplayerRoom'
import useMultiplayerRoom from '../../hooks/useMultiplayerRoom'
import { getOrCreatePlayerId, isRoomFormat } from '../../utils/multiplayerRoom'
import './MultiplayerRoomPage.css'

export default function MultiplayerRoomPage() {
  const { t } = useTranslation()
  const { roomId } = useParams()
  // ?watch=1: opened from a friend's "watch" button
  const [searchParams] = useSearchParams()
  const [playerId] = useState(getOrCreatePlayerId)
  const { room, progress, gameResults, loading, error } = useMultiplayerRoom(roomId)

  return (
    <div className="mp-room">
      <NavBar />
      {loading ? (
        <div className="mp-room-loading">{t('lobby.connecting')}</div>
      ) : error || !isRoomFormat(room) ? (
        // Rooms of the former multi-game format can no longer be played
        <div className="mp-room-error">{t('mp_room.not_found')}</div>
      ) : (
        <MultiplayerRoom room={room} progress={progress} gameResults={gameResults} playerId={playerId} watch={searchParams.get('watch') === '1'} />
      )}
    </div>
  )
}

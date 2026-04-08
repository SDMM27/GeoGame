// src/pages/multiplayer/MultiplayerCreatePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import RoomConfig from '../../components/multiplayer/RoomConfig'
import { createRoom, getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerCreatePage.css'

export default function MultiplayerCreatePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async ({ pseudo, config }) => {
    setSubmitting(true)
    try {
      const playerId = getOrCreatePlayerId()
      const roomId = await createRoom({ hostId: playerId, hostPseudo: pseudo, config })
      navigate(`/multiplayer/room/${roomId}`)
    } catch (err) {
      console.error('Erreur création room :', err)
      setSubmitting(false)
    }
  }

  return (
    <div className="mp-create">
      <NavBar />
      <RoomConfig onSubmit={handleSubmit} submitting={submitting} />
    </div>
  )
}

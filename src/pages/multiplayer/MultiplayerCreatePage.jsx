// src/pages/multiplayer/MultiplayerCreatePage.jsx
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import RoomConfig from '../../components/multiplayer/RoomConfig'
import { useAccount } from '../../auth'
import { PSEUDO_STORAGE_KEY } from '../../utils/account'
import { createRoom, getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerCreatePage.css'

export default function MultiplayerCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { account } = useAccount()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async ({ pseudo, mode, games }) => {
    setSubmitting(true)
    try {
      try {
        localStorage.setItem(PSEUDO_STORAGE_KEY, pseudo)
      } catch {
        // Storage unavailable — prefill is only a convenience.
      }
      const code = await createRoom({
        games,
        mode,
        hostId: getOrCreatePlayerId(),
        pseudo,
        uid: account?.uid,
        createdOn: 'web',
      })
      navigate(`/multiplayer/room/${code}`)
    } catch (err) {
      console.error('Erreur création room :', err)
      setSubmitting(false)
    }
  }

  return (
    <div className="mp-create">
      <NavBar />
      <RoomConfig onSubmit={handleSubmit} submitting={submitting} initialGameId={location.state?.gameId} initialConfig={location.state?.config} />
    </div>
  )
}

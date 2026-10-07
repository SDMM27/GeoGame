// src/pages/multiplayer/MultiplayerCreatePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import RoomConfig from '../../components/multiplayer/RoomConfig'
import { useAccount } from '../../auth'
import { PSEUDO_STORAGE_KEY } from '../../utils/account'
import { createRoom, getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerCreatePage.css'

export default function MultiplayerCreatePage() {
  const navigate = useNavigate()
  const { account } = useAccount()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async ({ pseudo, mode, game }) => {
    setSubmitting(true)
    try {
      try {
        localStorage.setItem(PSEUDO_STORAGE_KEY, pseudo)
      } catch {
        // Storage unavailable — prefill is only a convenience.
      }
      const code = await createRoom({
        game,
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
      <RoomConfig onSubmit={handleSubmit} submitting={submitting} />
    </div>
  )
}

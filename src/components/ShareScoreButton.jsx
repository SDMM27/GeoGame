import React, { useState } from 'react'
import { exportShareCard } from '../utils/shareScore'
import './ShareScoreButton.css'

export default function ShareScoreButton({ score, gameType, difficulty, scoreLabel = 'POINTS' }) {
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('geogame_pseudo') ?? '')
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    localStorage.setItem('geogame_pseudo', pseudo)
    setSharing(true)
    try {
      await exportShareCard({ score, gameType, difficulty, pseudo, scoreLabel })
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="share-score-block">
      <input
        aria-label="Ton pseudo (optionnel)"
        className="share-pseudo-input"
        type="text"
        placeholder="Ton pseudo (optionnel)"
        value={pseudo}
        onChange={e => setPseudo(e.target.value)}
        maxLength={30}
      />
      <button
        className="share-score-btn"
        onClick={handleShare}
        disabled={sharing}
        aria-busy={sharing}
        aria-label={sharing ? 'Partage en cours…' : 'Partager mon score'}
      >
        {sharing ? 'Partage en cours…' : '📤 Partager mon score'}
      </button>
    </div>
  )
}

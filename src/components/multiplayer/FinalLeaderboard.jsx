// src/components/multiplayer/FinalLeaderboard.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase'
import { clearGameResults, updateRoomStatus } from '../../utils/multiplayerRoom'
import './FinalLeaderboard.css'

export default function FinalLeaderboard({ room, gameResults, playerId, roomId }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isHost = room.hostId === playerId
  const [rematchSubmitting, setRematchSubmitting] = useState(false)

  // Le tri ici dépend de totalPoints, qui doit refléter ton nouveau système de scoring pondéré
  const sortedPlayers = Object.entries(room.players)
    .filter(([, p]) => !p.disconnected)
    .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)

  const medals = ['🥇', '🥈', '🥉']
  const gameCount = room.config.games.length

  // Extraction chirurgicale des nouvelles statistiques détaillées
  const statsByPlayerAndGame = {}
  Object.values(gameResults).forEach(r => {
    if (!statsByPlayerAndGame[r.playerId]) statsByPlayerAndGame[r.playerId] = {}
    statsByPlayerAndGame[r.playerId][r.gameIndex] = {
      points: r.points,
      perfects: r.perfects ?? 0,   // Trouvés du 1er coup
      stumbles: r.stumbles ?? 0,   // Trouvés en plusieurs coups
      failures: r.failures ?? 0,   // Temps écoulé ou essais épuisés
      rank: r.rank,
    }
  })

  const rankByPlayerAndGame = {}
  for (let gi = 0; gi < gameCount; gi++) {
    const sorted = Object.values(gameResults)
      .filter(r => r.gameIndex === gi)
      .sort((a, b) => a.rank - b.rank)
    sorted.forEach((r, idx) => {
      if (!rankByPlayerAndGame[r.playerId]) rankByPlayerAndGame[r.playerId] = {}
      rankByPlayerAndGame[r.playerId][gi] = idx
    })
  }

  const handleRematch = async () => {
    if (!isHost || rematchSubmitting) return
    setRematchSubmitting(true)
    try {
      const newSeed = Math.floor(Math.random() * 2 ** 31)
      const playerUpdates = {}
      Object.keys(room.players).forEach(pid => {
        playerUpdates[`players.${pid}.totalPoints`] = 0
      })
      await clearGameResults(roomId)
      await updateDoc(doc(firestore, 'rooms', roomId), {
        ...playerUpdates,
        status: 'lobby',
        currentGameIndex: 0,
        seed: newSeed,
        startAt: null,
      })
    } finally {
      setRematchSubmitting(false)
    }
  }

  const handleReconfigure = async () => {
    if (!isHost) return
    await updateRoomStatus(roomId, 'reconfiguring')
  }

  const handleHome = () => navigate('/')

  return (
    <div className="final-leaderboard">
      <h1 className="final-lb-title">{t('leaderboard.final_title')}</h1>

      <div className="final-lb-podium">
        {sortedPlayers.map(([pid, player], index) => (
          <div key={pid} className={`final-lb-row${pid === playerId ? ' final-lb-row--me' : ''}`}>
            <span className="final-lb-medal">{medals[index] ?? `${index + 1}`}</span>
            <span className="final-lb-pseudo">{player.pseudo}{pid === playerId ? ` ${t('labels.you')}` : ''}</span>
            <span className="final-lb-pts">{player.totalPoints} pts</span>
          </div>
        ))}
      </div>

      {gameCount > 1 && (
        <div className="final-lb-detail">
          <h2 className="final-lb-detail-title">Analyse des performances par jeu</h2>
          <table className="final-lb-table">
            <thead>
              <tr>
                <th>{t('labels.player')}</th>
                {room.config.games.map((g, i) => (
                  <th key={i}>{g.type.charAt(0) + g.type.slice(1).toLowerCase().replace('_', ' ')}</th>
                ))}
                <th>{t('labels.points')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(([pid, player]) => (
                <tr key={pid} className={pid === playerId ? 'final-lb-row-detail--me' : ''}>
                  <td>{player.pseudo}</td>
                  {Array.from({ length: gameCount }, (_, gi) => {
                    const stats = statsByPlayerAndGame[pid]?.[gi]
                    const rankIdx = rankByPlayerAndGame[pid]?.[gi]
                    if (stats == null) return <td key={gi} className="final-lb-cell">—</td>

                    return (
                      <td key={gi} className="final-lb-cell">
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {medals[rankIdx] ?? `${rankIdx + 1}`} · {stats.points} pt{stats.points > 1 ? 's' : ''}
                        </div>
                        <div style={{ fontSize: '0.85em', display: 'flex', justifyContent: 'center', gap: '8px', opacity: 0.8 }}>
                          <span title="One-shots">🎯 {stats.perfects}</span>
                          <span title="Repêchages">🔄 {stats.stumbles}</span>
                          <span title="Échecs">❌ {stats.failures}</span>
                        </div>
                      </td>
                    )
                  })}
                  <td className="final-lb-total">{player.totalPoints} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isHost ? (
        <div className="final-lb-actions">
          <button className="final-lb-btn final-lb-btn--rematch" onClick={handleRematch} disabled={rematchSubmitting}>
            🔄 Revanche
          </button>
          <button className="final-lb-btn final-lb-btn--reconfig" onClick={handleReconfigure}>
            ⚙️ Reconfigurer
          </button>
          <button className="final-lb-btn final-lb-btn--home" onClick={handleHome}>
            ← Accueil
          </button>
        </div>
      ) : (
        <div className="final-lb-actions">
          <button className="final-lb-btn final-lb-btn--home" onClick={handleHome}>← Accueil</button>
        </div>
      )}
    </div>
  )
}
// src/components/multiplayer/FinalLeaderboard.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase'
import './FinalLeaderboard.css'

export default function FinalLeaderboard({ room, gameResults, playerId, roomId }) {
  const navigate = useNavigate()
  const isHost = room.hostId === playerId

  const sortedPlayers = Object.entries(room.players)
    .filter(([, p]) => !p.disconnected)
    .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)

  const medals = ['🥇', '🥈', '🥉']

  const gameCount = room.config.games.length
  const pointsByPlayerAndGame = {}
  Object.values(gameResults).forEach(r => {
    if (!pointsByPlayerAndGame[r.playerId]) pointsByPlayerAndGame[r.playerId] = {}
    pointsByPlayerAndGame[r.playerId][r.gameIndex] = r.points
  })

  const handleRematch = async () => {
    if (!isHost) return
    const newSeed = Math.floor(Math.random() * 2 ** 31)
    const playerUpdates = {}
    Object.keys(room.players).forEach(pid => {
      playerUpdates[`players.${pid}.totalPoints`] = 0
    })
    await updateDoc(doc(firestore, 'rooms', roomId), {
      ...playerUpdates,
      status: 'lobby',
      currentGameIndex: 0,
      seed: newSeed,
      startAt: null,
    })
  }

  const handleHome = () => navigate('/')

  return (
    <div className="final-leaderboard">
      <h1 className="final-lb-title">🏆 Résultats finaux</h1>

      <div className="final-lb-podium">
        {sortedPlayers.map(([pid, player], index) => (
          <div key={pid} className={`final-lb-row${pid === playerId ? ' final-lb-row--me' : ''}`}>
            <span className="final-lb-medal">{medals[index] ?? `${index + 1}`}</span>
            <span className="final-lb-pseudo">{player.pseudo}{pid === playerId ? ' (Toi)' : ''}</span>
            <span className="final-lb-pts">{player.totalPoints} pts</span>
          </div>
        ))}
      </div>

      {gameCount > 1 && (
        <div className="final-lb-detail">
          <h2 className="final-lb-detail-title">Détail par jeu</h2>
          <table className="final-lb-table">
            <thead>
              <tr>
                <th>Joueur</th>
                {room.config.games.map((g, i) => (
                  <th key={i}>{g.type.charAt(0) + g.type.slice(1).toLowerCase().replace('_', ' ')}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(([pid, player]) => (
                <tr key={pid} className={pid === playerId ? 'final-lb-row-detail--me' : ''}>
                  <td>{player.pseudo}</td>
                  {Array.from({ length: gameCount }, (_, gi) => (
                    <td key={gi} className="final-lb-cell">
                      {pointsByPlayerAndGame[pid]?.[gi] != null
                        ? `${medals[Object.values(gameResults).filter(r => r.gameIndex === gi).sort((a,b) => a.rank - b.rank).findIndex(r => r.playerId === pid)]} ${pointsByPlayerAndGame[pid][gi]}pt`
                        : '—'}
                    </td>
                  ))}
                  <td className="final-lb-total">{player.totalPoints} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isHost && (
        <div className="final-lb-actions">
          <button className="final-lb-btn final-lb-btn--rematch" onClick={handleRematch}>
            🔄 Revanche
          </button>
          <button className="final-lb-btn final-lb-btn--home" onClick={handleHome}>
            ← Accueil
          </button>
        </div>
      )}
      {!isHost && (
        <div className="final-lb-actions">
          <button className="final-lb-btn final-lb-btn--home" onClick={handleHome}>← Accueil</button>
        </div>
      )}
    </div>
  )
}

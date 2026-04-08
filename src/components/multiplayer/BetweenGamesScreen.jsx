// src/components/multiplayer/BetweenGamesScreen.jsx
import React, { useEffect, useRef, useState } from 'react'
import { updateRoomStatus } from '../../utils/multiplayerRoom'
import './BetweenGamesScreen.css'

const AUTO_ADVANCE_SECONDS = 10

export default function BetweenGamesScreen({ room, gameResults, playerId, roomId }) {
  const gameIndex = room.currentGameIndex
  const isHost = room.hostId === playerId
  const isLastGame = gameIndex >= room.config.games.length - 1
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_SECONDS)
  const advancedRef = useRef(false)

  const advance = () => {
    if (advancedRef.current) return
    advancedRef.current = true
    if (isLastGame) {
      updateRoomStatus(roomId, 'finished')
    } else {
      updateRoomStatus(roomId, 'playing', { currentGameIndex: gameIndex + 1 })
    }
  }

  useEffect(() => {
    if (!isHost) return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          advance()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isHost]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentResults = Object.values(gameResults)
    .filter(r => r.gameIndex === gameIndex)
    .sort((a, b) => a.rank - b.rank)

  const formatTime = (ms) => {
    if (!ms || ms === Infinity) return '—'
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  const medals = ['🥇', '🥈', '🥉']
  const gameConfig = room.config.games[gameIndex]

  return (
    <div className="between-games">
      <h2 className="between-games-title">
        Jeu {gameIndex + 1} / {room.config.games.length} terminé !
      </h2>
      <p className="between-games-game-name">{gameConfig.type} — {gameConfig.mode === 'ascension' ? 'Ascension' : gameConfig.difficulty ?? `${gameConfig.countryCount} pays`}</p>

      <table className="between-games-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            <th>Tentatives</th>
            <th>Temps</th>
            <th>Points</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {currentResults.map(result => {
            const playerData = room.players[result.playerId]
            const isMe = result.playerId === playerId
            return (
              <tr key={result.playerId} className={isMe ? 'between-games-row--me' : ''}>
                <td>{medals[result.rank - 1] ?? result.rank}</td>
                <td>{playerData?.pseudo ?? '?'}{isMe ? ' (Toi)' : ''}</td>
                <td>{result.attempts}</td>
                <td>{formatTime(result.elapsedTime)}</td>
                <td className="between-games-pts">+{result.points} pt{result.points > 1 ? 's' : ''}</td>
                <td className="between-games-total">{playerData?.totalPoints ?? 0} pts</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {isHost ? (
        <div className="between-games-actions">
          <button className="between-games-next-btn" onClick={advance}>
            {isLastGame ? 'Voir le classement final' : `Jeu suivant →`}
          </button>
          <p className="between-games-auto">
            {countdown > 0 ? `Avancement automatique dans ${countdown}s` : 'Avancement...'}
          </p>
        </div>
      ) : (
        <p className="between-games-waiting">En attente du host...</p>
      )}
    </div>
  )
}

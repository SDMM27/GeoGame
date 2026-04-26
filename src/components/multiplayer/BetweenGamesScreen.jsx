// src/components/multiplayer/BetweenGamesScreen.jsx
import React, { useRef } from 'react'
import { updateRoomStatus } from '../../utils/multiplayerRoom'
import { GAME_TYPES } from '../../utils/gameTypes'
import './BetweenGamesScreen.css'

export default function BetweenGamesScreen({ room, gameResults, playerId, roomId, isChill = false }) {
  const gameIndex = room.currentGameIndex
  const isHost = room.hostId === playerId
  const isLastGame = gameIndex >= room.config.games.length - 1
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
  const isGuessGame =
    gameConfig.type === GAME_TYPES.BORDER_GUESS ||
    gameConfig.type === GAME_TYPES.COUNTRY_CLUE

  return (
    <div className="between-games">
      <h2 className="between-games-title">
        Jeu {gameIndex + 1} / {room.config.games.length} terminé !
      </h2>
      <p className="between-games-game-name">
        {gameConfig.type} — {gameConfig.mode === 'ascension' ? 'Ascension' : gameConfig.difficulty ?? `${gameConfig.countryCount} pays`}
      </p>

      {isChill ? (
        // ─── Affichage Chill : score brut cumulatif ──────────────────────────
        <table className="between-games-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Joueur</th>
              <th>Score</th>
              <th>Pays trouvés</th>
              <th>❌ Non trouvés</th>
              <th>Points gagnés</th>
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
                  <td><strong>{result.weightedScore ?? 0}</strong></td>
                  <td>{result.countriesSolved ?? 0}</td>
                  <td>{result.attempts ?? 0}</td>
                  <td className="between-games-pts">+{result.points} pt{result.points > 1 ? 's' : ''}</td>
                  <td className="between-games-total">{playerData?.totalPoints ?? 0} pts</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : isGuessGame ? (
        // ─── Affichage Normal Guess ──────────────────────────────────────────
        <table className="between-games-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Joueur</th>
              <th>Pays trouvés</th>
              <th>Tentatives Ratées</th>
              <th>❌ Non trouvés</th>
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
                  <td>{result.countriesSolved ?? 0}</td>
                  <td>{result.attempts ?? 0}</td>
                  <td>{result.failures ?? 0}</td>
                  <td>{formatTime(result.elapsedTime)}</td>
                  <td className="between-games-pts">+{result.points} pt{result.points > 1 ? 's' : ''}</td>
                  <td className="between-games-total">{playerData?.totalPoints ?? 0} pts</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        // ─── Affichage Normal Placement/Flags/Capitals ───────────────────────
        <table className="between-games-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Joueur</th>
              <th>Score</th>
              <th>Pays trouvés</th>
              <th>🎯 One tap</th>
              <th>🔄 Hésitations</th>
              <th>❌ Non trouvés</th>
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
                  <td><strong>{result.weightedScore ?? 0}</strong></td>
                  <td>{result.countriesSolved ?? 0}</td>
                  <td>{result.perfects ?? 0}</td>
                  <td>{result.stumbles ?? 0}</td>
                  <td>{result.failures ?? 0}</td>
                  <td>{formatTime(result.elapsedTime)}</td>
                  <td className="between-games-pts">+{result.points} pt{result.points > 1 ? 's' : ''}</td>
                  <td className="between-games-total">{playerData?.totalPoints ?? 0} pts</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {(gameConfig.type === GAME_TYPES.FLAGS || gameConfig.type === GAME_TYPES.CAPITALS) && (
        <p className="between-games-stumbles-note">
          ⚠️ Pour les jeux de saisie (drapeaux, capitales), la première hésitation par pays est tolérée et n'impacte pas le score — les fautes de frappe arrivent !
        </p>
      )}

      {isHost ? (
        <div className="between-games-actions">
          <button className="between-games-next-btn" onClick={advance}>
            {isLastGame ? 'Voir le classement final' : 'Jeu suivant →'}
          </button>
        </div>
      ) : (
        <p className="between-games-waiting">En attente du host...</p>
      )}
    </div>
  )
}

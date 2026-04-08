// src/components/multiplayer/ReconfigureScreen.jsx
import React, { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '../../Firebase'
import { clearGameResults } from '../../utils/multiplayerRoom'
import { GameSettings, defaultGame, GAME_META } from './RoomConfig'
import './ReconfigureScreen.css'

export default function ReconfigureScreen({ room, playerId, roomId }) {
  const isHost = room.hostId === playerId
  const [games, setGames] = useState(() => room.config.games)
  const [submitting, setSubmitting] = useState(false)

  const usedTypes = new Set(games.map(g => g.type))
  const availableToAdd = Object.keys(GAME_META).filter(t => !usedTypes.has(t))

  const addGame = (type) => setGames(prev => [...prev, defaultGame(type)])
  const removeGame = (i) => setGames(prev => prev.filter((_, idx) => idx !== i))

  const moveUp = (i) => setGames(prev => {
    if (i === 0) return prev
    const arr = [...prev]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    return arr
  })

  const moveDown = (i) => setGames(prev => {
    if (i === prev.length - 1) return prev
    const arr = [...prev]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    return arr
  })

  const updateGame = (i, updated) =>
    setGames(prev => prev.map((g, idx) => (idx === i ? updated : g)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (games.length === 0 || submitting) return
    setSubmitting(true)
    try {
      await clearGameResults(roomId)
      const newSeed = Math.floor(Math.random() * 2 ** 31)
      const playerUpdates = {}
      Object.keys(room.players).forEach(pid => {
        playerUpdates[`players.${pid}.totalPoints`] = 0
      })
      await updateDoc(doc(firestore, 'rooms', roomId), {
        ...playerUpdates,
        config: { games },
        seed: newSeed,
        currentGameIndex: 0,
        startAt: null,
        status: 'lobby',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isHost) {
    return (
      <div className="reconfig-waiting">
        <p className="reconfig-waiting-text">⏳ Le host reconfigure la partie...</p>
      </div>
    )
  }

  return (
    <form className="reconfig" onSubmit={handleSubmit}>
      <h2 className="reconfig-title">⚙️ Reconfigurer la partie</h2>
      <p className="reconfig-subtitle">Les joueurs connectés sont conservés.</p>

      <div className="rc-games">
        <h3 className="rc-games-title">Jeux ({games.length})</h3>
        {games.map((game, i) => {
          const meta = GAME_META[game.type]
          return (
            <div key={i} className="rc-game">
              <div className="rc-game-header">
                <span className="rc-game-label">{meta.icon} {meta.label}</span>
                <div className="rc-game-actions">
                  <button type="button" onClick={() => moveUp(i)} disabled={i === 0} aria-label="Monter">↑</button>
                  <button type="button" onClick={() => moveDown(i)} disabled={i === games.length - 1} aria-label="Descendre">↓</button>
                  <button type="button" onClick={() => removeGame(i)} disabled={games.length === 1} aria-label="Supprimer">✕</button>
                </div>
              </div>
              <GameSettings game={game} onChange={updated => updateGame(i, updated)} />
            </div>
          )
        })}

        {availableToAdd.length > 0 && (
          <div className="rc-add-games">
            <span className="rc-add-label">Ajouter un jeu :</span>
            {availableToAdd.map(type => {
              const meta = GAME_META[type]
              return (
                <button key={type} type="button" className="rc-add-btn" onClick={() => addGame(type)}>
                  + {meta.icon} {meta.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="reconfig-submit"
        disabled={games.length === 0 || submitting}
      >
        {submitting ? 'Application...' : '✓ Lancer avec cette config'}
      </button>
    </form>
  )
}

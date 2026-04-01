// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import './scoreboard.css'

const DIFFICULTY_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const MEDAL = ['🥇', '🥈', '🥉']
const ACTIVE_GAMES = [
  { id: 'country', label: 'Trouve le Pays' },
]

export const sortScores = (scores) =>
  [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const tA = a.elapsedTime ?? Infinity
    const tB = b.elapsedTime ?? Infinity
    return tA - tB
  })

export const filterByGame = (scores, game) => {
  if (!game || game === 'AllGames') return scores
  return scores.filter(s => (s.gameId ?? 'country') === game)
}

export default function Scoreboard({ defaultGame = 'country' }) {
  const [allScores, setAllScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedDifficulty, setSelectedDifficulty] = useState('AllScores')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'scores'))
        setAllScores(snap.docs.map(d => d.data()))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [])

  const scores = sortScores(
    filterByGame(allScores, selectedGame).filter(
      s => selectedDifficulty === 'AllScores' || s.difficulty === selectedDifficulty
    )
  )

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <div className="scoreboard-filters">
        <select
          className="scoreboard-select"
          value={selectedGame}
          onChange={e => setSelectedGame(e.target.value)}
        >
          {ACTIVE_GAMES.map(g => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
          <option value="AllGames">Tous les jeux</option>
        </select>

        <select
          className="scoreboard-select"
          value={selectedDifficulty}
          onChange={e => setSelectedDifficulty(e.target.value)}
        >
          {DIFFICULTY_ORDER.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
          <option value="AllScores">Toutes les difficultés</option>
        </select>
      </div>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">Aucun score pour cette difficulté.</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header">
            <span>#</span>
            <span>Joueur</span>
            <span>Score</span>
            <span>Temps</span>
            <span>Difficulté</span>
          </div>
          {scores.map((s, index) => (
            <div
              key={index}
              className={`scoreboard-row ${index < 3 ? 'scoreboard-row--top' : ''}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name">{s.name}</span>
              <span className="scoreboard-score">{s.score} pts</span>
              <span className="scoreboard-time">
                {s.elapsedTime != null ? formatTime(s.elapsedTime) : '—'}
              </span>
              <span className="scoreboard-difficulty">{s.difficulty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

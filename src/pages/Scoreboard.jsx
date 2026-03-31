// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import './scoreboard.css'

const DIFFICULTY_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const MEDAL = ['🥇', '🥈', '🥉']

const sortScores = (scores) =>
  [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const tA = a.elapsedTime ?? Infinity
    const tB = b.elapsedTime ?? Infinity
    return tA - tB
  })

export default function Scoreboard() {
  const [allScores, setAllScores] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'scores'))
        const list = sortScores(snap.docs.map(d => d.data()))
        setAllScores(list)
        setScores(list)
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [])

  const changeDifficultyDisplayed = (difficulty) => {
    if (difficulty === 'AllScores') {
      setScores([...allScores])
      return
    }
    setScores(sortScores(allScores.filter(s => s.difficulty === difficulty)))
  }

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <select
        className="scoreboard-select"
        onChange={e => changeDifficultyDisplayed(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>Filtrer par difficulté</option>
        {DIFFICULTY_ORDER.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
        <option value="AllScores">Tous les scores</option>
      </select>

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

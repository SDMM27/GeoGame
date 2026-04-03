// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import { GAME_TYPES } from '../utils/gameTypes'
import './scoreboard.css'

const DIFFICULTY_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const MEDAL = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']
const LEGACY_GAME_ID_MAP = { country: GAME_TYPES.PLACEMENT, flags: GAME_TYPES.FLAGS }
const ACTIVE_GAMES = [
  { id: GAME_TYPES.PLACEMENT, label: 'Trouve le Pays' },
  { id: GAME_TYPES.FLAGS, label: 'Trouve le Drapeau' },
  { id: GAME_TYPES.CAPITALS, label: 'Trouve la Capitale' },
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
  return scores.filter((score) => {
    const type = score.gameType ?? LEGACY_GAME_ID_MAP[score.gameId ?? 'country'] ?? score.gameId
    return type === game
  })
}

export default function Scoreboard({ defaultGame = GAME_TYPES.PLACEMENT }) {
  const [allScores, setAllScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedDifficulty, setSelectedDifficulty] = useState('AllScores')
  const [loading, setLoading] = useState(true)
  const [isLegacy, setIsLegacy] = useState(false)

  useEffect(() => {
    setSelectedGame(defaultGame)
  }, [defaultGame])

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const collectionName = isLegacy ? 'scores_v1' : 'scores'
        const snapshot = await getDocs(collection(firestore, collectionName))
        setAllScores(snapshot.docs.map((doc) => doc.data()))
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [isLegacy])

  const scores = sortScores(
    filterByGame(allScores, selectedGame).filter(
      (score) => selectedDifficulty === 'AllScores' || score.difficulty === selectedDifficulty
    )
  )

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <div className="scoreboard-era-tabs">
        <button
          className={`scoreboard-era-tab ${!isLegacy ? 'scoreboard-era-tab--active' : ''}`}
          onClick={() => setIsLegacy(false)}
        >
          Classement actuel <br />(nouvelles difficultés)
        </button>
        <button
          className={`scoreboard-era-tab ${isLegacy ? 'scoreboard-era-tab--active' : ''}`}
          onClick={() => setIsLegacy(true)}
        >
          Ancien classement
        </button>
      </div>

      <div className="scoreboard-filters">
        <select
          className="scoreboard-select"
          value={selectedGame}
          onChange={(event) => setSelectedGame(event.target.value)}
        >
          {ACTIVE_GAMES.map((game) => (
            <option key={game.id} value={game.id}>{game.label}</option>
          ))}
          <option value="AllGames">Tous les jeux</option>
        </select>

        <select
          className="scoreboard-select"
          value={selectedDifficulty}
          onChange={(event) => setSelectedDifficulty(event.target.value)}
        >
          {DIFFICULTY_ORDER.map((difficulty) => (
            <option key={difficulty} value={difficulty}>{difficulty}</option>
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
          {scores.map((score, index) => (
            <div
              key={index}
              className={`scoreboard-row ${index < 3 ? 'scoreboard-row--top' : ''}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name">{score.name}</span>
              <span className="scoreboard-score">{score.score} pts</span>
              <span className="scoreboard-time">
                {score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}
              </span>
              <span className="scoreboard-difficulty">{score.difficulty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

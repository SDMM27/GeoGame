// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import { GAME_TYPES } from '../utils/gameTypes'
import { CONTINENTS } from '../utils/continents'
import './scoreboard.css'

const DIFFICULTY_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const CONTINENT_NAMES = new Set(['Europe', 'Asie', 'Afrique', 'Amériques', 'Océanie'])
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

export default function Scoreboard({ defaultGame = GAME_TYPES.PLACEMENT, continentMode = false }) {
  const { t } = useTranslation()
  const [allScores, setAllScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedDifficulty, setSelectedDifficulty] = useState('AllScores')
  const [selectedContinent, setSelectedContinent] = useState('AllContinents')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSelectedGame(defaultGame)
  }, [defaultGame])

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(collection(firestore, 'scores'))
        setAllScores(snapshot.docs.map((doc) => doc.data()))
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  const isContinentScore = (score) =>
    score.continent != null || CONTINENT_NAMES.has(score.difficulty)

  const scores = sortScores(
    filterByGame(allScores, selectedGame).filter((score) => {
      if (continentMode) {
        if (!isContinentScore(score)) return false
        if (selectedContinent !== 'AllContinents' && score.continent !== selectedContinent && score.difficulty !== selectedContinent) return false
      } else {
        if (isContinentScore(score)) return false
        if (selectedDifficulty !== 'AllScores' && score.difficulty !== selectedDifficulty) return false
      }
      return true
    })
  )

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">{t('scoreboard.title')}</h1>

      <div className="scoreboard-filters">
        <select
          className="scoreboard-select"
          value={selectedGame}
          onChange={(event) => setSelectedGame(event.target.value)}
        >
          {ACTIVE_GAMES.map((game) => (
            <option key={game.id} value={game.id}>{game.label}</option>
          ))}
          <option value="AllGames">{t('options.all_games')}</option>
        </select>

        {continentMode ? (
          <select
            className="scoreboard-select"
            value={selectedContinent}
            onChange={(event) => setSelectedContinent(event.target.value)}
          >
            {CONTINENTS.map(({ name }) => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value="AllContinents">{t('options.all_continents')}</option>
          </select>
        ) : (
          <select
            className="scoreboard-select"
            value={selectedDifficulty}
            onChange={(event) => setSelectedDifficulty(event.target.value)}
          >
            {DIFFICULTY_ORDER.map((difficulty) => (
              <option key={difficulty} value={difficulty}>{difficulty}</option>
            ))}
            <option value="AllScores">{t('options.all_scores')}</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="scoreboard-loading">{t('messages.loading')}</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">{t('scoreboard.no_ascension_scores')}</p>
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
              <span className="scoreboard-difficulty">
                {score.continent ? `${score.difficulty} · ${score.continent}` : score.difficulty}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

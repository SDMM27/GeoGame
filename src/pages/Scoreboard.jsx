// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSoloScores } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { useAccount } from '../auth'
import PlayerName, { mineClass } from '../components/PlayerName'
import { GAME_TYPES } from '../utils/gameTypes'
import { CONTINENTS } from '../utils/continents'
import { ALL_CONTINENTS, ALL_DIFFICULTIES, DIFFICULTIES } from '../utils/leaderboards'
import './scoreboard.css'

const MEDAL = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']
const ACTIVE_GAMES = [
  { id: GAME_TYPES.PLACEMENT, label: 'Trouve le Pays' },
  { id: GAME_TYPES.FLAGS, label: 'Trouve le Drapeau' },
  { id: GAME_TYPES.CAPITALS, label: 'Trouve la Capitale' },
]

export default function Scoreboard({ defaultGame = GAME_TYPES.PLACEMENT, continentMode = false }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const [scores, setScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedDifficulty, setSelectedDifficulty] = useState(ALL_DIFFICULTIES)
  const [selectedContinent, setSelectedContinent] = useState(ALL_CONTINENTS)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSelectedGame(defaultGame)
  }, [defaultGame])

  // The best 100 scores of the selected filters, fetched again whenever they change.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchSoloScores({ game: selectedGame, continentMode, difficulty: selectedDifficulty, continent: selectedContinent })
      .then((result) => {
        if (!cancelled) setScores(result)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setScores([])
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedGame, continentMode, selectedDifficulty, selectedContinent])

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
            <option value={ALL_CONTINENTS}>{t('options.all_continents')}</option>
          </select>
        ) : (
          <select
            className="scoreboard-select"
            value={selectedDifficulty}
            onChange={(event) => setSelectedDifficulty(event.target.value)}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>{difficulty}</option>
            ))}
            <option value={ALL_DIFFICULTIES}>{t('options.all_scores')}</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="scoreboard-loading">{t('messages.loading')}</p>
      ) : failed ? (
        <p className="scoreboard-empty">{t('messages.page_load_error')}</p>
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
              className={`scoreboard-row ${index < 3 ? 'scoreboard-row--top' : ''}${mineClass(score, account)}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name"><PlayerName entry={score} account={account} /></span>
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

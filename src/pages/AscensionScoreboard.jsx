import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAscensionScores } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { useAccount } from '../auth'
import PlayerName, { mineClass } from '../components/PlayerName'
import { GAME_TYPES } from '../utils/gameTypes'
import { ASCENSION_PRESETS } from '../utils/ascensionPresets'
import { ALL_PRESETS } from '../utils/leaderboards'

const MEDAL = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49']
const ACTIVE_GAMES = [
  { id: GAME_TYPES.PLACEMENT, label: 'Trouve le Pays' },
  { id: GAME_TYPES.FLAGS, label: 'Trouve le Drapeau' },
  { id: GAME_TYPES.CAPITALS, label: 'Trouve la Capitale' },
]

export default function AscensionScoreboard({ defaultGame = GAME_TYPES.PLACEMENT }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const [scores, setScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedPreset, setSelectedPreset] = useState(ALL_PRESETS)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSelectedGame(defaultGame)
  }, [defaultGame])

  // The 100 fastest scores of the selected filters, fetched again whenever they change.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFailed(false)
    fetchAscensionScores({ game: selectedGame, preset: selectedPreset })
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
  }, [selectedGame, selectedPreset])

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores Ascension</h1>

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
          value={selectedPreset}
          onChange={(event) => setSelectedPreset(event.target.value)}
        >
          {ASCENSION_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>{preset.icon} {preset.name}</option>
          ))}
          <option value={ALL_PRESETS}>Tous les presets</option>
        </select>
      </div>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
      ) : failed ? (
        <p className="scoreboard-empty">{t('messages.page_load_error')}</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">Aucun score Ascension pour ce filtre.</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header scoreboard-header--ascension">
            <span>#</span>
            <span>Joueur</span>
            <span>Temps</span>
            <span>Score</span>
            <span>Preset</span>
          </div>
          {scores.map((score, index) => (
            <div
              key={`${score.name}-${score.presetName}-${index}`}
              className={`scoreboard-row scoreboard-row--ascension ${index < 3 ? 'scoreboard-row--top' : ''}${mineClass(score, account)}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name"><PlayerName entry={score} account={account} reportIn="ascension_scores" /></span>
              <span className="scoreboard-time scoreboard-time--strong">
                {score.globalTimeMs != null ? formatTime(score.globalTimeMs) : '—'}
              </span>
              <span className="scoreboard-score">{score.globalScore ?? 0} pts</span>
              <span className="scoreboard-preset">{score.presetName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

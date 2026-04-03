import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import { GAME_TYPES } from '../utils/gameTypes'
import { ASCENSION_PRESETS } from '../utils/ascensionPresets'

const MEDAL = ['🥇', '🥈', '🥉']
const ACTIVE_GAMES = [
  { id: GAME_TYPES.PLACEMENT, label: 'Trouve le Pays' },
  { id: GAME_TYPES.FLAGS, label: 'Trouve le Drapeau' },
  { id: GAME_TYPES.CAPITALS, label: 'Trouve la Capitale' },
]

export function sortAscensionScores(scores) {
  return [...scores].sort((a, b) => {
    if ((a.globalTimeMs ?? Infinity) !== (b.globalTimeMs ?? Infinity)) {
      return (a.globalTimeMs ?? Infinity) - (b.globalTimeMs ?? Infinity)
    }
    return (b.globalScore ?? 0) - (a.globalScore ?? 0)
  })
}

export default function AscensionScoreboard({ defaultGame = GAME_TYPES.PLACEMENT }) {
  const [allScores, setAllScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedPreset, setSelectedPreset] = useState('AllPresets')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSelectedGame(defaultGame)
  }, [defaultGame])

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snap = await getDocs(collection(firestore, 'ascension_scores'))
        setAllScores(snap.docs.map(d => d.data()))
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  const scores = useMemo(() => {
    const filtered = allScores.filter((score) => {
      const matchesGame = selectedGame === 'AllGames' || score.gameType === selectedGame
      const matchesPreset = selectedPreset === 'AllPresets' || score.presetName === selectedPreset
      return matchesGame && matchesPreset
    })
    return sortAscensionScores(filtered)
  }, [allScores, selectedGame, selectedPreset])

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores Ascension</h1>

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
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
        >
          {ASCENSION_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>{preset.icon} {preset.name}</option>
          ))}
          <option value="AllPresets">Tous les presets</option>
        </select>
      </div>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
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
              className={`scoreboard-row scoreboard-row--ascension ${index < 3 ? 'scoreboard-row--top' : ''}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name">{score.name}</span>
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

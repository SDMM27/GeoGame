// src/pages/RankingLeaderboard.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { GAME_TYPES } from '../utils/gameTypes'
import { sortRankingScores } from '../utils/rankingScores'
import './DailyLeaderboard.css'
import './RankingLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function getLast7Days(todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number)
  const baseDate = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const label =
      i === 0 ? "Aujourd'hui" :
      i === 1 ? 'Hier' :
      date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return { key, label }
  })
}

export default function RankingLeaderboard({ dailyKey }) {
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey) : []), [dailyKey])

  if (!dailyKey) return null

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'daily_scores'),
            where('gameType', '==', GAME_TYPES.RANKING),
            where('dailyKey', '==', selectedDate)
          )
        )
        setScores(sortRankingScores(snapshot.docs.map((doc) => doc.data())))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [selectedDate])

  return (
    <div className="daily-lb ranking-lb">
      <h2 className="daily-lb__title">Classement journalier</h2>

      <div className="daily-lb__date-nav">
        {days.map(({ key, label }) => (
          <button
            key={key}
            className={`daily-lb__day-btn${selectedDate === key ? ' daily-lb__day-btn--active' : ''}`}
            onClick={() => { setSelectedDate(key); setShowPicker(false) }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="daily-lb__history-toggle">
        <button
          className="daily-lb__history-link"
          onClick={() => setShowPicker((prev) => !prev)}
        >
          {showPicker ? "Masquer l'historique" : "Voir tout l'historique"}
        </button>
        {showPicker && (
          <input
            type="date"
            className="daily-lb__date-picker"
            value={selectedDate}
            max={dailyKey}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <p className="daily-lb__loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="daily-lb__empty">Aucun score pour ce jour.</p>
      ) : (
        <>
          <div className="daily-lb__header">
            <span>#</span>
            <span>Joueur</span>
            <span style={{ textAlign: 'right' }}>Score</span>
            <span style={{ textAlign: 'right' }}>Erreur</span>
          </div>
          {scores.map((score, index) => (
            <div
              key={`${score.name}-${score.dailyKey}-${index}`}
              className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}`}
            >
              <div className="daily-lb__row-main">
                <span className="daily-lb__rank">
                  {index < 3 ? MEDAL[index] : `#${index + 1}`}
                </span>
                <span className="daily-lb__name">{score.name}</span>
                <span className="ranking-lb__score">{score.score} pts</span>
                <span className="ranking-lb__error">{score.totalError} pos.</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

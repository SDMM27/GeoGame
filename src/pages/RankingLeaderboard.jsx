// src/pages/RankingLeaderboard.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { GAME_TYPES } from '../utils/gameTypes'
import { sortRankingScores } from '../utils/rankingScores'
import { getLast7Days } from '../utils/dateUtils'
import './DailyLeaderboard.css'
import './RankingLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function AccordionRow({ score, index, playerName }) {
  const [open, setOpen] = useState(false)
  const isSelf = score.name === playerName

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}${isSelf ? ' ranking-lb__row--self' : ''}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">
          {index < 3 ? MEDAL[index] : `#${index + 1}`}
        </span>
        <span className="daily-lb__name">
          {score.name}
          {isSelf && <span className="ranking-lb__self-badge">vous</span>}
        </span>
        <span className="ranking-lb__score">{score.score} pts</span>
        <span className="ranking-lb__error">{score.totalError} pos.</span>
        <span className="ranking-lb__attempts">
          {score.attemptsUsed != null
            ? `${score.attemptsUsed} essai${score.attemptsUsed !== 1 ? 's' : ''}`
            : '—'}
        </span>
      </div>
      {open && Array.isArray(score.playerOrder) && score.playerOrder.length > 0 && (
        <div className="daily-lb__accordion">
          <p className="daily-lb__accordion-title">Classement joué</p>
          <ol className="daily-lb__guess-list">
            {score.playerOrder.map((country, i) => (
              <li key={`${country}-${i}`} className="daily-lb__guess-item">
                {i + 1}. {country}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function RankingLeaderboard({ dailyKey, playerName = null }) {
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey) : []), [dailyKey])

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

  if (!dailyKey) return null

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
            <span className="ranking-lb__score">Score</span>
            <span className="ranking-lb__error">Erreur</span>
            <span className="ranking-lb__attempts">Essais</span>
          </div>
          {scores.map((score, index) => (
            <AccordionRow
              key={`${score.name}-${score.dailyKey}-${index}`}
              score={score}
              index={index}
              playerName={playerName}
            />
          ))}
        </>
      )}
    </div>
  )
}

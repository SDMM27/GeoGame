import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { sortDailyScores } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

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

function AccordionRow({ score, index }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
        <span className="daily-lb__name">{score.name}</span>
        <span className="daily-lb__attempts">{score.attempts} essai{score.attempts > 1 ? 's' : ''}</span>
        <span className="daily-lb__time">{score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}</span>
      </div>
      {open && Array.isArray(score.guesses) && score.guesses.length > 0 && (
        <div className="daily-lb__accordion">
          <p className="daily-lb__accordion-title">Pays tentés</p>
          <ol className="daily-lb__guess-list">
            {score.guesses.map((country, i) => (
              <li
                key={`${country}-${i}`}
                className={`daily-lb__guess-item${i === score.guesses.length - 1 ? ' daily-lb__guess-item--correct' : ''}`}
              >
                {i + 1}. {country}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function DailyLeaderboard({ gameType, dailyKey }) {
  if (!dailyKey) return null

  const [selectedDate, setSelectedDate] = useState(dailyKey)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => getLast7Days(dailyKey), [dailyKey])

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'daily_scores'),
            where('gameType', '==', gameType),
            where('dailyKey', '==', selectedDate)
          )
        )
        setScores(sortDailyScores(snapshot.docs.map((doc) => doc.data())))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [gameType, selectedDate])

  return (
    <div className="daily-lb">
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
            <span>Essais</span>
            <span>Temps</span>
          </div>
          {scores.map((score, index) => (
            <AccordionRow key={`${score.name}-${score.dailyKey}-${index}`} score={score} index={index} />
          ))}
        </>
      )}
    </div>
  )
}

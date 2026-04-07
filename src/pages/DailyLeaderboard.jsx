import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { sortDailyScores } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

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

export default function DailyLeaderboard({ gameType }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(
          query(collection(firestore, 'daily_scores'), where('gameType', '==', gameType))
        )
        setScores(sortDailyScores(snapshot.docs.map((doc) => doc.data())))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [gameType])

  return (
    <div className="daily-lb">
      <h2 className="daily-lb__title">Classement journalier</h2>

      {loading ? (
        <p className="daily-lb__loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="daily-lb__empty">Aucun score pour l'instant.</p>
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

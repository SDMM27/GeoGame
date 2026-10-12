// src/pages/RankingLeaderboard.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { GAME_TYPES } from '../utils/gameTypes'
import { sortRankingScores } from '../utils/rankingScores'
import { getLast7Days } from '../utils/dateUtils'
import { useAccount } from '../auth'
import { useLeaderboardRefresh } from '../hooks/useLeaderboardRefresh'
import PlayerName, { mineClass } from '../components/PlayerName'
import './DailyLeaderboard.css'
import './RankingLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function AccordionRow({ score, index, account }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}${mineClass(score, account)}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">
          {index < 3 ? MEDAL[index] : `#${index + 1}`}
        </span>
        <span className="daily-lb__name">
          <PlayerName entry={score} account={account} reportIn="daily_scores" />
        </span>
        <span className="ranking-lb__score">{score.score} {t('units.pts')}</span>
        <span className="ranking-lb__error">{score.totalError} {t('units.position', { count: score.totalError })}</span>
        <span className="ranking-lb__attempts">
          {score.attemptsUsed != null ? t('quiz.attempts_count', { count: score.attemptsUsed }) : '—'}
        </span>
      </div>
      {open && Array.isArray(score.playerOrder) && score.playerOrder.length > 0 && (
        <div className="daily-lb__accordion">
          <p className="daily-lb__accordion-title">{t('leaderboard.played_order')}</p>
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

export default function RankingLeaderboard({ dailyKey }) {
  const { t, i18n } = useTranslation()
  const { account } = useAccount()
  const refreshKey = useLeaderboardRefresh()
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey, i18n.language) : []), [dailyKey, i18n.language])

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
  }, [selectedDate, refreshKey])

  if (!dailyKey) return null

  return (
    <div className="daily-lb ranking-lb">
      <h2 className="daily-lb__title">{t('leaderboard.title')}</h2>

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
          {showPicker ? t('buttons.hide_history') : t('buttons.show_full_history')}
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
        <p className="daily-lb__loading">{t('messages.loading')}</p>
      ) : scores.length === 0 ? (
        <p className="daily-lb__empty">{t('leaderboard.no_scores_today')}</p>
      ) : (
        <>
          <div className="daily-lb__header">
            <span>#</span>
            <span>{t('labels.player')}</span>
            <span className="ranking-lb__score">{t('profile.details.score')}</span>
            <span className="ranking-lb__error">{t('profile.details.total_error')}</span>
            <span className="ranking-lb__attempts">{t('labels.attempts')}</span>
          </div>
          {scores.map((score, index) => (
            <AccordionRow
              key={`${score.name}-${score.dailyKey}-${index}`}
              score={score}
              index={index}
              account={account}
            />
          ))}
        </>
      )}
    </div>
  )
}

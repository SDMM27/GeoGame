// src/pages/ChallengeLeaderboard.jsx
// Daily Challenge leaderboard: right answers out of 12, then the shortest time; a row opens on the player's 12 rounds.
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchChallengeScores } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { getLast7Days } from '../utils/dateUtils'
import { CHALLENGE_ROUNDS, challengeShareGrid } from '../utils/dailyChallenge'
import { challengeRounds } from '../utils/dailyChallengeRounds'
import { useAccount } from '../auth'
import { useLeaderboardRefresh } from '../hooks/useLeaderboardRefresh'
import PlayerName, { mineClass } from '../components/PlayerName'
import './DailyLeaderboard.css'
import './ChallengeLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function ChallengeRow({ score, index, account, rounds }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const grid = useMemo(
    () => (Array.isArray(score.results) && score.results.length === rounds.length
      ? challengeShareGrid(rounds, score.results.map((right) => (right ? 'correct' : 'failed')))
      : null),
    [score.results, rounds]
  )

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}${mineClass(score, account)}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
        <span className="daily-lb__name"><PlayerName entry={score} account={account} reportIn="daily_scores" /></span>
        <span className="daily-lb__attempts">{score.score}/{CHALLENGE_ROUNDS}</span>
        <span className="daily-lb__time">{score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}</span>
      </div>
      {open && grid && (
        <div className="daily-lb__accordion">
          <p className="daily-lb__accordion-title">{t('daily_challenge.rounds_title')}</p>
          <p className="challenge-lb__grid">{grid}</p>
        </div>
      )}
    </div>
  )
}

export default function ChallengeLeaderboard({ dailyKey }) {
  const { t, i18n } = useTranslation()
  const { account } = useAccount()
  const refreshKey = useLeaderboardRefresh()
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey, i18n.language) : []), [dailyKey, i18n.language])
  // The kinds of round of the day shown, for the grids
  const rounds = useMemo(() => (selectedDate ? challengeRounds(selectedDate) : []), [selectedDate])

  useEffect(() => {
    if (!selectedDate) return
    const fetchScores = async () => {
      setLoading(true)
      try {
        setScores(await fetchChallengeScores(selectedDate))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [selectedDate, refreshKey])

  if (!dailyKey) return null

  return (
    <div className="daily-lb">
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
        <button className="daily-lb__history-link" onClick={() => setShowPicker((prev) => !prev)}>
          {showPicker ? t('buttons.hide_history') : t('buttons.show_full_history')}
        </button>
        {showPicker && (
          <input
            type="date"
            className="daily-lb__date-picker"
            value={selectedDate}
            max={dailyKey}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
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
            <span>{t('daily_challenge.col_score')}</span>
            <span>{t('leaderboard.time')}</span>
          </div>
          {scores.map((score, index) => (
            <ChallengeRow key={score.id ?? `${score.name}-${index}`} score={score} index={index} account={account} rounds={rounds} />
          ))}
        </>
      )}
    </div>
  )
}

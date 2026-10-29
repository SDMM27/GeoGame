// Country of the Day leaderboard: points, then the shortest time; a row opens on the player's 4 steps.
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCountryOfDayScores } from '../../utils/saveScore'
import { formatTime } from '../../utils/formatTime'
import { getLast7Days } from '../../utils/dateUtils'
import { COUNTRY_OF_DAY_STEPS, countryOfDayShareLine } from '../../utils/countryOfDay'
import { useAccount } from '../../auth'
import { useLeaderboardRefresh } from '../../hooks/useLeaderboardRefresh'
import PlayerName, { mineClass } from '../PlayerName'
import '../../pages/DailyLeaderboard.css'
import '../../pages/ChallengeLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function Row({ score, index, account }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const valid = Array.isArray(score.steps) && score.steps.length === COUNTRY_OF_DAY_STEPS.length

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}${mineClass(score, account)}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
        <span className="daily-lb__name"><PlayerName entry={score} account={account} reportIn="daily_scores" /></span>
        <span className="daily-lb__attempts">{score.score}</span>
        <span className="daily-lb__time">{score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}</span>
      </div>
      {open && valid && (
        <div className="daily-lb__accordion">
          <p className="daily-lb__accordion-title">
            {t('country_of_day.mode_played', { mode: t(`country_of_day.mode_${score.mode === 'free' ? 'free' : 'choice'}`) })}
          </p>
          <p className="challenge-lb__grid">{countryOfDayShareLine(score.steps)}</p>
        </div>
      )}
    </div>
  )
}

export default function CountryOfDayLeaderboard({ dailyKey }) {
  const { t, i18n } = useTranslation()
  const { account } = useAccount()
  const refreshKey = useLeaderboardRefresh()
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey, i18n.language) : []), [dailyKey, i18n.language])

  useEffect(() => {
    if (!selectedDate) return
    const fetchScores = async () => {
      setLoading(true)
      try {
        setScores(await fetchCountryOfDayScores(selectedDate))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [selectedDate, refreshKey])

  if (!dailyKey) return null

  return (
    <div className="daily-lb">
      <h2 className="daily-lb__title">{t('country_of_day.leaderboard')}</h2>

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
            <Row key={score.id ?? `${score.name}-${index}`} score={score} index={index} account={account} />
          ))}
        </>
      )}
    </div>
  )
}

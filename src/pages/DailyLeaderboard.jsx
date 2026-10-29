import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchDailyScores } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { getLast7Days } from '../utils/dateUtils'
import { useAccount } from '../auth'
import { useLeaderboardRefresh } from '../hooks/useLeaderboardRefresh'
import PlayerName, { mineClass } from '../components/PlayerName'
import './DailyLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function AccordionRow({ score, index, account, secondaryFormatter, guessesTitle }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}${mineClass(score, account)}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
        <span className="daily-lb__name"><PlayerName entry={score} account={account} reportIn="daily_scores" />{score.mapAssist === true && <> <span title={t('map_assist.leaderboard_used')}>🗺️</span></>}</span>
        <span className="daily-lb__attempts">
          {score.hints > 0
            ? <>{score.attempts + score.hints} <span className="daily-lb__attempts-detail">({score.attempts}+{score.hints})</span></>
            : score.attempts
          }
        </span>
        <span className="daily-lb__time">{score.elapsedTime != null ? (secondaryFormatter ?? formatTime)(score.elapsedTime) : '—'}</span>
      </div>
      {open && (
        <div className="daily-lb__accordion">
          {score.mapAssist === true && (
            <p className="daily-lb__accordion-hints">🗺️ {t('map_assist.leaderboard_used')}</p>
          )}
          {score.hints != null && (
            <p className="daily-lb__accordion-hints">
              {t('leaderboard.hints_used')} <strong>{score.hints === 0 ? t('leaderboard.no_hints') : `${score.hints}`}</strong>
            </p>
          )}
          {Array.isArray(score.guesses) && score.guesses.length > 0 && (
            <>
              <p className="daily-lb__accordion-title">{guessesTitle ?? t('leaderboard.attempted_countries')}</p>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function DailyLeaderboard({ gameType, dailyKey, columnLabels, secondaryFormatter, guessesTitle }) {
  const { t, i18n } = useTranslation()
  const { account } = useAccount()
  const refreshKey = useLeaderboardRefresh()
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey, i18n.language) : []), [dailyKey, i18n.language])

  // Only the answer to the latest request is shown: a slow one for a day picked earlier is dropped.
  useEffect(() => {
    if (!dailyKey) return undefined
    let cancelled = false
    setLoading(true)
    fetchDailyScores(gameType, selectedDate)
      .then((result) => {
        if (!cancelled) setScores(result)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setScores([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dailyKey, gameType, selectedDate, refreshKey])

  if (!dailyKey) return null

  // The scores come sorted with the map-assisted ones last: the separator goes before the first of them.
  const firstAssistedIndex = scores.findIndex((score) => score.mapAssist === true)

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
            <span>{columnLabels?.attempts ?? t('leaderboard.attempts')}</span>
            <span>{columnLabels?.secondary ?? t('leaderboard.time')}</span>
          </div>
          {scores.map((score, index) => (
            <React.Fragment key={`${score.name}-${score.dailyKey}-${index}`}>
              {score.mapAssist === true && index === firstAssistedIndex && (
                <div className="daily-lb__tier">{t('map_assist.leaderboard_tier')}</div>
              )}
              <AccordionRow score={score} index={index} account={account} secondaryFormatter={secondaryFormatter} guessesTitle={guessesTitle} />
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import NavBar from './NavBar'
import { describeResult } from '../utils/profileFormat'
import { formatTime } from '../utils/formatTime'
import '../pages/DailyLeaderboard.css'
import './DailyPlayedElsewhere.css'

// A daily challenge the signed-in player already finished on another device (useDailyPlayedElsewhere):
// their result and the day's leaderboard (children) in place of a new game.
// Without `game`, the lookup is still running.
export function DailyPlayedElsewhereCard({ game, children }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  if (!game) return <p className="daily-elsewhere__checking">{t('daily_elsewhere.checking')}</p>

  const result = [describeResult(game, t), game.elapsedTime != null ? formatTime(game.elapsedTime) : null].filter(Boolean).join(' · ')
  return (
    <>
      <section className="daily-form">
        <h2 className="daily-form__title">{t('daily_elsewhere.title')}</h2>
        <p className="daily-form__stat">{t('daily_elsewhere.text')}</p>
        <p className="daily-elsewhere__result">
          {t('daily_elsewhere.your_result')} <strong className={game.solved === false ? 'failed' : ''}>{result}</strong>
        </p>
        <p className="daily-form__stat">{t('daily_elsewhere.come_back')}</p>
        <button className="daily-elsewhere__home" onClick={() => navigate('/')}>
          {t('buttons.return_home')}
        </button>
      </section>
      {children}
    </>
  )
}

// The whole page, for the games whose page is the daily challenge.
export default function DailyPlayedElsewhere({ title, game, children }) {
  return (
    <div className="daily-elsewhere-page">
      <NavBar />
      <main className="daily-elsewhere">
        <h1 className="daily-elsewhere__title">{title}</h1>
        <DailyPlayedElsewhereCard game={game}>{children}</DailyPlayedElsewhereCard>
      </main>
    </div>
  )
}

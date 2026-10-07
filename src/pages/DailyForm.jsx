import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveDailyScore } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { useAccount } from '../auth'
import { useScoreSave } from '../hooks/useScoreSave'
import LeaderboardSave from '../components/LeaderboardSave'
import './DailyLeaderboard.css'

export default function DailyForm({ attempts, elapsedTime, guesses, gameType, dailyKey, statText, hints }) {
  const { t } = useTranslation()
  const savedKey = `daily-saved:${gameType}:${dailyKey}`
  const saver = useScoreSave(
    useAccount(),
    async (player) => {
      const result = await saveDailyScore({ ...player, gameType, dailyKey, attempts, elapsedTime, guesses, hints })
      if (result.status === 'saved' || result.status === 'updated') localStorage.setItem(savedKey, '1')
      return result
    },
    { alreadySaved: !!localStorage.getItem(savedKey) }
  )
  const attemptsText = (count) => `${count} ${count === 1 ? t('units.attempt_one') : t('units.attempt_other')}`

  return (
    <div className="daily-form">
      <h2 className="daily-form__title">{t('form.title')}</h2>
      <p className="daily-form__stat">{statText ?? `${attemptsText(attempts)} — ${elapsedTime != null ? formatTime(elapsedTime) : '—'}`}</p>

      <LeaderboardSave
        saver={saver}
        variant="daily"
        existingText={(existing) => `${attemptsText(existing.attempts)} — ${formatTime(existing.elapsedTime)}`}
        blockedLabel={t('form.better_daily_score')}
        blockedHint={t('form.use_different_name_daily')}
      />
    </div>
  )
}

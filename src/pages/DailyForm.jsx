import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveDailyScore } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { useAccount } from '../auth'
import { useScoreSave } from '../hooks/useScoreSave'
import LeaderboardSave from '../components/LeaderboardSave'
import EndStamp from '../components/EndStamp'
import './DailyLeaderboard.css'
import './form.css'

export default function DailyForm({ attempts, elapsedTime, guesses, gameType, dailyKey, statText, hints, mapAssist }) {
  const { t } = useTranslation()
  const savedKey = `daily-saved:${gameType}:${dailyKey}`
  const saver = useScoreSave(
    useAccount(),
    async (player) => {
      const result = await saveDailyScore({ ...player, gameType, dailyKey, attempts, elapsedTime, guesses, hints, mapAssist })
      if (result.status === 'saved' || result.status === 'updated') localStorage.setItem(savedKey, '1')
      return result
    },
    { alreadySaved: !!localStorage.getItem(savedKey) }
  )
  const attemptsText = (count) => `${count} ${count === 1 ? t('units.attempt_one') : t('units.attempt_other')}`

  return (
    <div className="daily-form gg-ticket form-ticket daily-form--ticket">
      <div className="form-ticket__main">
        <EndStamp />
        <p className="gg-kicker">{t('carnet_games.kicker_end')}</p>
        <h2 className="daily-form__title">{t('form.title')}</h2>

        <LeaderboardSave
          saver={saver}
          variant="daily"
          existingText={(existing) => `${attemptsText(existing.attempts)} — ${formatTime(existing.elapsedTime)}`}
          blockedLabel={t('form.better_daily_score')}
          blockedHint={t('form.use_different_name_daily')}
        />
      </div>
      <div className="gg-ticket-stub form-ticket__stub">
        {statText ? (
          <span className="gg-field"><strong>{statText}</strong></span>
        ) : (
          <>
            <span className="gg-field"><small>{t('labels.attempts')}</small><strong>{attemptsText(attempts)}</strong></span>
            <span className="gg-field"><small>{t('game_hud.time')}</small><strong>{elapsedTime != null ? formatTime(elapsedTime) : '—'}</strong></span>
          </>
        )}
      </div>
    </div>
  )
}

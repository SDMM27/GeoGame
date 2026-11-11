import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveCountryOfDayScore } from '../../utils/saveScore'
import { formatTime } from '../../utils/formatTime'
import { GAME_TYPES } from '../../utils/gameTypes'
import { useAccount } from '../../auth'
import { useScoreSave } from '../../hooks/useScoreSave'
import LeaderboardSave from '../LeaderboardSave'
import '../../pages/DailyLeaderboard.css'
import '../../pages/form.css'

// End of the Country of the Day: the score (even 0) goes to the day's leaderboard, once.
export default function CountryOfDayForm({ mode, steps, score, elapsedTime, dailyKey }) {
  const { t } = useTranslation()
  const savedKey = `daily-saved:${GAME_TYPES.COUNTRY_OF_DAY}:${dailyKey}`
  const saver = useScoreSave(
    useAccount(),
    async (player) => {
      const result = await saveCountryOfDayScore({ ...player, dailyKey, mode, steps, score, elapsedTime: Math.round(elapsedTime) })
      if (result.status === 'saved' || result.status === 'updated') localStorage.setItem(savedKey, '1')
      return result
    },
    { alreadySaved: !!localStorage.getItem(savedKey) }
  )
  const text = (entry) => `${t('country_of_day.points', { count: entry.score })} — ${entry.elapsedTime != null ? formatTime(entry.elapsedTime) : '—'}`

  return (
    <div className="daily-form gg-ticket form-ticket daily-form--ticket">
      <div className="form-ticket__main">
        <p className="gg-kicker">{t('carnet_games.kicker_end')}</p>
        <h2 className="daily-form__title">{t('form.title')}</h2>

        <LeaderboardSave
          saver={saver}
          variant="daily"
          existingText={text}
          blockedLabel={t('form.better_daily_score')}
          blockedHint={t('form.use_different_name_daily')}
        />
      </div>
      <div className="gg-ticket-stub form-ticket__stub">
        <span className="gg-field"><small>{t('game_hud.score')}</small><strong>{t('country_of_day.points', { count: score })}</strong></span>
        <span className="gg-field"><small>{t('game_hud.time')}</small><strong>{elapsedTime != null ? formatTime(elapsedTime) : '—'}</strong></span>
      </div>
    </div>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveChallengeScore } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { CHALLENGE_ROUNDS } from '../utils/dailyChallenge'
import { GAME_TYPES } from '../utils/gameTypes'
import { useAccount } from '../auth'
import { useScoreSave } from '../hooks/useScoreSave'
import LeaderboardSave from '../components/LeaderboardSave'
import './DailyLeaderboard.css'

// End of the Daily Challenge: the score (even 0) goes to the day's leaderboard, once.
// `results`: 'correct' | 'failed' for each round.
export default function ChallengeForm({ score, elapsedTime, results, dailyKey }) {
  const { t } = useTranslation()
  const savedKey = `daily-saved:${GAME_TYPES.DAILY_CHALLENGE}:${dailyKey}`
  const saver = useScoreSave(
    useAccount(),
    async (player) => {
      const result = await saveChallengeScore({
        ...player,
        dailyKey,
        score,
        elapsedTime: Math.round(elapsedTime),
        results: results.map((result) => result === 'correct'),
      })
      if (result.status === 'saved' || result.status === 'updated') localStorage.setItem(savedKey, '1')
      return result
    },
    { alreadySaved: !!localStorage.getItem(savedKey) }
  )
  const text = (entry) => `${entry.score}/${CHALLENGE_ROUNDS} — ${entry.elapsedTime != null ? formatTime(entry.elapsedTime) : '—'}`

  return (
    <div className="daily-form">
      <h2 className="daily-form__title">{t('form.title')}</h2>
      <p className="daily-form__stat">{text({ score, elapsedTime })}</p>

      <LeaderboardSave
        saver={saver}
        variant="daily"
        existingText={text}
        blockedLabel={t('form.better_daily_score')}
        blockedHint={t('form.use_different_name_daily')}
      />
    </div>
  )
}

import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveSurvivalScore } from '../../utils/saveScore'
import { formatTime } from '../../utils/formatTime'
import { useAccount } from '../../auth'
import { useScoreSave } from '../../hooks/useScoreSave'
import LeaderboardSave from '../../components/LeaderboardSave'
import '../form.css'

// End of a solo survival run: saves the rounds survived in the leaderboard of these games, lives, timer and ramp.
export default function SurvivalForm({ score, elapsedTime, modes, lives, timer, ramp }) {
  const { t } = useTranslation()
  const saver = useScoreSave(
    useAccount(),
    (player) => saveSurvivalScore({ ...player, modes, lives, timer, ramp, score, elapsedTime: Math.round(elapsedTime) }),
    { enabled: score > 0 }
  )

  // A run without any round cleared has nothing to rank
  if (score === 0) return null

  return (
    <div className="form-container">
      <h2 className="form-title">{t('form.title')}</h2>
      <LeaderboardSave
        saver={saver}
        existingText={(existing) => `${t('survival.rounds_count', { count: existing.score })} — ${formatTime(existing.elapsedTime)}`}
        blockedLabel={t('form.better_score_exists')}
        blockedHint={t('form.use_different_name')}
      />
    </div>
  )
}

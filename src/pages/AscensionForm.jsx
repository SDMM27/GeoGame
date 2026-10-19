import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveAscensionScore } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { presetLabel } from '../utils/ascensionPresets'
import { useAccount } from '../auth'
import { useScoreSave } from '../hooks/useScoreSave'
import LeaderboardSave from '../components/LeaderboardSave'

/**
 * End-of-game summary and score save for Ascension mode.
 * Only saves to Firestore if presetName is not null and isTraining is false.
 */
export default function AscensionForm({ score, timer, stats, phaseStats, gameType, presetName, isTraining }) {
  const { t } = useTranslation()
  const canSave = !isTraining && presetName !== null
  const saver = useScoreSave(
    useAccount(),
    (player) => saveAscensionScore({ ...player, gameType, presetName, timer, score, stats, phaseStats }),
    { enabled: canSave }
  )

  const DIFFICULTY_COLORS = {
    Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24', Impossible: '#f97316',
  }

  return (
    <div className="form-container">
      <h2 className="form-title">{t('form.ascension_title')}</h2>
      {presetName && <p className="form-score-display">{t('labels.preset')} <strong>{presetLabel(presetName, t)}</strong></p>}

      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '1.4em', fontWeight: 'bold' }}>
            {formatTime(timer)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>{t('labels.total_time')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fbbf24', fontSize: '1.4em', fontWeight: 'bold' }}>{score}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>{t('labels.score')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#4ade80', fontSize: '1.4em', fontWeight: 'bold' }}>
            {stats.found}/{stats.total}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>{t('labels.found')}</div>
        </div>
      </div>

      {phaseStats?.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em', marginBottom: '12px' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>{t('labels.phase')}</th>
              <th style={{ textAlign: 'center' }}>{t('labels.found')}</th>
              <th style={{ textAlign: 'center' }}>{t('game_hud.skipped')}</th>
              <th style={{ textAlign: 'right' }}>{t('leaderboard.time')}</th>
            </tr>
          </thead>
          <tbody>
            {phaseStats.map((ps, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ color: DIFFICULTY_COLORS[ps.difficulty] ?? '#e2e8f0', padding: '4px 0' }}>
                  {t(`difficulties.${ps.difficulty}`, ps.difficulty)}
                </td>
                <td style={{ textAlign: 'center', color: '#e2e8f0' }}>{ps.found}/{ps.count}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{ps.skipped}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{formatTime(ps.timeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canSave && (
        <LeaderboardSave
          saver={saver}
          existingText={(existing) => `${formatTime(existing.timeMs)} — ${existing.score} ${t('units.pts')}`}
          blockedLabel={t('form.better_ascension_time')}
          blockedHint={t('form.use_different_name')}
        />
      )}
      {!canSave && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center' }}>
          {isTraining ? t('form.training_mode_not_saved') : t('form.custom_config_not_saved')}
        </p>
      )}
    </div>
  )
}

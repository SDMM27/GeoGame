import React from 'react'
import { useTranslation } from 'react-i18next'
import { saveAscensionScore } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { presetLabel } from '../utils/ascensionPresets'
import { useAccount } from '../auth'
import { useScoreSave } from '../hooks/useScoreSave'
import LeaderboardSave from '../components/LeaderboardSave'
import EndStamp from '../components/EndStamp'

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
    <div className="form-container gg-ticket form-ticket">
      <div className="form-ticket__main">
      <EndStamp />
      <p className="gg-kicker">{t('carnet_games.kicker_end')}</p>
      <h2 className="form-title">{t('form.ascension_title')}</h2>
      {presetName && <p className="form-score-display">{t('labels.preset')} <strong>{presetLabel(presetName, t)}</strong></p>}

      {phaseStats?.length > 0 && (
        <table className="form-ticket__phases" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em', marginBottom: '12px' }}>
          <thead>
            <tr className="gg-board-head" style={{ borderBottom: '1px solid var(--sd-line)' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>{t('labels.phase')}</th>
              <th style={{ textAlign: 'center' }}>{t('labels.found')}</th>
              <th style={{ textAlign: 'center' }}>{t('game_hud.skipped')}</th>
              <th style={{ textAlign: 'right' }}>{t('leaderboard.time')}</th>
            </tr>
          </thead>
          <tbody>
            {phaseStats.map((ps, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--gg-tint-strong)' }}>
                <td style={{ color: DIFFICULTY_COLORS[ps.difficulty] ?? 'var(--sd-ink)', padding: '4px 0' }}>
                  {t(`difficulties.${ps.difficulty}`, ps.difficulty)}
                </td>
                <td style={{ textAlign: 'center', color: 'var(--sd-ink)' }}>{ps.found}/{ps.count}</td>
                <td style={{ textAlign: 'center', color: 'var(--sd-muted)' }}>{ps.skipped}</td>
                <td style={{ textAlign: 'right', color: 'var(--sd-muted)' }}>{formatTime(ps.timeMs)}</td>
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
        <p style={{ color: 'var(--sd-muted)', fontSize: '0.85em', textAlign: 'center' }}>
          {isTraining ? t('form.training_mode_not_saved') : t('form.custom_config_not_saved')}
        </p>
      )}
      </div>
      <div className="gg-ticket-stub form-ticket__stub">
        <span className="gg-field"><small>{t('labels.total_time')}</small><strong>{formatTime(timer)}</strong></span>
        <span className="gg-field"><small>{t('game_hud.score')}</small><strong>{score}</strong></span>
        <span className="gg-field"><small>{t('labels.found')}</small><strong>{stats.found}/{stats.total}</strong></span>
      </div>
    </div>
  )
}

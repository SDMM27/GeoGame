import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { saveDailyScore } from '../utils/saveScore'
import { formatTime } from '../utils/formatTime'
import { getSavedPseudo } from '../utils/account'
import './DailyLeaderboard.css'

export default function DailyForm({ attempts, elapsedTime, guesses, gameType, dailyKey, statText, hints }) {
  const { t } = useTranslation()
  const nameRef = useRef()
  const savedKey = `daily-saved:${gameType}:${dailyKey}`
  const [saved, setSaved] = useState(() => !!localStorage.getItem(savedKey))
  const [submitting, setSubmitting] = useState(false)
  const [blockedByBetter, setBlockedByBetter] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (submitting || saved) return
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error(t('messages.please_enter_username'), { containerId: 'topRightToast' })
      return
    }
    setSubmitting(true)

    try {
      const result = await saveDailyScore({ name, gameType, dailyKey, attempts, elapsedTime, guesses, hints })
      if (result.status === 'blocked') {
        setBlockedByBetter(result.existing)
        setSubmitting(false)
        return
      }
      toast.success(result.status === 'updated' ? 'Score mis à jour !' : `Score de ${name} sauvegardé !`, { containerId: 'topRightToast' })
      localStorage.setItem(savedKey, '1')
      setSaved(true)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { containerId: 'topRightToast' })
      console.error(err)
      setSubmitting(false)
    }
  }

  return (
    <div className="daily-form">
      <h2 className="daily-form__title">{t('form.title')}</h2>
      <p className="daily-form__stat">{statText ?? `${attempts} ${attempts === 1 ? t('units.attempt_one') : t('units.attempt_other')} — ${elapsedTime != null ? formatTime(elapsedTime) : '—'}`}</p>

      {blockedByBetter && (
        <div className="daily-form__blocked">
          <p>{t('form.better_daily_score')} <strong>{blockedByBetter.attempts} {blockedByBetter.attempts === 1 ? t('units.attempt_one') : t('units.attempt_other')} — {formatTime(blockedByBetter.elapsedTime)}</strong>.</p>
          <p className="daily-form__blocked-hint">{t('form.use_different_name_daily')}</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        <label htmlFor="daily-pseudo" className="daily-form__label">{t('labels.username')}</label>
        <input
          id="daily-pseudo"
          ref={nameRef}
          defaultValue={getSavedPseudo()}
          className="daily-form__input"
          type="text"
          placeholder={t('placeholders.username')}
          maxLength={20}
          disabled={saved}
          onChange={() => { if (blockedByBetter) setBlockedByBetter(null) }}
        />
        <button type="submit" className="daily-form__submit" disabled={saved || submitting}>
          {saved ? t('form.score_saved') : submitting ? t('form.saving') : t('buttons.save_score')}
        </button>
      </form>
    </div>
  )
}

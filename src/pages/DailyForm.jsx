import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { firestore } from '../Firebase'
import { isBetterDailyScore } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

export default function DailyForm({ attempts, elapsedTime, guesses, gameType, dailyKey, statText, hints }) {
  const { t } = useTranslation()
  const nameRef = useRef()
  const savedKey = `daily-saved:${gameType}:${dailyKey}`
  const [saved, setSaved] = useState(() => !!localStorage.getItem(savedKey))
  const [submitting, setSubmitting] = useState(false)
  const [blockedByBetter, setBlockedByBetter] = useState(null)
  const ref = collection(firestore, 'daily_scores')

  const handleSave = async (e) => {
    e.preventDefault()
    if (submitting || saved) return
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error(t('messages.please_enter_username'), { containerId: 'topRightToast' })
      return
    }
    setSubmitting(true)

    const newScore = { name, gameType, dailyKey, attempts, elapsedTime, guesses, ...(hints != null && { hints }) }

    const existingSnapshot = await getDocs(
      query(ref, where('name', '==', name), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
    )

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data()
      if (!isBetterDailyScore(newScore, existing)) {
        setBlockedByBetter({ attempts: existing.attempts, elapsedTime: existing.elapsedTime })
        setSubmitting(false)
        return
      }
      await deleteDoc(existingSnapshot.docs[0].ref)
    }

    try {
      await addDoc(ref, newScore)
      const wasReplaced = !existingSnapshot.empty
      toast.success(wasReplaced ? 'Score mis à jour !' : `Score de ${name} sauvegardé !`, { containerId: 'topRightToast' })
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

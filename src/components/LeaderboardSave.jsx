import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getSavedPseudo } from '../utils/account'
import { notifyLeaderboardSaved } from '../hooks/useLeaderboardRefresh'
import './LeaderboardSave.css'

// Class names of each form's look (form.css, DailyLeaderboard.css, RankingGamePage.css).
const VARIANTS = {
  form: {
    form: '',
    label: 'form-label',
    input: 'form-input',
    submit: 'form-submit',
    note: 'form-blocked',
    message: 'form-blocked-message',
    hint: 'form-blocked-hint',
  },
  daily: {
    form: '',
    label: 'daily-form__label',
    input: 'daily-form__input',
    submit: 'daily-form__submit',
    note: 'daily-form__blocked',
    message: '',
    hint: 'daily-form__blocked-hint',
  },
  ranking: {
    form: 'ranking-leaderboard-form',
    label: null,
    input: 'ranking-leaderboard-input',
    submit: 'ranking-leaderboard-submit',
    note: 'form-blocked',
    message: 'form-blocked-message',
    hint: 'form-blocked-hint',
  },
}

// Leaderboard part of an end-of-game form, driven by useScoreSave (`saver`).
// Signed in: a status line (the score is saved on its own). Visitor: a name form.
// `existingText(existing)` describes the player's better entry when the save is blocked;
// `blockedLabel` / `blockedHint` introduce it for a visitor's name.
export default function LeaderboardSave({ saver, variant = 'form', existingText, blockedLabel, blockedHint, maxLength = 20 }) {
  const { t } = useTranslation()
  const [name, setName] = useState(getSavedPseudo)
  const classes = VARIANTS[variant]

  // A score saved during this visit (not one remembered from earlier): the page's leaderboards refresh.
  const justSaved = saver.done && saver.name != null
  useEffect(() => {
    if (justSaved) notifyLeaderboardSaved()
  }, [justSaved])

  if (saver.loading) return null

  if (saver.signedIn) {
    return (
      <div className="leaderboard-save leaderboard-save--account" role="status">
        {saver.status === 'saving' && <p>{t('score_save.saving')}</p>}
        {saver.status === 'saved' && (
          <p className="leaderboard-save__ok">
            {saver.name ? t('score_save.saved_as', { name: saver.name }) : t('form.score_saved')}
          </p>
        )}
        {saver.status === 'updated' && <p className="leaderboard-save__ok">{t('score_save.updated_as', { name: saver.name })}</p>}
        {saver.status === 'blocked' && <p>{t('score_save.record_kept', { record: existingText(saver.existing) })}</p>}
        {saver.status === 'error' && (
          <p className="leaderboard-save__error">
            {t('messages.save_error')}{' '}
            <button type="button" className="leaderboard-save__link" onClick={saver.retry}>
              {t('score_save.retry')}
            </button>
          </p>
        )}
      </div>
    )
  }

  if (saver.done) {
    return <p className="leaderboard-save leaderboard-save__ok">{t('form.score_saved')}</p>
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    saver.submit(name)
  }

  return (
    <div className="leaderboard-save">
      {saver.status === 'blocked' && (
        <div className={classes.note}>
          <p className={classes.message}>
            ⚠️ {blockedLabel} <strong>{existingText(saver.existing)}</strong>
          </p>
          <p className={classes.hint}>{blockedHint}</p>
        </div>
      )}
      {saver.status === 'taken' && <p className="leaderboard-save__error">{t('score_save.taken')}</p>}
      {saver.status === 'error' && <p className="leaderboard-save__error">{t('messages.save_error')}</p>}

      <form onSubmit={handleSubmit} className={classes.form}>
        {classes.label && (
          <label htmlFor={`leaderboard-name-${variant}`} className={classes.label}>
            {t('labels.username')}
          </label>
        )}
        <input
          id={`leaderboard-name-${variant}`}
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            saver.clear()
          }}
          className={classes.input}
          placeholder={t('placeholders.username')}
          maxLength={maxLength}
        />
        <button type="submit" className={classes.submit} disabled={!name.trim() || saver.status === 'saving'}>
          {saver.status === 'saving' ? t('form.saving') : variant === 'ranking' ? '📤' : t('buttons.save_score')}
        </button>
      </form>

      <p className="leaderboard-save__hint">
        {t('score_save.sign_in_hint')} <Link to="/account">{t('score_save.sign_in')}</Link>
      </p>
    </div>
  )
}

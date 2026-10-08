import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../auth'
import { REPORT_NOTE_MAX, REPORT_REASONS, reportEntry } from '../utils/reports'
import './ReportButton.css'

// A discreet flag next to a leaderboard name. It opens a small dialog (reason, optional note, confirmation) and
// files a report for `entry` (a row of a leaderboard in `collection`, see utils/reports.js).
export default function ReportButton({ collection, entry }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [note, setNote] = useState('')
  // 'idle' | 'sending' | 'sent' | 'already' | 'error'
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    setStatus((current) => (current === 'error' ? 'idle' : current))
  }

  const submit = async (event) => {
    event.preventDefault()
    setStatus('sending')
    try {
      const result = await reportEntry({ collection, id: entry.id, name: entry.name, reason, note, uid: account?.uid })
      setStatus(result.status)
    } catch (error) {
      console.error('[report]', error)
      setStatus('error')
    }
  }

  const done = status === 'sent' || status === 'already'

  return (
    // The portal's events bubble through React to the row, which may be clickable: keep them here.
    <span className="report" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={`report__flag ${done ? 'report__flag--done' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={t('report.button', { name: entry.name })}
        title={t('report.button', { name: entry.name })}
      >
        ⚑
      </button>
      {open &&
        createPortal(
          <div className="report__backdrop" onClick={close}>
            <div
              className="report__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id={titleId} className="report__title">
                {t('report.title', { name: entry.name })}
              </h2>
              {done ? (
                <>
                  <p className="report__message">{t(status === 'sent' ? 'report.sent' : 'report.already')}</p>
                  <div className="report__actions">
                    <button type="button" className="report__btn" onClick={close}>
                      {t('report.close')}
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={submit}>
                  <fieldset className="report__reasons" disabled={status === 'sending'}>
                    <legend className="report__legend">{t('report.reason')}</legend>
                    {REPORT_REASONS.map((value) => (
                      <label key={value} className="report__reason">
                        <input
                          type="radio"
                          name={`report-reason-${titleId}`}
                          value={value}
                          checked={reason === value}
                          onChange={() => setReason(value)}
                        />
                        {t(`report.reasons.${value}`)}
                      </label>
                    ))}
                  </fieldset>
                  <textarea
                    className="report__note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={REPORT_NOTE_MAX}
                    rows={2}
                    placeholder={t('report.note')}
                    aria-label={t('report.note')}
                    disabled={status === 'sending'}
                  />
                  {status === 'error' && <p className="report__error">{t('report.error')}</p>}
                  <div className="report__actions">
                    <button type="button" className="report__btn" onClick={close} disabled={status === 'sending'}>
                      {t('report.cancel')}
                    </button>
                    <button type="submit" className="report__btn report__btn--primary" disabled={status === 'sending'}>
                      {status === 'sending' ? t('report.sending') : t('report.submit')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </span>
  )
}

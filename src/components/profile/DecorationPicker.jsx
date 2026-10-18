// Own profile: a dialog to pick the avatar frame and the username color (see utils/decorations.js).
import React, { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDecoration } from '../../hooks/useDecoration'
import { DEFAULT_DECORATION, FRAMES, NAME_COLORS, decorationStyle, isUnlocked, saveDecoration } from '../../utils/decorations'
import { Avatar } from './ProfileBody'
import './DecorationPicker.css'

function Option({ selected, item, onPick, children, label }) {
  const { t } = useTranslation()
  const locked = !isUnlocked(item)
  return (
    <button type="button" className="decoration-option" aria-pressed={selected} disabled={locked} onClick={onPick}>
      {children}
      <span>{label}</span>
      {locked && <small>{t('decorations.locked', { level: item.unlock?.level })}</small>}
    </button>
  )
}

function PickerDialog({ account, onClose }) {
  const { t } = useTranslation()
  const titleId = useId()
  const saved = useDecoration(account.uid)
  const [choice, setChoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const current = choice ?? saved ?? DEFAULT_DECORATION

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Shows the new choice at once; goes back to the previous one if the save fails.
  const pick = async (patch) => {
    const previous = current
    const next = { ...current, ...patch }
    setChoice(next)
    setFailed(false)
    setSaving(true)
    try {
      await saveDecoration(account.uid, next)
    } catch (error) {
      console.warn('[decorations]', error?.code, error)
      setChoice(previous)
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const { nameColor } = decorationStyle(current)

  return createPortal(
    <div className="profile-detail-backdrop" onClick={onClose}>
      <div className="profile-detail decoration-picker" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <div className="profile-detail-header">
          <strong id={titleId}>{t('decorations.title')}</strong>
          <button type="button" className="profile-detail-close" onClick={onClose} aria-label={t('decorations.close')}>
            ✕
          </button>
        </div>
        <p className="decoration-hint">{t('decorations.hint')}</p>
        <div className="decoration-preview" aria-label={t('decorations.preview')}>
          <Avatar username={account.username} size={56} decoration={current} />
          <strong style={{ color: nameColor ?? undefined }}>{account.username}</strong>
        </div>
        <h3 className="decoration-section">{t('decorations.frames')}</h3>
        <div className="decoration-options">
          {FRAMES.map((frame) => (
            <Option key={frame.id} item={frame} selected={current.frame === frame.id} onPick={() => pick({ frame: frame.id })} label={t(`decorations.frame.${frame.id}`)}>
              <Avatar username={account.username} size={40} decoration={{ frame: frame.id, color: 'default' }} />
            </Option>
          ))}
        </div>
        <h3 className="decoration-section">{t('decorations.colors')}</h3>
        <div className="decoration-options">
          {NAME_COLORS.map((color) => (
            <Option key={color.id} item={color} selected={current.color === color.id} onPick={() => pick({ color: color.id })} label={t(`decorations.color.${color.id}`)}>
              <span className="decoration-swatch" style={{ background: color.value ?? 'var(--text-muted)' }} />
            </Option>
          ))}
        </div>
        <p className="decoration-status" role="status">
          {failed ? t('decorations.error') : saving ? t('decorations.saving') : ''}
        </p>
      </div>
    </div>,
    document.body
  )
}

export default function DecorationPicker({ account }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="decoration-open" onClick={() => setOpen(true)}>
        {t('decorations.open')}
      </button>
      {open && <PickerDialog account={account} onClose={() => setOpen(false)} />}
    </>
  )
}

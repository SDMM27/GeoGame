// Own profile: a dialog to pick the avatar frame and the username color (see utils/decorations.js).
import React, { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDecoration } from '../../hooks/useDecoration'
import { useXp } from '../../hooks/useXp'
import { DEFAULT_DECORATION, FRAMES, NAME_COLORS, UNCROPPED_FLAGS, decorationStyle, flagImagePath, isUnlocked, saveAvatarFlag, saveDecoration } from '../../utils/decorations'
import { FLAG_POOL } from '../../utils/flagCollectionData'
import { readFlags } from '../../utils/flagCollection'
import { getCountryName } from '../../utils/getCountryName'
import { fetchPublicData } from '../../utils/publicProfile'
import { Avatar } from './ProfileBody'
import './DecorationPicker.css'

function Option({ selected, item, level, onPick, children, label }) {
  const { t } = useTranslation()
  const locked = !isUnlocked(item, { level })
  return (
    <button type="button" className="decoration-option" aria-pressed={selected} disabled={locked} onClick={onPick}>
      {children}
      <span>{label}</span>
      {locked && <small>{t('decorations.locked', { level: item.unlock?.level })}</small>}
    </button>
  )
}

const SEARCH_FROM = 12

function FlagOption({ iso, name, selected, onPick }) {
  return (
    <button type="button" className="decoration-option decoration-flag-option" aria-pressed={selected} onClick={onPick} title={name}>
      <img
        className={`decoration-flag-thumb${UNCROPPED_FLAGS.has(iso) ? ' decoration-flag-thumb--whole' : ''}`}
        src={flagImagePath(iso)}
        alt=""
        loading="lazy"
        draggable={false}
      />
      <span>{name}</span>
    </button>
  )
}

function PickerDialog({ account, onClose }) {
  const { t, i18n } = useTranslation()
  const language = i18n?.language
  const titleId = useId()
  const saved = useDecoration(account.uid)
  const level = useXp(account.uid)?.level ?? 1
  const [choice, setChoice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [unlocked, setUnlocked] = useState(null)
  const [query, setQuery] = useState('')
  const current = choice ?? saved ?? DEFAULT_DECORATION

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // The flags of the player's collection (the same source as the profile's collection section).
  useEffect(() => {
    let cancelled = false
    fetchPublicData(account.uid).then((data) => !cancelled && setUnlocked(readFlags(data, FLAG_POOL).unlocked))
    return () => {
      cancelled = true
    }
  }, [account.uid])

  const flags = useMemo(() => {
    const collator = (a, b) => a.name.localeCompare(b.name, language)
    return (unlocked ?? []).map((iso) => ({ iso, name: getCountryName(iso, language) ?? iso })).sort(collator)
  }, [unlocked, language])
  const needle = query.trim().toLowerCase()
  const shownFlags = needle ? flags.filter((flag) => flag.name.toLowerCase().includes(needle)) : flags

  // Shows the new choice at once; goes back to the previous one if the save fails.
  const pick = async (patch) => {
    const previous = current
    const next = { ...current, ...patch }
    setChoice(next)
    setFailed(false)
    setSaving(true)
    try {
      await saveDecoration(account.uid, next, { level })
    } catch (error) {
      console.warn('[decorations]', error?.code, error)
      setChoice(previous)
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  // Wears a flag (or none), keeping the frame and the color; goes back to the previous choice if the save fails.
  const pickFlag = async (iso) => {
    const previous = current
    setChoice({ ...current, flag: iso })
    setFailed(false)
    setSaving(true)
    try {
      await saveAvatarFlag(account.uid, iso, unlocked ?? [])
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
            <Option key={frame.id} item={frame} level={level} selected={current.frame === frame.id} onPick={() => pick({ frame: frame.id })} label={t(`decorations.frame.${frame.id}`)}>
              <Avatar username={account.username} size={40} decoration={{ frame: frame.id, color: 'default' }} />
            </Option>
          ))}
        </div>
        <h3 className="decoration-section">{t('decorations.colors')}</h3>
        <div className="decoration-options">
          {NAME_COLORS.map((color) => (
            <Option key={color.id} item={color} level={level} selected={current.color === color.id} onPick={() => pick({ color: color.id })} label={t(`decorations.color.${color.id}`)}>
              <span className="decoration-swatch" style={{ background: color.value ?? 'var(--sd-muted)' }} />
            </Option>
          ))}
        </div>
        <h3 className="decoration-section">{t('decorations.flag_section')}</h3>
        <p className="decoration-flag-hint">{t('decorations.flag_hint')}</p>
        {unlocked && flags.length === 0 ? (
          <p className="decoration-flag-hint">{t('decorations.flag_empty')}</p>
        ) : (
          unlocked && (
            <>
              {flags.length > SEARCH_FROM && (
                <input
                  type="search"
                  className="decoration-flag-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('decorations.flag_search')}
                  aria-label={t('decorations.flag_search')}
                />
              )}
              <div className="decoration-options decoration-flag-grid">
                <button type="button" className="decoration-option decoration-flag-option" aria-pressed={!current.flag} onClick={() => pickFlag(null)}>
                  <span className="decoration-flag-thumb decoration-flag-thumb--none" aria-hidden="true" />
                  <span>{t('decorations.flag_none')}</span>
                </button>
                {shownFlags.map(({ iso, name }) => (
                  <FlagOption key={iso} iso={iso} name={name} selected={current.flag === iso} onPick={() => pickFlag(iso)} />
                ))}
              </div>
            </>
          )
        )}
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

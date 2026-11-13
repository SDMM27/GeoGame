// A small round button over the globe that opens the list of globe skins (see utils/globeSkins.js): locked ones show
// the level that unlocks them, the secret one only appears once found.
import React, { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isSkinUnlocked, loadAccentEnabled, saveAccentEnabled, visibleSkins } from '../../utils/globeSkins'
import './GlobeSkinPicker.css'

const swatchStyle = (skin) => ({
  background: `linear-gradient(135deg, ${skin.swatch?.[0] ?? 'var(--gg-globe-ocean)'} 50%, ${skin.swatch?.[1] ?? 'var(--gg-globe-land)'} 50%)`,
})

export default function GlobeSkinPicker({ choice, level, secret, signedIn, onPick }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const titleId = useId()
  const [accent, setAccent] = useState(loadAccentEnabled)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    const onDown = (event) => { if (!box.current?.contains(event.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const progress = { level, secret }
  return (
    <div className="globe-skins" ref={box}>
      <button
        type="button"
        className="globe-skins-open"
        aria-label={t('globe.skins_open')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🎨</span>
      </button>
      {open && (
        <div className="globe-skins-popover" role="dialog" aria-labelledby={titleId}>
          <strong id={titleId}>{t('globe.skins_title')}</strong>
          <p className="globe-skins-hint">{t('globe.skins_hint')}</p>
          {!signedIn && <p className="globe-skins-hint">{t('globe.skins_signin')}</p>}
          <div className="globe-skins-options">
            {visibleSkins(progress).map((skin) => {
              const locked = !isSkinUnlocked(skin, progress)
              return (
                <button
                  key={skin.id}
                  type="button"
                  className="globe-skins-option"
                  aria-pressed={choice === skin.id}
                  disabled={locked}
                  onClick={() => { onPick(skin.id); setOpen(false) }}
                >
                  <span className="globe-skins-swatch" style={swatchStyle(skin)} />
                  <span>{t(`globe.skin.${skin.id}`)}</span>
                  {locked && <small>{t('globe.skins_locked', { level: skin.unlock.level })}</small>}
                </button>
              )
            })}
          </div>
          <label className="globe-skins-accent">
            <input
              type="checkbox"
              checked={accent}
              onChange={(event) => { setAccent(event.target.checked); saveAccentEnabled(event.target.checked) }}
            />
            {t('globe.skins_accent')}
          </label>
        </div>
      )}
    </div>
  )
}

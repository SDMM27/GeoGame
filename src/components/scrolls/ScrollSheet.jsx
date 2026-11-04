// The sheet of an owned scroll: its map with zoom and pan, the title, the date, the kind of map, the story and the detail
// to spot when the texts of the player's language (or English, or French) have them, and the credit line. The caller only
// opens it for a scroll the account owns.
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadCountryGeometries } from '../../data/countryGeometry'
import { hasEmpireMap } from '../../data/empires'
import { loadScrollText } from '../../data/scrollTexts'
import { formatScrollDate, formatScrollYear } from '../../utils/scrollCollectionData'
import ScrollMap from './ScrollMap'
import './Scrolls.css'

// The map library loads only when the interactive map is asked for
const EmpireMap = lazy(() => Promise.all([import('./EmpireMap'), loadCountryGeometries()]).then(([module]) => module))

export default function ScrollSheet({ scroll, onClose }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState({})
  const [interactive, setInteractive] = useState(false)
  const closeRef = useRef(null)
  const title = t(`scrolls.title_${scroll.id}`)
  const year = formatScrollYear(t, scroll.year)

  useEffect(() => {
    let cancelled = false
    setText({})
    loadScrollText(scroll.id, i18n.language).then((loaded) => {
      if (!cancelled) setText(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [scroll.id, i18n.language])

  // Focus goes to the close button, then back to where it was
  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    return () => opener?.focus?.()
  }, [])
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scroll-sheet" role="dialog" aria-modal="true" aria-labelledby="scroll-sheet-title">
      <div className="scroll-sheet-backdrop" onClick={onClose} />
      <article className="scroll-sheet-panel">
        <button type="button" className="scroll-sheet-close" ref={closeRef} aria-label={t('scrolls.close')} onClick={onClose}>×</button>
        {hasEmpireMap(scroll.id) && (
          <div className="scroll-sheet-views">
            <button type="button" aria-pressed={!interactive} onClick={() => setInteractive(false)}>{t('scrolls.view_old')}</button>
            <button type="button" aria-pressed={interactive} onClick={() => setInteractive(true)}>{t('scrolls.view_interactive')}</button>
          </div>
        )}
        {interactive ? (
          <Suspense fallback={null}>
            <EmpireMap id={scroll.id} language={i18n.language} />
          </Suspense>
        ) : (
          <ScrollMap key={scroll.id} id={scroll.id} alt={title} />
        )}
        <header className="scroll-sheet-head">
          <h2 id="scroll-sheet-title">{title}</h2>
          {scroll.family !== 'atlas' && (
            <p className="scroll-sheet-date">
              <time>{formatScrollDate(t, scroll)}</time>
            </p>
          )}
          <p className="scroll-sheet-family">{scroll.family === 'atlas' ? t('scrolls.family_atlas', { year }) : t('scrolls.family_period')}</p>
        </header>
        {text.body && <p className="scroll-sheet-body">{text.body}</p>}
        {text.detail && (
          <aside className="scroll-sheet-detail">
            <strong>{t('scrolls.detail_title')}</strong>
            <p>{text.detail}</p>
          </aside>
        )}
        {text.credit && (
          <small className="scroll-sheet-credit">
            <strong>{t('scrolls.credit_title')}</strong> · {text.credit}
          </small>
        )}
      </article>
    </div>
  )
}

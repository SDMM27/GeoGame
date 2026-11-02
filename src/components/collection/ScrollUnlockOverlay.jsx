// Full-screen reward when the server unlocks scrolls (onXpClaimed in utils/xp): the sealed scroll, then a tap on the seal
// opens it onto its map and title, with a link to its sheet. Several scrolls play one after another, and after the flag
// overlay when the same claim unlocked flags too.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { onXpClaimed } from '../../utils/xp'
import { SCROLLS, scrollById, scrollsAfter } from '../../utils/scrollCollectionData'
import ScrollImage from '../scrolls/ScrollImage'
import { isFlagOverlayOpen, onFlagOverlayChange } from './busy'
import '../scrolls/Scrolls.css'

const EXIT = 220

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ScrollUnlockOverlay() {
  const { account } = useAccount()
  const uid = account?.uid
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [flagOpen, setFlagOpen] = useState(isFlagOverlayOpen)
  const nextId = useRef(0)
  const opener = useRef(null)

  useEffect(
    () =>
      onXpClaimed((claim) => {
        const ids = (claim.unlockedScrolls ?? []).filter((id) => scrollById(id))
        if (ids.length === 0) return
        const scrolls = scrollsAfter(claim, uid)
        const first = nextId.current
        nextId.current += ids.length
        // The account already holds every scroll of the claim: the n-th one from the end counts n fewer
        setQueue((current) => [
          ...current,
          ...ids.map((id, index) => ({ id: first + index, scrollId: id, count: scrolls ? scrolls.unlocked.length - (ids.length - 1 - index) : null })),
        ])
      }),
    [uid]
  )
  useEffect(() => onFlagOverlayChange(setFlagOpen), [])

  // Focus goes back to where it was once the last scroll is closed
  const open = queue.length > 0 && !flagOpen
  useEffect(() => {
    if (!open) return undefined
    opener.current = document.activeElement
    return () => opener.current?.focus?.()
  }, [open])

  const item = queue[0]
  if (!item || flagOpen) return null
  return (
    <ScrollReveal
      key={item.id}
      item={item}
      onNext={() => setQueue((current) => current.slice(1))}
      onView={() => {
        const scrollId = item.scrollId
        setQueue([])
        navigate(`/parchments?scroll=${scrollId}`)
      }}
    />
  )
}

function ScrollReveal({ item, onNext, onView }) {
  const { t } = useTranslation()
  const reduced = useMemo(prefersReducedMotion, [])
  const [opened, setOpened] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const sealRef = useRef(null)
  const continueRef = useRef(null)
  const title = t(`scrolls.title_${item.scrollId}`)

  useEffect(() => {
    sealRef.current?.focus()
  }, [])
  useEffect(() => {
    if (opened) continueRef.current?.focus()
  }, [opened])

  const leave = (view) => {
    if (leaving) return
    setLeaving(true)
    setTimeout(view ? onView : onNext, reduced ? 0 : EXIT)
  }
  useEffect(() => {
    if (!opened) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') leave(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={`scroll-reveal${opened ? ' scroll-reveal--open' : ''}${leaving ? ' scroll-reveal--leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="scroll-reveal-heading">
      <div className="scroll-reveal-backdrop" onClick={() => opened && leave(false)} />
      <div className="scroll-reveal-content">
        <small className="scroll-reveal-new">{t('scrolls.new_scroll')}</small>
        <button type="button" className="scroll-reveal-scroll" ref={sealRef} disabled={opened} aria-label={t('scrolls.open_seal')} onClick={() => setOpened(true)}>
          <ScrollImage id={item.scrollId} className="scroll-reveal-map" />
          <span className="scroll-reveal-closed" aria-hidden="true">
            <span className="scroll-seal" />
          </span>
        </button>
        <div className="scroll-reveal-texts" aria-live="polite">
          {opened ? (
            <>
              <h2 id="scroll-reveal-heading" className="scroll-reveal-title">{title}</h2>
              {item.count != null && <small>{t('scrolls.progress', { count: item.count, total: SCROLLS.length })}</small>}
            </>
          ) : (
            <>
              <h2 id="scroll-reveal-heading" className="scroll-reveal-title">{t('scrolls.sealed')}</h2>
              <small>{t('scrolls.tap_seal')}</small>
            </>
          )}
        </div>
        {opened && (
          <div className="scroll-reveal-buttons">
            <button type="button" className="scroll-reveal-view" onClick={() => leave(true)}>
              {t('scrolls.view_scroll')}
            </button>
            <button type="button" className="scroll-reveal-continue" ref={continueRef} onClick={() => leave(false)}>
              {t('collection.tap_to_continue')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

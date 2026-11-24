// Full-screen reward when the server unlocks flags: the flag's pieces fly together, a burst in
// the rarity color, then the name and a shortcut to the collection. Several flags play one after another.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { useFlagRevealQueue } from '../../hooks/useFlagRevealQueue'
import { onXpClaimed } from '../../utils/xp'
import { pieceGrid, piecesFor } from '../../utils/flagCollection'
import { FLAG_POOL } from '../../utils/flagCollectionData'
import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COLOR, HISTORICAL_FLAG_COST } from '../../data/historicalFlags'
import { getCountryName } from '../../utils/getCountryName'
import { onLeagueFlagReveal } from '../../utils/leagueFlagReveal'
import { flagsAfter, pieceStyle, rarityColor, rarityOf } from './claim'
import { setFlagOverlayOpen } from './busy'
import { onReplayFlag } from './replay'
import './FlagUnlockOverlay.css'

const BURST_COUNT = { common: 12, uncommon: 16, rare: 22, legendary: 30 }
const RAY_OPACITY = { common: 0, uncommon: 0.1, rare: 0.16, legendary: 0.24 }
const TWINKLES = [[-150, -70], [155, -85], [-135, 80], [145, 70], [-20, -118], [30, 118]]
const STAGGER = 140
const FLIGHT = 700 // time for the last piece to settle after it took off
const START = 450 // backdrop fade, then the first piece takes off
const EXIT = 220

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function FlagUnlockOverlay() {
  const { account } = useAccount()
  const uid = account?.uid
  const navigate = useNavigate()
  const { queue, store } = useFlagRevealQueue(uid)
  const opener = useRef(null)

  useEffect(() => {
    const enqueue = (isos, collectionCount, historical = []) => {
      if (!isos.length && !historical.length) return
      // Right away, so that a concurrent scroll reveal waits for this overlay (busy.js).
      setFlagOverlayOpen(true)
      store.enqueue(isos, collectionCount, historical)
    }

    const stopXp = onXpClaimed((claim) => {
      if (claim.uid && claim.uid !== uid) return
      enqueue(claim.unlockedFlags ?? [], flagsAfter(claim, uid)?.unlocked.length, claim.unlockedHistoricalFlags)
    })
    const stopLeague = onLeagueFlagReveal((reveal) => {
      if (reveal.uid === uid) enqueue(reveal.unlocked, reveal.collectionCount, reveal.historical)
    })
    return () => {
      stopXp()
      stopLeague()
    }
  }, [store, uid])
  useEffect(() => onReplayFlag(store.replay), [store])

  // Focus goes back to where it was once the last flag is closed
  const open = queue.length > 0
  useEffect(() => {
    setFlagOverlayOpen(open)
    if (!open) return undefined
    opener.current = document.activeElement
    return () => opener.current?.focus?.()
  }, [open])

  useEffect(() => () => setFlagOverlayOpen(false), [])

  const item = queue[0]
  if (!item) return null
  const advance = () => store.advance(item.id)
  return (
    <FlagReveal
      key={`${uid}:${item.id}`}
      item={item}
      onNext={advance}
      onSkip={queue.length > 1 ? () => store.skipThrough(queue[queue.length - 1].id) : undefined}
      onView={queue.length === 1 ? () => {
        advance()
        if (!store.getSnapshot().length) navigate('/account')
      } : undefined}
    />
  )
}

function FlagReveal({ item, onNext, onView, onSkip }) {
  const { t, i18n } = useTranslation()
  const reduced = useMemo(prefersReducedMotion, [])
  const historical = HISTORICAL_FLAGS.find(({ id }) => id === item.iso)
  const rarity = historical ? 'legendary' : rarityOf(item.iso)
  const color = historical ? HISTORICAL_FLAG_COLOR : rarityColor(rarity)
  const cost = historical ? HISTORICAL_FLAG_COST : piecesFor(rarity)
  const { cols, rows } = historical ? { cols: 5, rows: 2 } : pieceGrid(cost)
  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const name = historical?.name[language] ?? (getCountryName(item.iso, i18n.language) || item.iso)
  const rarityLabel = t(historical ? 'collection.historical.title' : `collection.rarity.${rarity}`)
  const imageUrl = historical ? `/flags/historical/${item.iso}.png` : `/flags/${item.iso.toLowerCase()}.png`
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const exitTimer = useRef(null)
  const [announcement, setAnnouncement] = useState('')
  const continueRef = useRef(null)
  // Where each piece flies in from
  const [scatter] = useState(() =>
    Array.from({ length: cost }, () => ({ x: (Math.random() * 2 - 1) * 180, y: (Math.random() * 2 - 1) * 260, rotation: (Math.random() * 2 - 1) * 45 }))
  )
  const [particles] = useState(() => {
    const total = BURST_COUNT[rarity]
    return Array.from({ length: total }, (_, index) => {
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const dist = 120 + Math.random() * 110
      return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 5 + Math.random() * 5, sparkle: index % 2 === 0, white: index % 3 === 0 }
    })
  })

  // Moment the last piece has landed
  const landed = reduced ? 0 : START + (cost - 1) * STAGGER + FLIGHT

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), landed + 700)
    return () => clearTimeout(timer)
  }, [landed])
  useEffect(() => {
    setAnnouncement(`${name} – ${rarityLabel}`)
  }, [name, rarityLabel])
  useEffect(() => {
    if (ready) continueRef.current?.focus()
  }, [ready])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  const leave = (next) => {
    if (!ready || exitTimer.current !== null) return
    setLeaving(true)
    exitTimer.current = setTimeout(next, EXIT)
  }
  useEffect(() => {
    if (!ready) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') leave(onNext)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const className = `flag-reveal flag-reveal--${rarity}${reduced ? ' flag-reveal--reduced' : ''}${leaving ? ' flag-reveal--leaving' : ''}`
  const vars = { '--rarity': color, '--landed': `${landed}ms`, '--start': `${START}ms`, '--stagger': `${STAGGER}ms`, '--flight': `${FLIGHT}ms`, '--rays': RAY_OPACITY[rarity] }
  return (
    <div className={className} style={vars} role="dialog" aria-modal="true" aria-labelledby="flag-reveal-name">
      <div className="flag-reveal-backdrop" onClick={() => leave(onNext)} />
      <div className="flag-reveal-content">
        <div className="flag-reveal-stage" aria-hidden="true">
          <div className="flag-reveal-glow" />
          {!reduced && rarity !== 'common' && <div className="flag-reveal-rays" />}

          <div className="flag-reveal-box">
            {!reduced && (
              <div className="flag-reveal-pieces">
                {scatter.map((from, index) => (
                  <span
                    key={index}
                    className="flag-reveal-piece"
                    style={{
                      left: `${(index % cols) * (100 / cols)}%`,
                      top: `${Math.floor(index / cols) * (100 / rows)}%`,
                      width: `${100 / cols}%`,
                      height: `${100 / rows}%`,
                      '--fx': `${from.x}px`,
                      '--fy': `${from.y}px`,
                      '--fr': `${from.rotation}deg`,
                      '--delay': `calc(var(--start) + ${index} * var(--stagger))`,
                      ...pieceStyle(item.iso, index, cols, rows, imageUrl),
                    }}
                  />
                ))}
              </div>
            )}
            <div className="flag-reveal-flag">
              <img src={imageUrl} alt="" />
              <span className="flag-reveal-shine" />
              <span className="flag-reveal-flash" />
            </div>
          </div>

          {!reduced && (
            <>
              <span className="flag-reveal-ring" />
              {rarity === 'legendary' && <span className="flag-reveal-ring flag-reveal-ring--second" />}
              {particles.map((particle, index) => (
                <span
                  key={index}
                  className={`flag-reveal-particle${particle.sparkle ? ' flag-reveal-sparkle' : ''}${particle.white ? ' flag-reveal-particle--white' : ''}`}
                  style={{ '--dx': `${particle.dx}px`, '--dy': `${particle.dy}px`, '--size': `${particle.size * (particle.sparkle ? 2 : 1)}px` }}
                />
              ))}
              {rarity === 'legendary' &&
                TWINKLES.map(([x, y], index) => (
                  <span
                    key={index}
                    className={`flag-reveal-twinkle flag-reveal-sparkle${index % 2 ? ' flag-reveal-particle--white' : ''}`}
                    style={{ '--x': `${x}px`, '--y': `${y}px`, '--size': '20px', '--twinkle-delay': `calc(var(--landed) + ${400 + index * 260}ms)` }}
                  />
                ))}
            </>
          )}
        </div>

        <div className="flag-reveal-texts">
          <span className="flag-reveal-chip">
            {rarity === 'legendary' && <span aria-hidden="true">★</span>}
            {rarityLabel}
          </span>
          {!item.replay && <span className="flag-reveal-new">{t('collection.new_flag')}</span>}
          <h2 id="flag-reveal-name" className="flag-reveal-name">{name}</h2>
          {item.count != null && <small>{t('collection.progress', { count: item.count, total: FLAG_POOL.length })}</small>}
        </div>

        {ready && (
          <div className="flag-reveal-buttons">
            {!item.replay && onView && (
              <button type="button" className="flag-reveal-view" onClick={() => leave(onView)}>
                {t('collection.view_collection')}
              </button>
            )}
            <button type="button" className="flag-reveal-continue" ref={continueRef} onClick={() => leave(onNext)}>
              {t('collection.tap_to_continue')}
            </button>
          </div>
        )}
        {onSkip && (
          <button type="button" className="flag-reveal-continue" onClick={onSkip}>
            {t('collection.skip_remaining')}
          </button>
        )}
      </div>
      <div className="flag-reveal-sr" aria-live="polite">{announcement}</div>
    </div>
  )
}

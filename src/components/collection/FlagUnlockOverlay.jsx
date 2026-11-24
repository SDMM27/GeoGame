// Full-screen reward when the server unlocks flags: the flag's pieces fly together, a burst in
// the rarity color, then the name and a shortcut to the collection. Several flags play one after another.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../auth'
import { useFlagRevealQueue } from '../../hooks/useFlagRevealQueue'
import { onXpClaimed } from '../../utils/xp'
import { pieceGrid, piecesFor } from '../../utils/flagCollection'
import { FLAG_POOL } from '../../utils/flagCollectionData'
import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COLOR } from '../../data/historicalFlags'
import { getCountryName } from '../../utils/getCountryName'
import { onLeagueFlagReveal } from '../../utils/leagueFlagReveal'
import { flagsAfter, pieceStyle, rarityColor, rarityOf } from './claim'
import { setFlagOverlayOpen } from './busy'
import { onReplayFlag } from './replay'
import ArchiveSigil from './ArchiveSigil'
import { ARCHIVE_CRACK, ARCHIVE_CRACK_DURATION, ARCHIVE_DETAILS, ARCHIVE_IMPACT, ARCHIVE_MOTES, ARCHIVE_OPEN_DURATION, ARCHIVE_PACK_INTRO, ARCHIVE_SHEEN, ARCHIVE_SPARKS } from './historicalFlagSparks'
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
  useLayoutEffect(() => {
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
  const rarity = rarityOf(item.iso)
  const color = historical ? HISTORICAL_FLAG_COLOR : rarityColor(rarity)
  const cost = piecesFor(rarity)
  const { cols, rows } = pieceGrid(cost)
  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const name = historical?.name[language] ?? (getCountryName(item.iso, i18n.language) || item.iso)
  const rarityLabel = t(historical ? 'collection.historical.title' : `collection.rarity.${rarity}`)
  const imageUrl = historical ? `/flags/historical/${item.iso}.png` : `/flags/${item.iso.toLowerCase()}.png`
  const intro = historical && !reduced ? ARCHIVE_PACK_INTRO : 0
  const [revealStage, setRevealStage] = useState(0)
  const artworkVisible = !intro || revealStage >= 1
  const identityVisible = !intro || revealStage >= 2
  const visibleName = identityVisible ? name : t('collection.historical.current')
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const exitTimer = useRef(null)
  const [announcement, setAnnouncement] = useState('')
  const continueRef = useRef(null)
  // Where each piece flies in from
  const [scatter] = useState(() =>
    Array.from({ length: historical ? 0 : cost }, () => ({ x: (Math.random() * 2 - 1) * 180, y: (Math.random() * 2 - 1) * 260, rotation: (Math.random() * 2 - 1) * 45 }))
  )
  const [particles] = useState(() => {
    const total = historical ? 0 : BURST_COUNT[rarity]
    return Array.from({ length: total }, (_, index) => {
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const dist = 120 + Math.random() * 110
      return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 5 + Math.random() * 5, sparkle: index % 2 === 0, white: index % 3 === 0 }
    })
  })

  // Moment the last piece has landed
  const landed = reduced ? 0 : historical ? intro + ARCHIVE_DETAILS : START + (cost - 1) * STAGGER + FLIGHT
  const canClose = ready || Boolean(historical && item.replay)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), historical ? landed + (intro ? 240 : 0) : landed + 700)
    return () => clearTimeout(timer)
  }, [historical, intro, landed])
  useEffect(() => {
    if (!intro) return undefined
    const artwork = setTimeout(() => setRevealStage(1), intro + ARCHIVE_CRACK)
    const identity = setTimeout(() => setRevealStage(2), intro + ARCHIVE_DETAILS)
    return () => {
      clearTimeout(artwork)
      clearTimeout(identity)
    }
  }, [intro])
  useEffect(() => {
    if (identityVisible) setAnnouncement(`${name} – ${rarityLabel}`)
  }, [identityVisible, name, rarityLabel])
  useEffect(() => {
    if (canClose) continueRef.current?.focus({ preventScroll: true })
  }, [canClose])

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  const leave = (next) => {
    if (!canClose || exitTimer.current !== null) return
    setLeaving(true)
    exitTimer.current = setTimeout(next, EXIT)
  }
  useEffect(() => {
    if (!canClose) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') leave(onNext)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const className = `flag-reveal flag-reveal--${historical ? 'historical' : rarity}${reduced ? ' flag-reveal--reduced' : ''}${leaving ? ' flag-reveal--leaving' : ''}`
  const vars = { '--rarity': color, '--landed': `${landed}ms`, '--archive-intro': `${intro}ms`, '--start': `${START}ms`, '--stagger': `${STAGGER}ms`, '--flight': `${FLIGHT}ms`, '--rays': RAY_OPACITY[rarity] }
  if (historical) Object.assign(vars, {
    '--archive-crack': `${intro + ARCHIVE_CRACK}ms`,
    '--archive-crack-duration': `${ARCHIVE_CRACK_DURATION}ms`,
    '--archive-impact': `${intro + ARCHIVE_IMPACT}ms`,
    '--archive-open-duration': `${ARCHIVE_OPEN_DURATION}ms`,
    '--archive-sheen': `${intro + ARCHIVE_SHEEN}ms`,
  })
  return (
    <div className={className} style={vars} role="dialog" aria-modal="true" aria-labelledby="flag-reveal-name">
      <div className="flag-reveal-backdrop" onClick={() => leave(onNext)} />
      {intro > 0 && (
        <>
          <div className="flag-reveal-bar flag-reveal-bar--top" aria-hidden="true" />
          <div className="flag-reveal-bar flag-reveal-bar--bottom" aria-hidden="true" />
        <div className="flag-reveal-tunnel" aria-hidden="true">
          <div className="flag-reveal-runway" />
          {[0, 1, 2, 3, 4].map((index) => <span key={index} className="flag-reveal-portal" style={{ '--portal-delay': `${index * 180}ms` }} />)}
          {ARCHIVE_MOTES.map(({ x, y, dx, dy, delay, size }, index) => (
            <span key={index} className="flag-reveal-mote" style={{
              left: `${x}%`, top: `${y}%`, '--mote-x': `${dx}px`, '--mote-y': `${dy}px`,
              '--mote-delay': `${delay}ms`, '--mote-size': `${size}px`,
            }} />
          ))}
          <div className="flag-reveal-seal">
            <ArchiveSigil className="flag-reveal-seal-sigil" />
            <span className="flag-reveal-seal-ring" />
          </div>
        </div>
        </>
      )}
      <div className="flag-reveal-content">
        {historical ? <HistoricalFlagStage imageUrl={artworkVisible ? imageUrl : null} reduced={reduced} /> : (
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

        )}
        <div className="flag-reveal-texts">
          <span className="flag-reveal-chip">
            {!historical && rarity === 'legendary' && <span aria-hidden="true">★</span>}
            {rarityLabel}
          </span>
          {!item.replay && <span className="flag-reveal-new">{t('collection.new_flag')}</span>}
          {/* The letters are always in the layout (invisible until the reveal, animated by their own
              keyframes), so the heading keeps its final height from the start and the frame never shifts. */}
          <h2 id="flag-reveal-name" className="flag-reveal-name">
            {historical && <span className="flag-reveal-sr">{!identityVisible ? t('collection.historical.current') : name}</span>}
            {historical ? (
              <>
                <span aria-hidden="true">
                  {Array.from(name).map((letter, index) => (
                    <span key={index} className="flag-reveal-letter" style={{ '--letter-delay': `${index * 45}ms` }}>
                      {letter === ' ' ? ' ' : letter}
                    </span>
                  ))}
                </span>
                {!identityVisible && <span className="flag-reveal-name-placeholder" aria-hidden="true">{t('collection.historical.current')}</span>}
              </>
            ) : visibleName}
          </h2>
          {historical && (
            // Always in the layout (hidden until revealed) so the frame never shifts when the details appear.
            <div className="flag-reveal-history">
              <div style={{ visibility: identityVisible ? 'visible' : 'hidden' }}>
                <span className="flag-reveal-period">{historical.years}</span>
                <p>{historical.description[language]}</p>
                <div className="flag-reveal-sources">
                  {historical.source && <a href={historical.source} target="_blank" rel="noreferrer">{t('collection.historical.source')}</a>}
                  {historical.artwork && <a href={historical.artwork.url} target="_blank" rel="noreferrer">{historical.artwork.credit}</a>}
                </div>
              </div>
            </div>
          )}
          {item.count != null && <small>{t('collection.progress', { count: item.count, total: FLAG_POOL.length })}</small>}
        </div>

        {/* Reserved from the start (hidden until ready) so the frame never shifts when the buttons appear. */}
        <div className={`flag-reveal-buttons${canClose ? ' flag-reveal-buttons--ready' : ''}`}>
          {!item.replay && onView && (
            <button type="button" className="flag-reveal-view" onClick={() => leave(onView)}>
              {t('collection.view_collection')}
            </button>
          )}
          <button type="button" className="flag-reveal-continue" ref={continueRef} onClick={() => leave(onNext)}>
            {t(historical && item.replay ? 'collection.historical.close_details' : 'collection.tap_to_continue')}
          </button>
        </div>
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

function HistoricalFlagStage({ imageUrl, reduced }) {
  return (
    <div className="flag-reveal-stage flag-reveal-archive" aria-hidden="true">
      <div className="flag-reveal-archive-frame">
        <div className="flag-reveal-archive-window">
          {imageUrl && <img src={imageUrl} alt="" />}
          {!reduced && <span className="flag-reveal-archive-beam" />}
          <span className="flag-reveal-shutter flag-reveal-shutter--left">
            <span className="flag-reveal-shutter-sigil flag-reveal-shutter-sigil--left"><ArchiveSigil /></span>
          </span>
          <span className="flag-reveal-shutter flag-reveal-shutter--right">
            <span className="flag-reveal-shutter-sigil flag-reveal-shutter-sigil--right"><ArchiveSigil /></span>
          </span>
          {!reduced && <>
            <span className="flag-reveal-archive-flare" />
            <span className="flag-reveal-archive-sheen" />
            <span className="flag-reveal-archive-dust flag-reveal-archive-dust--1" />
            <span className="flag-reveal-archive-dust flag-reveal-archive-dust--2" />
            <span className="flag-reveal-archive-dust flag-reveal-archive-dust--3" />
          </>}
        </div>
      </div>
      {!reduced && (
        <div className="flag-reveal-archive-sparks">
          {ARCHIVE_SPARKS.map(({ x, y, dx, dy, delay, duration, length, angle, color }, index) => (
            <span key={index} className={`flag-reveal-archive-spark${length <= 4 ? ' flag-reveal-archive-spark--ember' : ''}`} style={{
              left: `${x}%`,
              top: `${y}%`,
              '--spark-x': `${dx}px`,
              '--spark-y': `${dy}px`,
              '--spark-delay': `${delay}ms`,
              '--spark-duration': `${duration}ms`,
              '--spark-length': `${length}px`,
              '--spark-angle': `${angle}deg`,
              '--spark-color': color,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

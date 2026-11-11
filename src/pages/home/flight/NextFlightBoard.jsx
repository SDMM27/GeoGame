// Shown over the home globe when the player puts the city in the reticle: a departures-board flap swings down and its
// letters roll to the next flight, a daily not played today or else a game not played today (utils/nextFlight.js).
// `flight`: { game, title, daily } or null when every flight of the day was played.
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import FlapText from './FlapText'
import GameEmblem, { flightCode } from '../../../components/GameEmblem'

export default function NextFlightBoard({ flight, onBoard, onClose }) {
  const { t, i18n } = useTranslation()
  const upper = (text) => text.toLocaleUpperCase(i18n.resolvedLanguage)

  // Escape closes it, like the other overlays of the site
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const code = flight ? flightCode(flight.game) : ''
  return (
    <section className="next-flight" role="status" aria-live="polite" aria-label={t('home.next_departure')}>
      <div className="next-flight-head gg-mono">
        <span>{upper(t('home.next_departure'))}</span>
        {code && <span className="next-flight-code">{code}</span>}
        <button type="button" className="next-flight-close" onClick={onClose} aria-label={t('globe.close')}>
          <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>
      <div className="next-flight-body">
        {flight && <span className="next-flight-emblem"><GameEmblem game={flight.game} size={36} /></span>}
        <FlapText className="next-flight-title" text={upper(flight ? flight.title : t('globe.all_done'))} delay={260} duration={900} />
      </div>
      <div className="next-flight-foot">
        <span className="gg-mono next-flight-status">
          {flight && <span className="next-flight-dot" aria-hidden="true" />}
          {flight ? t(flight.daily ? 'globe.offer_daily' : 'globe.offer_game') : t('globe.all_done_hint')}
        </span>
        {flight && (
          <button type="button" className="next-flight-board sd-spring" onClick={() => onBoard(flight)}>
            {t('home.board')}
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}

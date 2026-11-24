import React, { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COLOR } from '../../data/historicalFlags'
import { HISTORICAL_FLAG_COST } from '../../utils/historicalFlagCollection'
import { replayFlag } from '../collection/replay'
import './HistoricalFlagAlbum.css'

export function HistoricalFlagAlbumView({ album, own }) {
  const { t, i18n } = useTranslation()
  const [selected, setSelected] = useState(null)
  const detailId = useId()
  const { state, select, busy, error } = album
  if (!state) {
    return own && error ? <p className="historical-album-error" role="alert">{t('collection.historical.load_error')}</p> : null
  }
  if (!own && state.unlocked.length === 0) return null

  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const cards = own ? HISTORICAL_FLAGS : HISTORICAL_FLAGS.filter(({ id }) => state.unlocked.includes(id))
  const card = cards.find(({ id }) => id === selected) ?? cards.find(({ id }) => id === state.active) ?? cards[0]
  const unlocked = state.unlocked.includes(card.id)
  const active = own && card.id === state.active
  const pieces = unlocked ? HISTORICAL_FLAG_COST : state.progress[card.id] ?? 0

  return (
      <section className="historical-album" style={{ '--historical-flag-color': HISTORICAL_FLAG_COLOR }}>
        <h3>{t('collection.historical.title')}</h3>
        {own && <p className="historical-album-hint">{t('collection.historical.hint', { total: HISTORICAL_FLAG_COST })}</p>}
        <ul className="historical-album-grid">
          {cards.map(({ id, name, years }) => {
            const complete = state.unlocked.includes(id)
            const targeted = own && id === state.active
            const count = complete ? HISTORICAL_FLAG_COST : state.progress[id] ?? 0
            return (
              <li key={id}>
                <button
                  type="button"
                  className="historical-album-card"
                  aria-pressed={card.id === id}
                  aria-controls={detailId}
                  data-targeted={targeted || undefined}
                  onClick={() => setSelected(id)}
                >
                  <img src={`/flags/historical/${id}.png`} alt="" className={complete ? undefined : 'historical-album-preview'} loading="lazy" />
                  <strong>{name[language]}</strong>
                  <span>{years}</span>
                  {own && <span className="historical-album-status">{targeted && `${t('collection.historical.active')} · `}{count}/{HISTORICAL_FLAG_COST}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <div id={detailId} className="historical-album-detail">
          <div className="historical-album-description">
            <div className="historical-album-detail-heading">
              <strong>{card.name[language]}</strong>
              <span>{card.years}</span>
            </div>
            <p>{card.description[language]}</p>
            {card.source && <a href={card.source} target="_blank" rel="noreferrer">{t('collection.historical.source')}</a>}
            {card.artwork && <a href={card.artwork.url} target="_blank" rel="noreferrer">{card.artwork.credit}</a>}
            {unlocked && <button type="button" className="flag-collection-toggle" onClick={() => replayFlag(card.id)}>{t('collection.replay_animation')}</button>}
          </div>
          {own && (
            <div className="historical-album-target">
              <span className="historical-album-count">
                {unlocked ? t('collection.historical.unlocked') : t('collection.pieces', { count: pieces, total: HISTORICAL_FLAG_COST })}
              </span>
              <div className="historical-album-pieces" aria-hidden="true">
                {Array.from({ length: HISTORICAL_FLAG_COST }, (_, index) => <i key={index} data-filled={index < pieces || undefined} />)}
              </div>
              {!unlocked && !active && (
                <button type="button" className="historical-album-select" disabled={busy} onClick={() => select(card.id)}>
                  {t(`collection.historical.${pieces > 0 ? 'resume' : 'select'}`)}
                </button>
              )}
              {active && <span className="historical-album-active">{t('collection.historical.next_fragments')}</span>}
            </div>
          )}
        </div>
        {own && state.active && (
          <button type="button" className="flag-collection-toggle" disabled={busy} onClick={() => select(null)}>
            {t('collection.historical.back_to_classic')}
          </button>
        )}
        {own && error && <p className="historical-album-error" role="alert">{t('collection.historical.error')}</p>}
      </section>
  )
}

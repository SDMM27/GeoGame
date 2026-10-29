// Flag collection of an account (own and public profile): the flag being rebuilt, the flags unlocked and the Légende
// progress. Rules and data: utils/flagCollection.js. Nothing while it loads.
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FLAG_POOL, fetchCollection } from '../../utils/flagCollectionData'
import { MASTERY_MODES, RARITIES, RARITY_COLORS, pieceGrid, piecesFor } from '../../utils/flagCollection'
import { getCountryName } from '../../utils/getCountryName'
import { replayFlag } from '../collection/replay'
import './FlagCollection.css'

const SHOWN_FIRST = 24

export function FlagCollectionView({ flags, mastery }) {
  const { t, i18n } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const total = FLAG_POOL.length
  const rarityOf = useMemo(() => new Map(FLAG_POOL.map((flag) => [flag.iso, flag.rarity])), [])

  // Rarest first, then by name.
  const sorted = useMemo(() => {
    const rank = (iso) => RARITIES.indexOf(rarityOf.get(iso))
    return flags.unlocked
      .map((iso) => ({ iso, name: getCountryName(iso, i18n.language) ?? iso }))
      .sort((a, b) => rank(b.iso) - rank(a.iso) || a.name.localeCompare(b.name, i18n.language))
  }, [flags.unlocked, rarityOf, i18n.language])
  const shown = showAll ? sorted : sorted.slice(0, SHOWN_FIRST)
  const counts = RARITIES.map((rarity) => ({ rarity, count: flags.unlocked.filter((iso) => rarityOf.get(iso) === rarity).length }))
  const complete = flags.unlocked.length >= total
  const cost = piecesFor(rarityOf.get(flags.current))
  const { cols, rows } = pieceGrid(cost)

  return (
    <section className="flag-collection">
      <div className="flag-collection-head">
        <h2>{t('collection.title')}</h2>
        <strong>{t('collection.progress', { count: flags.unlocked.length, total })}</strong>
      </div>
      <ul className="flag-collection-counts">
        {counts.map(({ rarity, count }) => (
          <li key={rarity} title={t(`collection.rarity.${rarity}`)}>
            <span className="flag-collection-dot" style={{ background: RARITY_COLORS[rarity] }} aria-hidden="true" />
            {count}
          </li>
        ))}
      </ul>

      {flags.current ? (
        <div className="flag-collection-current">
          <div className="flag-pieces" data-testid="flag-pieces">
            <img src={`/flags/${flags.current.toLowerCase()}.png`} alt="" />
            {Array.from({ length: cost }, (_, piece) => (
              <span
                key={piece}
                className={`flag-piece${piece < flags.pieces ? '' : ' flag-piece--hidden'}`}
                style={{ left: `${(piece % cols) * (100 / cols)}%`, top: `${Math.floor(piece / cols) * (100 / rows)}%`, width: `${100 / cols}%`, height: `${100 / rows}%` }}
              />
            ))}
          </div>
          <div className="flag-collection-current-text">
            <small>{t('collection.current')}</small>
            <strong>?</strong>
            <span>{t('collection.pieces', { count: flags.pieces, total: cost })}</span>
            <small className="flag-collection-hint">{t('collection.hint')}</small>
          </div>
        </div>
      ) : (
        <p className="flag-collection-note">{complete ? t('collection.complete') : t('collection.empty')}</p>
      )}

      {sorted.length > 0 && (
        <>
          <ul className="flag-collection-grid">
            {shown.map(({ iso, name }) => {
              const rarity = rarityOf.get(iso)
              return (
                <li key={iso} className="flag-collection-item" style={{ borderColor: RARITY_COLORS[rarity] }} title={`${name} · ${t(`collection.rarity.${rarity}`)}`}>
                  <button type="button" aria-label={`${name} · ${t(`collection.rarity.${rarity}`)}`} onClick={() => replayFlag(iso)}>
                    <img src={`/flags/${iso.toLowerCase()}.png`} alt="" loading="lazy" />
                  </button>
                </li>
              )
            })}
          </ul>
          {sorted.length > SHOWN_FIRST && (
            <button type="button" className="flag-collection-toggle" onClick={() => setShowAll((value) => !value)}>
              {showAll ? t('collection.show_less') : t('collection.show_all')}
            </button>
          )}
        </>
      )}

      {mastery && (
        <div className="flag-collection-legend">
          <strong>{t('collection.legend_progress', { count: mastery.found, total: mastery.total })}</strong>
          <ul>
            {MASTERY_MODES.map((mode) => (
              <li key={mode}>
                <span>{t(`collection.mode_${mode}`)}</span>
                <span>{mastery[mode].found} / {mastery[mode].total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function FlagCollection({ uid }) {
  const [collection, setCollection] = useState(null)

  useEffect(() => {
    let cancelled = false
    setCollection(null)
    fetchCollection(uid).then((result) => {
      if (!cancelled) setCollection(result)
    })
    return () => {
      cancelled = true
    }
  }, [uid])

  if (!collection) return null
  return <FlagCollectionView flags={collection.flags} mastery={collection.mastery} />
}

// Flag collection of an account (own and public profile): the flag being rebuilt, the flags unlocked and the Légende
// progress. Rules and data: utils/flagCollection.js. Nothing while it loads.
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FLAG_POOL, fetchCollection } from '../../utils/flagCollectionData'
import { MASTERY_MODES, RARITIES, RARITY_COLORS, pieceGrid, piecesFor } from '../../utils/flagCollection'
import { useHistoricalFlags } from '../../utils/historicalFlagCollectionData'
import { HISTORICAL_FLAGS, HISTORICAL_FLAG_COLOR, HISTORICAL_FLAG_COST } from '../../data/historicalFlags'
import { getCountryName } from '../../utils/getCountryName'
import { onPublicDataPatched } from '../../utils/publicProfile'
import { replayFlag } from '../collection/replay'
import CollapsibleSection from '../CollapsibleSection'
import { HistoricalPackStatus } from './HistoricalFlagAlbum'
import ArchiveSigil from '../collection/ArchiveSigil'
import './FlagCollection.css'

const SHOWN_FIRST = 24

export function FlagCollectionView({ flags, mastery, sectionId = 'collection', historicalAlbum, own = false }) {
  const { t, i18n } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('all')
  const total = FLAG_POOL.length
  const historicalCount = historicalAlbum?.state?.unlocked.length ?? 0
  const hasHistorical = historicalAlbum && (own || historicalCount > 0)
  const activeFilter = hasHistorical ? filter : 'all'
  const rarityOf = useMemo(() => new Map(FLAG_POOL.map((flag) => [flag.iso, flag.rarity])), [])

  // Rarest first, then by name.
  const sorted = useMemo(() => {
    const rank = (iso) => RARITIES.indexOf(rarityOf.get(iso))
    return flags.unlocked
      .map((iso) => ({ iso, name: getCountryName(iso, i18n.language) ?? iso }))
      .sort((a, b) => rank(b.iso) - rank(a.iso) || a.name.localeCompare(b.name, i18n.language))
  }, [flags.unlocked, rarityOf, i18n.language])
  const language = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const historicalTiles = HISTORICAL_FLAGS.filter(({ id }) => historicalAlbum?.state?.unlocked.includes(id))
  const tiles = [
    ...(activeFilter === 'classic' ? [] : historicalTiles.map((flag) => ({ iso: flag.id, name: flag.name[language], historical: flag }))),
    ...(activeFilter === 'historical' ? [] : sorted),
  ]
  const shown = showAll ? tiles : tiles.slice(0, SHOWN_FIRST)
  const historicalCurrent = own && historicalAlbum?.state?.active
  const current = historicalCurrent || flags.current
  const pieces = historicalCurrent ? historicalAlbum.state.progress[historicalCurrent] ?? 0 : flags.pieces
  const counts = RARITIES.map((rarity) => ({ rarity, count: flags.unlocked.filter((iso) => rarityOf.get(iso) === rarity).length }))
  const cost = historicalCurrent ? HISTORICAL_FLAG_COST : piecesFor(rarityOf.get(current))
  const { cols, rows } = historicalCurrent ? { cols: 5, rows: 2 } : pieceGrid(cost)

  const count = (activeFilter === 'historical' ? 0 : flags.unlocked.length) + (activeFilter === 'classic' ? 0 : historicalCount)
  const shownTotal = (activeFilter === 'historical' ? 0 : total) + (historicalAlbum && activeFilter !== 'classic' ? HISTORICAL_FLAGS.length : 0)
  const complete = flags.unlocked.length >= total && count >= shownTotal
  const summary = <strong className="flag-collection-progress">{t('collection.progress', { count, total: shownTotal })}</strong>

  return (
    <CollapsibleSection id={sectionId} title={t('collection.title')} summary={summary} defaultOpen>
      {hasHistorical && <div className="flag-collection-filters">
        {['all', 'classic', 'historical'].map((value) => (
          <button key={value} type="button" className="flag-collection-toggle" aria-pressed={activeFilter === value} onClick={() => setFilter(value)}>
            {value === 'historical' && <span className="flag-collection-dot" style={{ background: HISTORICAL_FLAG_COLOR }} aria-hidden="true" />}
            {t(value === 'historical' ? 'collection.historical.title' : `collection.filter_${value}`)}
          </button>
        ))}
      </div>}
      <div className="flag-collection">
        {own && historicalAlbum && <HistoricalPackStatus album={historicalAlbum} />}
        {current && (activeFilter === 'all' || (activeFilter === 'historical') === Boolean(historicalCurrent)) ? (
          <div className="flag-collection-current">
            <div className="flag-pieces" data-testid="flag-pieces">
              {!historicalCurrent && pieces > 0 && <img src={`/flags/${current.toLowerCase()}.png`} alt="" />}
              {Array.from({ length: cost }, (_, piece) => (
                <span
                  key={piece}
                  className={`flag-piece${piece < pieces ? (historicalCurrent ? ' flag-piece--historical' : '') : ' flag-piece--hidden'}`}
                  style={{ left: `${(piece % cols) * (100 / cols)}%`, top: `${Math.floor(piece / cols) * (100 / rows)}%`, width: `${100 / cols}%`, height: `${100 / rows}%` }}
                />
              ))}
            </div>
            <div className="flag-collection-current-text">
              <small>{t(historicalCurrent ? 'collection.historical.current' : 'collection.current')}</small>
              <strong aria-hidden="true">{historicalCurrent ? <ArchiveSigil className="flag-collection-sigil" /> : '⚑'}</strong>
              <span>{t('collection.pieces', { count: pieces, total: cost })}</span>
              {!historicalCurrent && <small className="flag-collection-hint">{t('collection.hint')}</small>}
            </div>
          </div>
        ) : complete || !tiles.length ? (
          <p className="flag-collection-note">{complete ? t('collection.complete') : t('collection.empty')}</p>
        ) : null}

        {tiles.length > 0 && (
          <>
            <ul className="flag-collection-counts">
              {activeFilter !== 'classic' && historicalTiles.length > 0 && <li><span className="flag-collection-dot" style={{ background: HISTORICAL_FLAG_COLOR }} />{t('collection.historical.title')} · {historicalCount}</li>}
              {activeFilter !== 'historical' && counts.map(({ rarity, count }) => (
                <li key={rarity}>
                  <span className="flag-collection-dot" style={{ background: RARITY_COLORS[rarity] }} aria-hidden="true" />
                  {t(`collection.rarity.${rarity}`)} · {count}
                </li>
              ))}
            </ul>
            <ul className="flag-collection-grid">
              {shown.map(({ iso, name, historical }) => {
                const rarity = rarityOf.get(iso)
                const label = `${name} · ${t(historical ? 'collection.historical.title' : `collection.rarity.${rarity}`)}`
                return (
                  <li key={iso} className="flag-collection-item" style={{ borderColor: historical ? HISTORICAL_FLAG_COLOR : RARITY_COLORS[rarity] }} title={label}>
                    <button type="button" aria-label={label} onClick={() => replayFlag(iso)}>
                      <img src={historical ? `/flags/historical/${iso}.png` : `/flags/${iso.toLowerCase()}.png`} alt="" loading="lazy" />
                    </button>
                  </li>
                )
              })}
            </ul>
            {tiles.length > SHOWN_FIRST && (
              <button type="button" className="flag-collection-toggle" onClick={() => setShowAll((value) => !value)}>
                {showAll ? t('collection.show_less') : t('collection.show_all')}
              </button>
            )}
          </>
        )}

        {mastery && activeFilter !== 'historical' && (
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
      </div>
    </CollapsibleSection>
  )
}

export default function FlagCollection({ uid, own = false }) {
  const [collection, setCollection] = useState(null)
  const historicalAlbum = useHistoricalFlags(uid)

  useEffect(() => {
    let cancelled = false
    setCollection(null)
    const load = () => fetchCollection(uid).then((result) => {
      if (!cancelled) setCollection(result)
    })
    load()
    const stop = onPublicDataPatched((patched) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  if (!collection) return null
  const sectionId = own ? 'own.collection' : 'player.collection'
  return (
    <FlagCollectionView key={uid} flags={collection.flags} mastery={collection.mastery} sectionId={sectionId} historicalAlbum={historicalAlbum} own={own} />
  )
}

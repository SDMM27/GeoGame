// The info sheet of a country in the atlas (see utils/countryInfo.js).
import React from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactNumber, formatNumber } from '../../utils/countryInfo'

const DIFFICULTY_COLORS = { Facile: '#4ade80', Moyen: '#fbbf24', Difficile: '#f97316', Impossible: '#ef4444' }

function Rank({ rank }) {
  const { t } = useTranslation()
  if (!rank) return null
  return <small className="atlas-rank">{t(rank.rank === 1 ? 'atlas.rank_first' : 'atlas.rank', rank)}</small>
}

function Fact({ label, value, rank }) {
  return (
    <div className="atlas-fact">
      <span className="atlas-fact-label">{label}</span>
      <strong className="atlas-fact-value">{value}</strong>
      <Rank rank={rank} />
    </div>
  )
}

export default function CountrySheet({ info, onSelect, onClose }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const unknown = t('atlas.unknown')
  const games = [
    ['placement', t('games.placement.title'), info.difficulty.placement],
    ['flags', t('games.flags.title'), info.difficulty.flags],
    ['capitals', t('games.capitals.title'), info.difficulty.capitals],
  ].filter(([, , level]) => level)

  return (
    <aside className="atlas-sheet" aria-label={info.name}>
      <header className="atlas-sheet-header">
        {info.iso && <img className="atlas-sheet-flag" src={`/flags/${info.iso.toLowerCase()}.png`} alt="" />}
        <div className="atlas-sheet-title">
          <h2>{info.name}</h2>
          {info.continent && <span>{t(`continents.${info.continent}`, info.continent)}</span>}
        </div>
        <button type="button" className="atlas-sheet-close" onClick={onClose} aria-label={t('atlas.close')}>✕</button>
      </header>

      <div className="atlas-facts">
        <Fact label={t('atlas.capital')} value={info.capital ?? unknown} />
        <Fact label={t('atlas.population')} value={info.population ? formatCompactNumber(info.population, lang) : unknown} rank={info.populationRank} />
        <Fact label={t('atlas.area')} value={info.areaKm2 ? `${formatNumber(info.areaKm2, lang)} km²` : unknown} rank={info.areaRank} />
        <Fact label={t('atlas.density')} value={info.density ? `${formatNumber(info.density, lang, info.density < 10 ? 1 : 0)} ${t('atlas.per_km2')}` : unknown} />
        <Fact label={t('atlas.gdp')} value={info.gdp ? t('atlas.billion_usd', { value: formatNumber(info.gdp, lang) }) : unknown} rank={info.gdpRank} />
        <Fact label={t('atlas.gdp_per_capita')} value={info.gdpPerCapita ? t('atlas.usd', { value: formatNumber(info.gdpPerCapita, lang) }) : unknown} />
      </div>

      <section className="atlas-section">
        <h3>{t('atlas.neighbors')}</h3>
        {info.neighbors.length === 0 ? (
          <p className="atlas-muted">{t('atlas.no_neighbors')}</p>
        ) : (
          <div className="atlas-chips">
            {info.neighbors.map((neighbor) => (
              <button key={neighbor.admin} type="button" className="atlas-chip" onClick={() => onSelect(neighbor.admin)}>
                <img src={`/flags/${neighbor.iso.toLowerCase()}.png`} alt="" />
                {neighbor.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {games.length > 0 && (
        <section className="atlas-section">
          <h3>{t('atlas.difficulty')}</h3>
          <ul className="atlas-difficulties">
            {games.map(([id, label, level]) => (
              <li key={id}>
                <span>{label}</span>
                <strong style={{ color: DIFFICULTY_COLORS[level] }}>{t(`difficulties.${level}`)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}

// The info sheet of the Country of the Day ("À retenir"): the atlas facts and ranks of the country, no text to read yet.
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatMetric } from '../../pages/atlas/formatMetric'

const FACTS = [
  ['population', 'atlas.population', 'populationRank', (info) => info.population],
  ['area', 'atlas.area', 'areaRank', (info) => info.areaKm2],
  ['density', 'atlas.density', 'densityRank', (info) => info.density],
  ['gdp', 'atlas.gdp', 'gdpRank', (info) => info.gdp],
  ['gdpPerCapita', 'atlas.gdp_per_capita', 'gdpPerCapitaRank', (info) => info.gdpPerCapita],
]

// `info`: getCountryInfo(feature, lang)
export default function CountryFactsSheet({ info }) {
  const { t, i18n } = useTranslation()
  const unknown = t('atlas.unknown')

  return (
    <section className="cod-sheet">
      <h3 className="cod-sheet__title">{t('country_of_day.sheet_title')}</h3>
      <header className="cod-sheet__header">
        {info.iso && <img className="cod-sheet__flag" src={`/flags/${info.iso.toLowerCase()}.png`} alt="" />}
        <div>
          <strong className="cod-sheet__name">{info.name}</strong>
          {info.continent && <span className="cod-sheet__continent">{t(`continents.${info.continent}`, info.continent)}</span>}
        </div>
      </header>

      <div className="cod-sheet__facts">
        <div className="cod-sheet__fact">
          <span>{t('atlas.capital')}</span>
          <strong>{info.capital ?? unknown}</strong>
        </div>
        {FACTS.map(([metric, label, rankKey, valueOf]) => {
          const value = valueOf(info)
          const rank = info[rankKey]
          return (
            <div key={metric} className="cod-sheet__fact">
              <span>{t(label)}</span>
              <strong>{value ? formatMetric(metric, value, t, i18n.language) : unknown}</strong>
              {rank && <small>{t(rank.rank === 1 ? 'atlas.rank_first' : 'atlas.rank', rank)}</small>}
            </div>
          )
        })}
      </div>

      <h4 className="cod-sheet__subtitle">{t('atlas.neighbors')}</h4>
      {info.neighbors.length === 0 ? (
        <p className="quiz-muted">{t('atlas.no_neighbors')}</p>
      ) : (
        <div className="cod-sheet__chips">
          {info.neighbors.map((neighbor) => (
            <span key={neighbor.admin} className="cod-sheet__chip">
              <img src={`/flags/${neighbor.iso.toLowerCase()}.png`} alt="" />
              {neighbor.name}
            </span>
          ))}
        </div>
      )}

      {info.iso && (
        <Link className="cod-sheet__atlas" to={`/atlas?country=${info.iso}`}>{t('country_of_day.see_atlas')}</Link>
      )}
    </section>
  )
}

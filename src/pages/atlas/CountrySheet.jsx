// The info sheet of a country in the atlas (see utils/countryInfo.js).
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import countryHistory from '../../data/countryHistory.json'
import { HISTORY_COUNTRIES } from '../../utils/quizQuestions'
import { formatMetric } from './formatMetric'

const DIFFICULTY_COLORS = { Facile: '#4ade80', Moyen: '#fbbf24', Difficile: '#f97316', Impossible: '#ef4444' }

function Rank({ rank, onClick }) {
  const { t } = useTranslation()
  if (!rank) return null
  return (
    <button type="button" className="atlas-rank" onClick={onClick} title={t('atlas.see_ranking')}>
      {t(rank.rank === 1 ? 'atlas.rank_first' : 'atlas.rank', rank)}
    </button>
  )
}

function Fact({ label, value, rank, onRanking }) {
  return (
    <div className="atlas-fact">
      <span className="atlas-fact-label">{label}</span>
      <strong className="atlas-fact-value">{value}</strong>
      <Rank rank={rank} onClick={onRanking} />
    </div>
  )
}

export default function CountrySheet({ info, onSelect, onClose, onRanking, onBack }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const unknown = t('atlas.unknown')
  const games = [
    ['placement', t('games.placement.title'), info.difficulty.placement],
    ['flags', t('games.flags.title'), info.difficulty.flags],
    ['capitals', t('games.capitals.title'), info.difficulty.capitals],
  ].filter(([, , level]) => level)
  const timeline = info.iso ? countryHistory[info.iso] ?? [] : []
  const hasHistoryQuiz = HISTORY_COUNTRIES.includes(info.iso)

  return (
    <aside className="atlas-sheet" aria-label={info.name}>
      {onBack && (
        <button type="button" className="atlas-back" onClick={onBack}>{t('atlas.back_to_ranking')}</button>
      )}
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
        <Fact label={t('atlas.population')} value={info.population ? formatMetric('population', info.population, t, lang) : unknown} rank={info.populationRank} onRanking={() => onRanking('population')} />
        <Fact label={t('atlas.area')} value={info.areaKm2 ? formatMetric('area', info.areaKm2, t, lang) : unknown} rank={info.areaRank} onRanking={() => onRanking('area')} />
        <Fact label={t('atlas.density')} value={info.density ? formatMetric('density', info.density, t, lang) : unknown} rank={info.densityRank} onRanking={() => onRanking('density')} />
        <Fact label={t('atlas.gdp')} value={info.gdp ? formatMetric('gdp', info.gdp, t, lang) : unknown} rank={info.gdpRank} onRanking={() => onRanking('gdp')} />
        <Fact label={t('atlas.gdp_per_capita')} value={info.gdpPerCapita ? formatMetric('gdpPerCapita', info.gdpPerCapita, t, lang) : unknown} rank={info.gdpPerCapitaRank} onRanking={() => onRanking('gdpPerCapita')} />
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

      {(timeline.length > 0 || hasHistoryQuiz) && (
        <section className="atlas-section">
          <h3>{t('atlas.history')}</h3>
          {timeline.length > 0 && (
            <ol className="atlas-timeline">
              {timeline.map((event) => (
                <li key={event.year}>
                  <strong>{event.year}</strong>
                  <span>{event.text[lang] ?? event.text.en}</span>
                </li>
              ))}
            </ol>
          )}
          {hasHistoryQuiz && (
            <Link className="atlas-quiz-link" to={`/quiz?mode=infinite&theme=history&country=${info.iso}`}>
              {t('atlas.history_quiz')}
            </Link>
          )}
        </section>
      )}

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

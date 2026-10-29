// Ranking of all the atlas countries by a metric, shown in the sheet's slot (see formatMetric.js).
import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getAtlasRanking } from '../../utils/countryInfo'
import { formatMetric, METRIC_LABEL_KEYS, RANKING_METRICS } from './formatMetric'

export default function RankingPanel({ metric, onMetric, selected, onSelect, onClose }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const rows = useMemo(() => getAtlasRanking(metric, lang), [metric, lang])
  const selectedRef = useRef(null)

  // Bring the highlighted country into view when the panel opens or the metric changes
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' })
  }, [metric]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="atlas-sheet atlas-ranking" aria-label={t('atlas.rankings')}>
      <header className="atlas-ranking-header">
        <h2>🏆 {t('atlas.rankings')}</h2>
        <button type="button" className="atlas-sheet-close" onClick={onClose} aria-label={t('atlas.close')}>✕</button>
      </header>

      <div className="atlas-ranking-tabs" role="tablist">
        {RANKING_METRICS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === metric}
            className={`atlas-ranking-tab${id === metric ? ' active' : ''}`}
            onClick={() => onMetric(id)}
          >
            {t(METRIC_LABEL_KEYS[id])}
          </button>
        ))}
      </div>

      <ol className="atlas-ranking-list">
        {rows.map((row) => (
          <li key={row.admin}>
            <button
              type="button"
              ref={row.admin === selected ? selectedRef : undefined}
              className={`atlas-ranking-row${row.admin === selected ? ' selected' : ''}`}
              onClick={() => onSelect(row.admin)}
            >
              <span className={`atlas-ranking-rank${row.rank <= 3 ? ` top${row.rank}` : ''}`}>{row.rank}</span>
              <img src={`/flags/${row.iso.toLowerCase()}.png`} alt="" loading="lazy" />
              <span className="atlas-ranking-name">{row.name}</span>
              <span className="atlas-ranking-value">{formatMetric(metric, row.value, t, lang)}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  )
}

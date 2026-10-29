// Display of an atlas metric value (country sheet and rankings), see utils/countryInfo.js
import { formatCompactNumber, formatNumber } from '../../utils/countryInfo'

export const RANKING_METRICS = ['population', 'area', 'gdp', 'gdpPerCapita', 'density']

// Translation key of each metric's label
export const METRIC_LABEL_KEYS = {
  population: 'atlas.population',
  area: 'atlas.area',
  gdp: 'atlas.gdp',
  gdpPerCapita: 'atlas.gdp_per_capita',
  density: 'atlas.density',
}

export function formatMetric(metric, value, t, lang) {
  switch (metric) {
    case 'population': return formatCompactNumber(value, lang)
    case 'area': return `${formatNumber(value, lang)} km²`
    case 'gdp': return t('atlas.billion_usd', { value: formatNumber(value, lang) })
    case 'gdpPerCapita': return t('atlas.usd', { value: formatNumber(value, lang) })
    case 'density': return `${formatNumber(value, lang, value < 10 ? 1 : 0)} ${t('atlas.per_km2')}`
    default: return ''
  }
}

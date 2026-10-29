// How an atlas metric's value is written, in the country sheet's facts and in the rankings.
import type { TFunction } from 'i18next'

import { formatCompactNumber, formatNumber } from '@shared/utils/countryInfo'

export type Metric = 'population' | 'area' | 'gdp' | 'gdpPerCapita' | 'density'

export const METRICS: Metric[] = ['population', 'area', 'gdp', 'gdpPerCapita', 'density']

// Translation key of each metric's label
export const METRIC_LABEL_KEYS: Record<Metric, string> = {
  population: 'atlas.population',
  area: 'atlas.area',
  gdp: 'atlas.gdp',
  gdpPerCapita: 'atlas.gdp_per_capita',
  density: 'atlas.density',
}

export function formatMetric(metric: Metric, value: number, t: TFunction, lang: string): string {
  switch (metric) {
    case 'population':
      return formatCompactNumber(value, lang)
    case 'area':
      return `${formatNumber(value, lang)} km²`
    case 'density':
      return `${formatNumber(value, lang, value < 10 ? 1 : 0)} ${t('atlas.per_km2')}`
    case 'gdp':
      return t('atlas.billion_usd', { value: formatNumber(value, lang) })
    case 'gdpPerCapita':
      return t('atlas.usd', { value: formatNumber(value, lang) })
  }
}

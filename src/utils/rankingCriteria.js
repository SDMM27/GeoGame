// src/utils/rankingCriteria.js
// Criteria definitions for the Ranking game.
// Each criterion has: key, label, consigne, unit, compute(country, areaMap), format(value, lang).
// label and consigne are the French texts; the pages show ranking.<key> and ranking.instruction_<key> instead.
import { localeOf, toLanguage } from '../i18n/languages.js'

const BILLION = { fr: 'Md', en: 'B', es: 'mil M', pt: 'bi', de: 'Mrd.', it: 'Mld', ru: 'млрд' }
const MILLION = { fr: 'M', en: 'M', es: 'M', pt: 'mi', de: 'Mio.', it: 'Mln', ru: 'млн' }
const GDP = {
  fr: (n) => `${n} Mrd $`,
  en: (n) => `$${n}B`,
  es: (n) => `${n} mil M$`,
  pt: (n) => `US$ ${n} bi`,
  de: (n) => `${n} Mrd. $`,
  it: (n) => `${n} Mld $`,
  ru: (n) => `${n} млрд $`,
}

// French when the language is missing or unknown (the old behaviour)
const languageOf = (lang) => toLanguage(lang, 'fr')
const number = (value, lang, options) => value.toLocaleString(localeOf(lang), options)

export const CRITERIA = {
  population: {
    key: 'population',
    label: 'Population',
    consigne: 'Classe du plus peuplé au moins peuplé',
    unit: 'hab',
    compute: (country) => {
      const v = country.properties.population
      return v != null && v > 0 ? v : null
    },
    format: (value, lang) => {
      const code = languageOf(lang)
      if (value >= 1e9) return `${number(value / 1e9, code, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${BILLION[code]}`
      if (value >= 1e6) return `${number(Math.round(value / 1e6), code)} ${MILLION[code]}`
      return number(value, code)
    },
  },

  area: {
    key: 'area',
    label: 'Superficie',
    consigne: 'Classe du plus grand au moins grand',
    unit: 'km²',
    compute: (country, areaMap) => {
      const v = areaMap?.get(country.properties.ADMIN)
      return v != null && v > 0 ? v : null
    },
    format: (value, lang) => `${number(Math.round(value), languageOf(lang))} km²`,
  },

  gdp: {
    key: 'gdp',
    label: 'PIB',
    consigne: 'Classe du plus riche au moins riche',
    unit: 'Mrd $',
    compute: (country) => {
      const v = country.properties.gdp
      return v != null && v > 0 ? v : null
    },
    format: (value, lang) => {
      const code = languageOf(lang)
      return GDP[code](number(value, code))
    },
  },
}

export const CRITERIA_KEYS = Object.keys(CRITERIA)

/**
 * Filters a country array to those with a valid (non-null, > 0) value for the given criterion.
 */
export function buildCountryPool(countries, criterion, areaMap) {
  return countries.filter((country) => {
    const val = criterion.compute(country, areaMap)
    return val !== null && val > 0
  })
}

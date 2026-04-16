// src/utils/rankingCriteria.js
// Criteria definitions for the Ranking game.
// Each criterion has: key, label, consigne, unit, compute(country, areaMap), format(value).

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
    format: (value) => {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2).replace('.', ',')} Md`
      if (value >= 1e6) return `${Math.round(value / 1e6)} M`
      return value.toLocaleString('fr-FR')
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
    format: (value) => `${Math.round(value).toLocaleString('fr-FR')} km²`,
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
    format: (value) => `${value.toLocaleString('fr-FR')} Mrd $`,
  },

  density: {
    key: 'density',
    label: 'Densité',
    consigne: 'Classe du plus dense au moins dense',
    unit: 'hab/km²',
    compute: (country, areaMap) => {
      const area = areaMap?.get(country.properties.ADMIN)
      const pop = country.properties.population
      if (!area || !pop) return null
      return pop / area
    },
    format: (value) => `${Math.round(value).toLocaleString('fr-FR')} hab/km²`,
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

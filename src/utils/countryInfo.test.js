import { describe, expect, it } from 'vitest'
import { ATLAS_COUNTRIES, findAtlasCountry, getCountryInfo, searchAtlasCountries } from './countryInfo'

describe('getCountryInfo', () => {
  it('gathers what the data says about a country', () => {
    const france = getCountryInfo(findAtlasCountry('France'), 'fr')
    expect(france).toMatchObject({ admin: 'France', name: 'France', iso: 'FR', flag: '🇫🇷', continent: 'Europe', capital: 'Paris' })
    expect(france.population).toBeGreaterThan(60e6)
    expect(france.areaKm2).toBeGreaterThan(500000)
    expect(france.density).toBeCloseTo(france.population / france.areaKm2)
    expect(france.gdpPerCapita).toBeGreaterThan(10000)
    expect(france.neighbors.map((n) => n.iso)).toEqual(expect.arrayContaining(['ES', 'DE', 'BE', 'IT', 'CH']))
    expect(france.populationRank.rank).toBeLessThan(40)
    expect(france.populationRank.total).toBeLessThanOrEqual(ATLAS_COUNTRIES.length)
  })

  it('names things in the player language', () => {
    const germany = getCountryInfo(findAtlasCountry('Allemagne'), 'en')
    expect(germany.name).toBe('Germany')
    expect(germany.neighbors.some((n) => n.name === 'France')).toBe(true)
  })

  it('ranks the most populated country first', () => {
    const ranked = ATLAS_COUNTRIES.map((feature) => getCountryInfo(feature, 'fr')).filter((info) => info.populationRank?.rank === 1)
    expect(ranked).toHaveLength(1)
  })
})

describe('searchAtlasCountries', () => {
  it('finds countries by the start of a name in any language, then by a part of it', () => {
    expect(searchAtlasCountries('allem', 'fr')[0].properties.ADMIN).toBe('Allemagne')
    expect(searchAtlasCountries('germ', 'fr')[0].properties.ADMIN).toBe('Allemagne')
    expect(searchAtlasCountries('', 'fr')).toEqual([])
  })
})

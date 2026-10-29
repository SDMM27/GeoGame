import { describe, expect, it } from 'vitest'
import { ATLAS_COUNTRIES, findAtlasCountry, getAtlasRanking, getCountryInfo, getNeighbors, mainPartBounds, searchAtlasCountries } from './countryInfo'

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

describe('getAtlasRanking', () => {
  it('ranks the countries with a value, largest first, with the ranks of the info sheet', () => {
    for (const metric of ['population', 'area', 'gdp', 'gdpPerCapita', 'density']) {
      const ranking = getAtlasRanking(metric, 'fr')
      expect(ranking.length).toBeGreaterThan(150)
      expect(ranking.map((row) => row.rank)).toEqual(ranking.map((_, index) => index + 1))
      expect(ranking.every((row, index) => index === 0 || row.value <= ranking[index - 1].value)).toBe(true)
    }
    const france = getCountryInfo(findAtlasCountry('France'), 'fr')
    const row = getAtlasRanking('gdpPerCapita', 'fr').find((r) => r.admin === 'France')
    expect(france.gdpPerCapitaRank).toEqual({ rank: row.rank, total: getAtlasRanking('gdpPerCapita', 'fr').length })
    expect(getAtlasRanking('area', 'en')[0].name).toBe('Russia')
  })
})

describe('searchAtlasCountries', () => {
  it('finds countries by the start of a name in any language, then by a part of it', () => {
    expect(searchAtlasCountries('allem', 'fr')[0].properties.ADMIN).toBe('Allemagne')
    expect(searchAtlasCountries('germ', 'fr')[0].properties.ADMIN).toBe('Allemagne')
    expect(searchAtlasCountries('', 'fr')).toEqual([])
  })
})

describe('mainPartBounds', () => {
  it('frames the largest piece of land only', () => {
    const square = (lng, lat, size) => [[[lng, lat], [lng + size, lat], [lng + size, lat + size], [lng, lat + size], [lng, lat]]]
    const feature = { geometry: { type: 'MultiPolygon', coordinates: [square(-5, 42, 8), square(-54, 2, 1)] } }
    expect(mainPartBounds(feature)).toEqual([[42, -5], [50, 3]])
    expect(mainPartBounds({ geometry: null })).toBe(null)
  })
})

describe('getNeighbors', () => {
  it('lists the land neighbours by name, sorted', () => {
    const neighbors = getNeighbors(findAtlasCountry('France'), 'en')
    expect(neighbors.map((n) => n.iso)).toEqual(expect.arrayContaining(['ES', 'BE']))
    expect(neighbors.map((n) => n.name)).toEqual([...neighbors.map((n) => n.name)].sort((a, b) => a.localeCompare(b, 'en')))
  })

  it('is empty for an island', () => {
    expect(getNeighbors(findAtlasCountry('Japon'), 'fr')).toEqual([])
    expect(getNeighbors(null, 'fr')).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { CRITERIA, CRITERIA_KEYS, buildCountryPool } from './rankingCriteria'

const makeCountry = (overrides = {}) => ({
  properties: {
    ADMIN: 'TestCountry',
    ISO_A3: 'TST',
    ISO_A2: 'TS',
    population: 10_000_000,
    gdp: 500,
    ...overrides,
  },
  geometry: { type: 'Polygon', coordinates: [] },
})

describe('CRITERIA_KEYS', () => {
  it('contains exactly population, area, gdp', () => {
    expect(CRITERIA_KEYS).toEqual(expect.arrayContaining(['population', 'area', 'gdp']))
    expect(CRITERIA_KEYS).toHaveLength(3)
  })
})

describe('CRITERIA.population.compute', () => {
  it('returns the population property', () => {
    const country = makeCountry({ population: 67_000_000 })
    expect(CRITERIA.population.compute(country, new Map())).toBe(67_000_000)
  })

  it('returns null when population is missing', () => {
    const country = makeCountry({ population: undefined })
    expect(CRITERIA.population.compute(country, new Map())).toBeNull()
  })
})

describe('CRITERIA.gdp.compute', () => {
  it('returns the gdp property', () => {
    const country = makeCountry({ gdp: 2923 })
    expect(CRITERIA.gdp.compute(country, new Map())).toBe(2923)
  })

  it('returns null when gdp is null', () => {
    const country = makeCountry({ gdp: null })
    expect(CRITERIA.gdp.compute(country, new Map())).toBeNull()
  })
})

describe('CRITERIA.area.compute', () => {
  it('returns area from the areaMap', () => {
    const country = makeCountry({ ADMIN: 'France' })
    const areaMap = new Map([['France', 551695]])
    expect(CRITERIA.area.compute(country, areaMap)).toBe(551695)
  })

  it('returns null when country is not in areaMap', () => {
    const country = makeCountry({ ADMIN: 'Unknown' })
    expect(CRITERIA.area.compute(country, new Map())).toBeNull()
  })
})


describe('buildCountryPool', () => {
  it('excludes countries where compute returns null', () => {
    const countries = [
      makeCountry({ ADMIN: 'A', gdp: 100 }),
      makeCountry({ ADMIN: 'B', gdp: null }),
      makeCountry({ ADMIN: 'C', gdp: 50 }),
    ]
    const pool = buildCountryPool(countries, CRITERIA.gdp, new Map())
    expect(pool).toHaveLength(2)
    expect(pool.map((c) => c.properties.ADMIN)).toEqual(['A', 'C'])
  })

  it('excludes countries where compute returns 0', () => {
    const countries = [
      makeCountry({ population: 0 }),
      makeCountry({ population: 5_000_000 }),
    ]
    const pool = buildCountryPool(countries, CRITERIA.population, new Map())
    expect(pool).toHaveLength(1)
  })
})

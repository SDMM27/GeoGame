// @vitest-environment node
// vite.config.mjs aliases the imports of countriesWithDifficulty_FR.json to countries.meta.json,
// so the source is read with fs here, once.
import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { getCountryAreaKm2, getGeographicCenter } from '../src/utils/countryArea.js'

const HINT = 'Generated data is out of date: run `node scripts/build-geo-data.mjs` and commit src/data/countries.meta.json and countries.geo.json'
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))

const source = read('src/data/countriesWithDifficulty_FR.json').features
const meta = read('src/data/countries.meta.json').features
const geometries = read('src/data/countries.geo.json')

describe('generated geographic data', () => {
  it('lists the same countries, in the same order, with the same properties as the source', () => {
    expect(meta.length, HINT).toBe(source.length)
    expect(geometries.length, HINT).toBe(source.length)
    source.forEach((feature, index) => {
      const { areaKm2, center, ...properties } = meta[index].properties
      expect(properties, `${HINT} (${feature.properties.ADMIN})`).toEqual(feature.properties)
      expect(meta[index].geometry).toBeNull()
      expect(areaKm2, HINT).toBeTypeOf('number')
      expect(center, HINT).toHaveLength(2)
    })
  })

  it('has the area and centre of the full-resolution geometry', () => {
    source.forEach((feature, index) => {
      const { areaKm2, center } = meta[index].properties
      const { lat, lng } = getGeographicCenter(feature)
      expect(areaKm2, `${HINT} (${feature.properties.ADMIN})`).toBeCloseTo(getCountryAreaKm2(feature), 3)
      expect(center[0], HINT).toBeCloseTo(lng, 6)
      expect(center[1], HINT).toBeCloseTo(lat, 6)
    })
  })

  it('keeps every polygon of every country, with the source geometry type', () => {
    const count = (g) => (g.type === 'Polygon' ? 1 : g.coordinates.length)
    source.forEach((feature, index) => {
      expect(geometries[index].type, HINT).toBe(feature.geometry.type)
      expect(count(geometries[index]), `${HINT} (${feature.properties.ADMIN})`).toBe(count(feature.geometry))
    })
  })
})

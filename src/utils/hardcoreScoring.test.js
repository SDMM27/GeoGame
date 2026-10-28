import { describe, expect, it } from 'vitest'
import countries from '../data/countriesWithDifficulty_FR.json'
import geometries from '../data/countries.geo.json'
import {
  HARDCORE_MAX_POINTS,
  distanceToCountryKm,
  findTappedCountry,
  hardcorePoints,
  isInsideCountry,
  kmPerPixel,
  scoreHardcoreMapTap,
  scoreHardcoreTap,
} from './hardcoreScoring'

// The games get the geometries on load (src/data/countryGeometry.js); here, straight from the file.
const country = (name) => {
  const index = countries.features.findIndex((feature) => feature.properties.ADMIN === name)
  return { ...countries.features[index], geometry: geometries[index] }
}

const allCountries = countries.features.map((feature, index) => ({ ...feature, geometry: geometries[index] }))

describe('isInsideCountry', () => {
  it('finds a tap on the land of the country', () => {
    expect(isInsideCountry({ lat: 48.86, lng: 2.35 }, country('France'))).toBe(true)
    expect(isInsideCountry({ lat: 52.52, lng: 13.4 }, country('France'))).toBe(false)
  })

  it('handles multipolygons and taps on a world copy', () => {
    expect(isInsideCountry({ lat: 64.8, lng: -147.7 }, country('États-Unis'))).toBe(true)
    expect(isInsideCountry({ lat: 64.8, lng: -147.7 + 360 }, country('États-Unis'))).toBe(true)
  })
})

describe('distanceToCountryKm', () => {
  it('is 0 inside and the distance to the nearest edge outside', () => {
    expect(distanceToCountryKm({ lat: 48.86, lng: 2.35 }, country('France'))).toBe(0)
    // Berlin is roughly 550 km from the nearest French border (Lorraine)
    const berlin = distanceToCountryKm({ lat: 52.52, lng: 13.4 }, country('France'))
    expect(berlin).toBeGreaterThan(450)
    expect(berlin).toBeLessThan(750)
  })

  it('measures across the antimeridian', () => {
    // Fiji spans 180°: a tap at -179.9 near Taveuni is close whatever side the rings are on
    const fiji = country('Fidji')
    expect(distanceToCountryKm({ lat: -16.8, lng: -179.5 }, fiji)).toBeLessThan(150)
    expect(distanceToCountryKm({ lat: -16.8, lng: 180.5 }, fiji)).toBeLessThan(150)
  })

  it('is Infinity without geometry', () => {
    expect(distanceToCountryKm({ lat: 0, lng: 0 }, { properties: {} })).toBe(Infinity)
  })
})

describe('hardcorePoints', () => {
  it('gives the maximum inside and falls to 0 at 2000 km', () => {
    expect(hardcorePoints(0)).toBe(HARDCORE_MAX_POINTS)
    expect(hardcorePoints(0.1)).toBe(HARDCORE_MAX_POINTS - 1)
    expect(hardcorePoints(1000)).toBe(250)
    expect(hardcorePoints(2000)).toBe(0)
    expect(hardcorePoints(5000)).toBe(0)
    expect(hardcorePoints(Infinity)).toBe(0)
    expect(hardcorePoints(NaN)).toBe(0)
  })

  it('never rises with the distance', () => {
    let previous = Infinity
    for (let km = 0; km <= 2500; km += 50) {
      expect(hardcorePoints(km)).toBeLessThanOrEqual(previous)
      previous = hardcorePoints(km)
    }
  })
})

describe('scoreHardcoreTap', () => {
  it('sums up a tap', () => {
    expect(scoreHardcoreTap({ lat: 48.86, lng: 2.35 }, country('France'))).toEqual({ inside: true, distanceKm: 0, points: 1000 })
    const miss = scoreHardcoreTap({ lat: 52.52, lng: 13.4 }, country('France'))
    expect(miss.inside).toBe(false)
    expect(miss.points).toBeGreaterThan(0)
    expect(miss.points).toBeLessThan(1000)
  })
})

describe('kmPerPixel', () => {
  it('follows the Web Mercator scale', () => {
    expect(kmPerPixel(0, 0)).toBeCloseTo(156.5, 0)
    expect(kmPerPixel(0, 1)).toBeCloseTo(kmPerPixel(0, 0) / 2)
    expect(kmPerPixel(60, 0)).toBeCloseTo(kmPerPixel(0, 0) / 2)
  })
})

describe('findTappedCountry', () => {
  // A few km south of Malta, in the sea
  const offMalta = { lat: 35.75, lng: 14.45 }

  it('takes the land under the tap', () => {
    expect(findTappedCountry({ lat: 48.86, lng: 2.35 }, allCountries, 0)?.properties.ADMIN).toBe('France')
  })

  it('takes the nearest coast within the tolerance', () => {
    expect(findTappedCountry(offMalta, allCountries, 30)?.properties.ADMIN).toBe('Malte')
    expect(findTappedCountry(offMalta, allCountries, 1)).toBeNull()
  })

  it('finds nothing on the open sea', () => {
    expect(findTappedCountry({ lat: 30, lng: -40 }, allCountries, 50)).toBeNull()
  })
})

describe('scoreHardcoreMapTap', () => {
  const offMalta = { lat: 35.75, lng: 14.45 }

  it('counts a tap on the sea next to the target as inside', () => {
    expect(scoreHardcoreMapTap(offMalta, country('Malte'), allCountries, 6)).toEqual({ inside: true, distanceKm: 0, points: 1000 })
  })

  it('needs a closer tap when zoomed in', () => {
    expect(scoreHardcoreMapTap(offMalta, country('Malte'), allCountries, 12)).toBeNull()
  })

  it('scores a tap next to another country as a miss', () => {
    const result = scoreHardcoreMapTap(offMalta, country('Italie'), allCountries, 6)
    expect(result.inside).toBe(false)
    expect(result.points).toBeLessThan(1000)
  })

  it('scores a tap on the land of another country as a miss', () => {
    expect(scoreHardcoreMapTap({ lat: 52.52, lng: 13.4 }, country('France'), allCountries, 6).inside).toBe(false)
  })

  it('ignores a tap on the open sea', () => {
    expect(scoreHardcoreMapTap({ lat: 30, lng: -40 }, country('France'), allCountries, 3)).toBeNull()
  })
})

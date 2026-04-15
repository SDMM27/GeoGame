import { describe, it, expect } from 'vitest'
import { collectCoordinates, getRingAreaKm2, getCountryAreaKm2 } from './countryArea'

describe('collectCoordinates', () => {
  it('returns empty array for null geometry', () => {
    expect(collectCoordinates(null)).toEqual([])
  })

  it('wraps Polygon coordinates in an array', () => {
    const geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1]]] }
    expect(collectCoordinates(geometry)).toEqual([[[[0, 0], [1, 0], [1, 1]]]])
  })

  it('returns MultiPolygon coordinates as-is', () => {
    const coords = [
      [[[0, 0], [1, 0], [1, 1]]],
      [[[2, 2], [3, 2], [3, 3]]],
    ]
    const geometry = { type: 'MultiPolygon', coordinates: coords }
    expect(collectCoordinates(geometry)).toBe(coords)
  })
})

describe('getRingAreaKm2', () => {
  it('returns 0 for rings with fewer than 3 points', () => {
    expect(getRingAreaKm2([[0, 0], [1, 1]])).toBe(0)
    expect(getRingAreaKm2([])).toBe(0)
  })

  it('returns a positive area for a valid ring', () => {
    const ring = [[0, 0], [1, 0], [0.5, 1], [0, 0]]
    expect(getRingAreaKm2(ring)).toBeGreaterThan(0)
  })
})

describe('getCountryAreaKm2', () => {
  it('returns a positive area for a simple polygon country', () => {
    const country = {
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      },
    }
    expect(getCountryAreaKm2(country)).toBeGreaterThan(0)
  })
})

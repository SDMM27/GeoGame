import { describe, expect, it } from 'vitest'
import {
  getAdjustedPadding,
  getAdjustedZoom,
  getCountryMetrics,
  getFocusCountry,
  normalizeWrappedCountry,
  getViewportSettings,
} from './borderGuessMap'

function rectangle(minLng, minLat, maxLng, maxLat) {
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ]
}

describe('borderGuessMap', () => {
  it('focuses the dominant polygon for small fragmented islands', () => {
    const country = {
      type: 'Feature',
      properties: { ADMIN: 'Test Island' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [rectangle(-0.06, 0, 0.06, 0.08)],
          [rectangle(1.5, 0.01, 1.53, 0.03)],
        ],
      },
    }

    const focusCountry = getFocusCountry(country)

    expect(focusCountry.geometry.type).toBe('Polygon')
    expect(focusCountry).not.toBe(country)
  })

  it('keeps full geometry for archipelagos without a clear dominant polygon', () => {
    const country = {
      type: 'Feature',
      properties: { ADMIN: 'Wide Archipelago' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [rectangle(0, 0, 0.5, 0.4)],
          [rectangle(2, 0, 2.45, 0.35)],
        ],
      },
    }

    expect(getFocusCountry(country)).toBe(country)
  })

  it('unwraps countries crossing the antiméridien so bounds stay compact', () => {
    const country = {
      type: 'Feature',
      properties: { ADMIN: 'Wrapped Islands' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [rectangle(176, -40, 178, -38)],
          [rectangle(-177, -45, -175, -43)],
        ],
      },
    }

    const normalized = normalizeWrappedCountry(country)
    const metrics = getCountryMetrics(country)

    expect(normalized).not.toBe(country)
    expect(normalized.geometry.coordinates[1][0][0][0]).toBe(183)
    expect(metrics.lngSpan).toBeLessThan(10)
  })

  it('focuses the mainland for countries with far overseas territories like France', () => {
    const country = {
      type: 'Feature',
      properties: { ADMIN: 'France-like' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [rectangle(-61.6, 15.9, -61.2, 16.4)],
          [rectangle(55.2, -21.4, 55.9, -20.8)],
          [rectangle(-4.8, 42.3, 8.2, 51.1)],
        ],
      },
    }

    const focused = getFocusCountry(country)
    const metrics = getCountryMetrics(country)

    expect(focused).not.toBe(country)
    expect(focused.geometry.type).toBe('Polygon')
    expect(metrics.lngSpan).toBeLessThan(20)
  })

  it('caps zoom for very small focused countries to avoid over-zoom', () => {
    const zoom = getAdjustedZoom({
      maxSpan: 0.08,
      compactness: 0.7,
      isFragmented: true,
      isFocused: true,
    })

    expect(zoom).toBeLessThan(14.6)
    expect(zoom).toBeGreaterThan(11)
  })

  it('reduces padding for long thin countries so they can fill the frame better', () => {
    const compactPadding = getAdjustedPadding({
      maxSpan: 3,
      compactness: 0.7,
      isFragmented: false,
      isFocused: false,
    })
    const thinPadding = getAdjustedPadding({
      maxSpan: 3,
      compactness: 0.1,
      isFragmented: false,
      isFocused: false,
    })

    expect(thinPadding[0]).toBeLessThan(compactPadding[0])
  })

  it('returns coherent viewport settings from a country geometry', () => {
    const country = {
      type: 'Feature',
      properties: { ADMIN: 'Compact Country' },
      geometry: {
        type: 'Polygon',
        coordinates: [rectangle(10, 10, 10.6, 10.5)],
      },
    }

    const metrics = getCountryMetrics(country)
    const viewport = getViewportSettings(country)

    expect(metrics.maxSpan).toBeCloseTo(0.6, 5)
    expect(viewport.bounds.isValid()).toBe(true)
    expect(viewport.zoom).toBeGreaterThan(9)
    expect(viewport.padding[0]).toBeGreaterThanOrEqual(10)
  })
})

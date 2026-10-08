// src/utils/countryArea.js
// Shared area computation extracted from useCountryClueState.js

export const EARTH_RADIUS_KM = 6371

export function collectCoordinates(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
}

// True when the country has (or, for the metadata-only dataset, had) a geometry:
// the website loads the geometries separately, after the properties.
export function hasCountryGeometry(country) {
  return Boolean(country?.geometry?.coordinates?.length || country?.properties?.center)
}

export function getRingAreaKm2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0

  const referenceLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  const latScale = (Math.PI / 180) * EARTH_RADIUS_KM
  const lngScale = latScale * Math.cos((referenceLat * Math.PI) / 180)

  let area = 0
  for (let index = 0; index < ring.length; index += 1) {
    const [lng1, lat1] = ring[index]
    const [lng2, lat2] = ring[(index + 1) % ring.length]
    const x1 = lng1 * lngScale
    const y1 = lat1 * latScale
    const x2 = lng2 * lngScale
    const y2 = lat2 * latScale
    area += x1 * y2 - x2 * y1
  }

  return Math.abs(area / 2)
}

export function getCountryAreaKm2(country) {
  // Precomputed from full-resolution geometry for the mobile app
  if (country?.properties?.areaKm2 != null) return country.properties.areaKm2
  return collectCoordinates(country.geometry).reduce((totalArea, polygon) => {
    const [outerRing, ...holes] = polygon
    const outerArea = getRingAreaKm2(outerRing)
    const holesArea = holes.reduce((sum, ring) => sum + getRingAreaKm2(ring), 0)
    return totalArea + Math.max(outerArea - holesArea, 0)
  }, 0)
}

// Mean of all ring vertices on the unit sphere. Uses the precomputed `center`
// property when present (the mobile app ships simplified geometries).
export function getGeographicCenter(country) {
  const precomputed = country?.properties?.center
  if (precomputed) return { lat: precomputed[1], lng: precomputed[0] }

  const coordinates = collectCoordinates(country.geometry).flat(2)
  if (coordinates.length === 0) return { lat: 0, lng: 0 }

  let x = 0
  let y = 0
  let z = 0

  coordinates.forEach(([lng, lat]) => {
    const latRad = (lat * Math.PI) / 180
    const lngRad = (lng * Math.PI) / 180

    x += Math.cos(latRad) * Math.cos(lngRad)
    y += Math.cos(latRad) * Math.sin(lngRad)
    z += Math.sin(latRad)
  })

  const total = coordinates.length
  x /= total
  y /= total
  z /= total

  const lng = Math.atan2(y, x) * (180 / Math.PI)
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * (180 / Math.PI)

  return { lat, lng }
}

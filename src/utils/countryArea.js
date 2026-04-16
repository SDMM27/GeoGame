// src/utils/countryArea.js
// Shared area computation extracted from useCountryClueState.js

export const EARTH_RADIUS_KM = 6371

export function collectCoordinates(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
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
  return collectCoordinates(country.geometry).reduce((totalArea, polygon) => {
    const [outerRing, ...holes] = polygon
    const outerArea = getRingAreaKm2(outerRing)
    const holesArea = holes.reduce((sum, ring) => sum + getRingAreaKm2(ring), 0)
    return totalArea + Math.max(outerArea - holesArea, 0)
  }, 0)
}

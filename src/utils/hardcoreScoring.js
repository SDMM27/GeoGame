// Hardcore mode (docs/plan-fonctionnalites.md, step 7): find the country on a map without borders, one tap per country.
// A tap inside the country gives HARDCORE_MAX_POINTS; outside, the points fall with the distance to the country's
// nearest edge, down to 0 at HARDCORE_ZERO_KM. Pure: shared by the website, the app and scripts/scoreCaps.mjs.
import { EARTH_RADIUS_KM, collectCoordinates } from './countryArea.js'

export const HARDCORE_MAX_POINTS = 1000
export const HARDCORE_ZERO_KM = 2000

const RAD = Math.PI / 180

// A longitude moved by whole turns to within 180° of `reference` (taps on the map's left and right world copies).
const nearLng = (lng, reference) => lng - 360 * Math.round((lng - reference) / 360)

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * RAD
  const dLng = (lng2 - lng1) * RAD
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Ray casting on a ring of [lng, lat], the point's longitude already brought near the ring.
function inRing(lat, lng, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Inside a polygon (outer ring, then holes), trying the point's longitude and its copies one turn away.
function inPolygon(lat, lng, polygon) {
  const [outer, ...holes] = polygon
  return [lng, lng - 360, lng + 360].some(
    (x) => inRing(lat, x, outer) && !holes.some((hole) => inRing(lat, x, hole))
  )
}

// Distance from the point to the segment a-b ([lng, lat]), on a flat projection around the point: the nearest point
// is found there, the distance to it measured on the sphere.
function segmentKm(lat, lng, a, b) {
  const scale = Math.max(1e-9, Math.cos(lat * RAD))
  const ax = (nearLng(a[0], lng) - lng) * scale
  const ay = a[1] - lat
  const bx = (nearLng(b[0], ax / scale + lng) - lng) * scale
  const by = b[1] - lat
  const dx = bx - ax
  const dy = by - ay
  const length2 = dx * dx + dy * dy
  const t = length2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2)) : 0
  const x = ax + t * dx
  const y = ay + t * dy
  return haversineKm(lat, lng, lat + y, lng + x / scale)
}

/** Whether { lat, lng } is on the land of a country feature (GeoJSON Polygon or MultiPolygon). */
export function isInsideCountry({ lat, lng }, feature) {
  return collectCoordinates(feature?.geometry).some((polygon) => inPolygon(lat, lng, polygon))
}

/** Kilometres from { lat, lng } to a country feature: 0 inside, else to its nearest edge. Infinity without geometry. */
export function distanceToCountryKm(point, feature) {
  const polygons = collectCoordinates(feature?.geometry)
  if (polygons.length === 0) return Infinity
  if (isInsideCountry(point, feature)) return 0
  let best = Infinity
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (let i = 1; i < ring.length; i += 1) best = Math.min(best, segmentKm(point.lat, point.lng, ring[i - 1], ring[i]))
    }
  }
  return best
}

/** Points of a tap `distanceKm` away from the country: the maximum inside, then falling (quadratically) to 0. */
export function hardcorePoints(distanceKm) {
  if (!(distanceKm >= 0)) return 0
  if (distanceKm === 0) return HARDCORE_MAX_POINTS
  const left = Math.max(0, 1 - distanceKm / HARDCORE_ZERO_KM)
  // A tap just outside never ties with one inside.
  return Math.min(HARDCORE_MAX_POINTS - 1, Math.round(HARDCORE_MAX_POINTS * left * left))
}

/** One tap on the target country: { inside, distanceKm (rounded), points }. */
export function scoreHardcoreTap(point, feature) {
  const distanceKm = distanceToCountryKm(point, feature)
  return {
    inside: distanceKm === 0,
    distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm) : null,
    points: hardcorePoints(distanceKm),
  }
}

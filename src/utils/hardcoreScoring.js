// Hardcore mode (docs/plan-fonctionnalites.md, step 7): find the country on a map without borders, one tap per country.
// A tap inside the country gives HARDCORE_MAX_POINTS; outside, the points fall with the distance to the country's
// nearest edge, down to 0 at HARDCORE_ZERO_KM. A tap on the sea goes to the country with the nearest coast within
// HARDCORE_TAP_TOLERANCE_PX on screen (small islands need no pixel-perfect tap), and is ignored farther out.
// Pure: shared by the website, the app and scripts/scoreCaps.mjs.
import { EARTH_RADIUS_KM, collectCoordinates } from './countryArea.js'

export const HARDCORE_MAX_POINTS = 1000
export const HARDCORE_ZERO_KM = 2000
export const HARDCORE_TAP_TOLERANCE_PX = 16

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

// Bounding box of a polygon's outer ring, cached: [minLng, minLat, maxLng, maxLat].
const boxes = new WeakMap()
function polygonBox(polygon) {
  let box = boxes.get(polygon)
  if (!box) {
    box = [Infinity, Infinity, -Infinity, -Infinity]
    for (const [lng, lat] of polygon[0]) {
      box[0] = Math.min(box[0], lng)
      box[1] = Math.min(box[1], lat)
      box[2] = Math.max(box[2], lng)
      box[3] = Math.max(box[3], lat)
    }
    boxes.set(polygon, box)
  }
  return box
}

// Whether the polygon's box, widened by `maxKm`, can hold the point (or one of its copies one turn away).
function nearBox(lat, lng, polygon, maxKm) {
  const [minLng, minLat, maxLng, maxLat] = polygonBox(polygon)
  const latDeg = maxKm / (EARTH_RADIUS_KM * RAD)
  if (lat < minLat - latDeg || lat > maxLat + latDeg) return false
  const lngDeg = latDeg / Math.max(0.01, Math.cos(Math.min(89, Math.abs(lat) + latDeg) * RAD))
  return [lng, lng - 360, lng + 360].some((x) => x >= minLng - lngDeg && x <= maxLng + lngDeg)
}

// Kilometres from the point to the polygons' nearest edge, skipping those farther than `maxKm` (Infinity then).
function edgesKm(lat, lng, polygons, maxKm = Infinity) {
  let best = Infinity
  for (const polygon of polygons) {
    if (Number.isFinite(maxKm) && !nearBox(lat, lng, polygon, Math.min(best, maxKm))) continue
    for (const ring of polygon) {
      for (let i = 1; i < ring.length; i += 1) best = Math.min(best, segmentKm(lat, lng, ring[i - 1], ring[i]))
    }
  }
  return best
}

/** Kilometres from { lat, lng } to a country feature: 0 inside, else to its nearest edge. Infinity without geometry. */
export function distanceToCountryKm(point, feature) {
  const polygons = collectCoordinates(feature?.geometry)
  if (polygons.length === 0) return Infinity
  if (isInsideCountry(point, feature)) return 0
  return edgesKm(point.lat, point.lng, polygons)
}

/** Kilometres covered by one screen pixel at `lat` on a Web Mercator map at `zoom` (256 px tiles, as Leaflet). */
export function kmPerPixel(lat, zoom) {
  return (2 * Math.PI * EARTH_RADIUS_KM * Math.cos(lat * RAD)) / (256 * 2 ** zoom)
}

/**
 * The country a tap goes to: the one whose land holds it, else the one with the nearest coast within `toleranceKm`.
 * null on the open sea.
 */
export function findTappedCountry(point, features, toleranceKm) {
  const landed = features.find((feature) =>
    collectCoordinates(feature?.geometry).some(
      (polygon) => nearBox(point.lat, point.lng, polygon, 0) && inPolygon(point.lat, point.lng, polygon)
    )
  )
  if (landed) return landed
  let nearest = null
  let best = toleranceKm
  for (const feature of features) {
    const km = edgesKm(point.lat, point.lng, collectCoordinates(feature?.geometry), best)
    if (km <= best) {
      best = km
      nearest = feature
    }
  }
  return nearest
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

/**
 * One tap on a map at `zoom`, the target being `feature` among all the map's `features`: scored as scoreHardcoreTap,
 * a tap on the sea next to the target counting as inside. null for a tap on the open sea, which doesn't count.
 */
export function scoreHardcoreMapTap(point, feature, features, zoom) {
  const result = scoreHardcoreTap(point, feature)
  if (result.inside) return result
  const toleranceKm = Number.isFinite(zoom) ? HARDCORE_TAP_TOLERANCE_PX * kmPerPixel(point.lat, zoom) : 0
  const tapped = findTappedCountry(point, features, toleranceKm)
  if (!tapped) return null
  if (tapped.properties?.ADMIN === feature.properties?.ADMIN) return { inside: true, distanceKm: 0, points: HARDCORE_MAX_POINTS }
  return result
}

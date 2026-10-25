import { NON_CLICKABLE_MAP_AREAS } from './mapInteraction'

// Bounds for a country’s largest polygon, kept compact across the antimeridian.
function ringBounds(ring = []) {
  if (!ring.length) return null
  let longitudes = ring.map(([lng]) => lng)
  if (Math.max(...longitudes) - Math.min(...longitudes) > 180) {
    longitudes = longitudes.map((lng) => (lng < 0 ? lng + 360 : lng))
  }
  const latitudes = ring.map(([, lat]) => lat)
  const west = Math.min(...longitudes)
  const east = Math.max(...longitudes)
  const south = Math.min(...latitudes)
  const north = Math.max(...latitudes)
  return {
    span: Math.max(east - west, north - south),
    lat: (south + north) / 2,
    lng: (((west + east) / 2 + 540) % 360) - 180,
  }
}

export function getLargestLandmassBounds(geometry) {
  if (!geometry?.coordinates) return null
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  if (!polygons?.length) return null
  return polygons
    .map((polygon) => ringBounds(polygon?.[0]))
    .filter(Boolean)
    .reduce((largest, current) => (!largest || current.span > largest.span ? current : largest), null)
}

const SMALL_COUNTRY_SPAN = 2.5
const WORLD_COPY_OFFSETS = [-360, 0, 360]

export function getSmallCountryCircleDescriptors(features) {
  const circles = []
  for (const [index, feature] of features.entries()) {
    if (NON_CLICKABLE_MAP_AREAS.has(feature.properties.ADMIN)) continue
    let largest
    try {
      largest = getLargestLandmassBounds(feature.geometry)
    } catch {
      continue
    }
    if (!largest || largest.span >= SMALL_COUNTRY_SPAN) continue
    for (const offset of WORLD_COPY_OFFSETS) {
      circles.push({
        key: `${feature.properties.ADMIN}#${index}@${offset}`,
        name: feature.properties.ADMIN,
        center: [largest.lat, largest.lng + offset],
        zoomThreshold: Math.ceil(Math.log2(28 / Math.max(largest.span, 0.01))),
        radius: 8,
      })
    }
  }
  return circles
}

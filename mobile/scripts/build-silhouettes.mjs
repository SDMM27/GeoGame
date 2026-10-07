// Builds the country outlines used by Border Guess.
// The map dataset (build-countries.mjs) is simplified globally, which turns small
// countries into triangles. Here each country is simplified relative to its own size,
// so every silhouette keeps a recognizable shape.
// Source: ../src/data/countriesWithDifficulty_FR.json (full resolution, ~90 MB)
// Output: assets/data/silhouettes.json ({ [ADMIN]: Polygon | MultiPolygon })
//
// Usage: node scripts/build-silhouettes.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea } from 'd3-geo'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '..', 'src', 'data', 'countriesWithDifficulty_FR.json')
const out = join(root, 'assets', 'data', 'silhouettes.json')

// Tolerance as a fraction of the country's largest span: ~1/500 keeps coastlines readable.
const TOLERANCE_RATIO = 1 / 500
const PRECISION = 1e4

function squaredSegmentDistance([px, py], [ax, ay], [bx, by]) {
  let dx = bx - ax
  let dy = by - ay
  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    ax += t * dx
    ay += t * dy
  }
  dx = px - ax
  dy = py - ay
  return dx * dx + dy * dy
}

// Iterative Douglas-Peucker
function simplifyRing(ring, tolerance) {
  if (ring.length <= 4) return ring
  const sqTolerance = tolerance * tolerance
  const keep = new Uint8Array(ring.length)
  keep[0] = keep[ring.length - 1] = 1
  const stack = [[0, ring.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxDistance = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const distance = squaredSegmentDistance(ring[i], ring[first], ring[last])
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (maxDistance > sqTolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return ring.filter((_, i) => keep[i])
}

const round = ([lng, lat]) => [Math.round(lng * PRECISION) / PRECISION, Math.round(lat * PRECISION) / PRECISION]

function ringSpan(ring) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return Math.max(maxX - minX, maxY - minY)
}

function simplifyPolygon(polygon, tolerance) {
  const rings = polygon
    // Drop holes and islets smaller than the tolerance, invisible at this scale
    .filter((ring, index) => index === 0 || ringSpan(ring) > tolerance * 2)
    .map((ring) => simplifyRing(ring, tolerance).map(round))
    .filter((ring) => ring.length >= 4)
  if (!rings.length) return null
  // d3-geo expects clockwise outer rings (RFC 7946 GeoJSON is the opposite)
  if (geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach((ring) => ring.reverse())
  return rings
}

const data = JSON.parse(readFileSync(source, 'utf8'))
const silhouettes = {}

for (const { properties, geometry } of data.features) {
  if (!geometry || !properties?.ADMIN) continue
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  if (!polygons.length) continue
  const span = Math.max(...polygons.map((polygon) => ringSpan(polygon[0])))
  const tolerance = span * TOLERANCE_RATIO
  const simplified = polygons
    .filter((polygon) => ringSpan(polygon[0]) > tolerance * 2 || polygons.length === 1)
    .map((polygon) => simplifyPolygon(polygon, tolerance))
    .filter(Boolean)
  if (!simplified.length) continue
  silhouettes[properties.ADMIN] =
    simplified.length === 1 ? { type: 'Polygon', coordinates: simplified[0] } : { type: 'MultiPolygon', coordinates: simplified }
}

writeFileSync(out, JSON.stringify(silhouettes))
console.log(`Wrote ${Object.keys(silhouettes).length} silhouettes to ${out}`)

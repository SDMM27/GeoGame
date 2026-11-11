// The land of the home globe: every country of the app's dataset, simplified so the globe can re-project it on each frame
// (as flat unit vectors, see landData). Rings are Douglas-Peucker simplified in degrees (0.4 degree is ~1 px on a 340 px
// globe) and specks smaller than ~0.8 degree are dropped, which keeps ~10x fewer vertices than the full dataset.
import { geoArea } from 'd3-geo'
import type { Position } from 'geojson'

import { allCountries } from '@/components/map/geometry'

const TOLERANCE = 0.4
const MIN_EXTENT = 0.8

function simplifyRing(ring: Position[]): Position[] | null {
  const n = ring.length
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  if (Math.max(maxX - minX, maxY - minY) < MIN_EXTENT) return null
  if (n <= 4) return ring
  const keep = new Uint8Array(n)
  keep[0] = keep[n - 1] = 1
  const stack = [0, n - 1]
  const max2 = TOLERANCE * TOLERANCE
  while (stack.length) {
    const b = stack.pop()!
    const a = stack.pop()!
    const [ax, ay] = ring[a]
    const dx = ring[b][0] - ax, dy = ring[b][1] - ay
    const length2 = dx * dx + dy * dy
    let farthest = -1
    let distance2 = max2
    for (let i = a + 1; i < b; i++) {
      const px = ring[i][0] - ax, py = ring[i][1] - ay
      const t = length2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / length2)) : 0
      const ex = t * dx - px, ey = t * dy - py
      const d2 = ex * ex + ey * ey
      if (d2 > distance2) {
        distance2 = d2
        farthest = i
      }
    }
    if (farthest >= 0) {
      keep[farthest] = 1
      stack.push(a, farthest, farthest, b)
    }
  }
  const out = ring.filter((_, i) => keep[i])
  return out.length >= 4 ? out : null
}

export type LandPolygon = Position[][]

const toVector = (lon: number, lat: number): [number, number, number] => {
  const l = (lon * Math.PI) / 180
  const p = (lat * Math.PI) / 180
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]
}

// A bounding cap of a ring: unit vector of its center and sine of its angular radius (a little padded). A ring whose
// cap is entirely on the far side of the globe is skipped without looking at its vertices.
function capOf(ring: Position[]): [number, number, number, number] {
  let x = 0, y = 0, z = 0
  const vectors = ring.map(([lon, lat]) => toVector(lon, lat))
  for (const v of vectors) { x += v[0]; y += v[1]; z += v[2] }
  const length = Math.hypot(x, y, z)
  if (length < 1e-6) { x = 1; y = 0; z = 0 } else { x /= length; y /= length; z /= length }
  let minDot = 1
  for (const v of vectors) minDot = Math.min(minDot, x * v[0] + y * v[1] + z * v[2])
  const radius = Math.acos(Math.max(-1, Math.min(1, minDot)))
  // A cap of 90 degrees or more may reach anywhere: never culled
  return [x, y, z, radius >= Math.PI / 2 ? 1 : Math.sin(radius + 1e-3)]
}

let cached: LandPolygon[] | null = null

// The simplified polygons: [outer ring, ...holes], in [lon, lat] degrees
export function landPolygons(): LandPolygon[] {
  if (cached) return cached
  const polygons: LandPolygon[] = []
  for (const { geometry } of allCountries) {
    const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
    for (const part of parts) {
      const [outer, ...holes] = part
      const shell = simplifyRing(outer)
      if (!shell) continue
      // A thin island can simplify into a flat ring, which d3 reads as its complement: the whole sphere. Drop it.
      if (geoArea({ type: 'Polygon', coordinates: [shell] }) > 2 * Math.PI) continue
      polygons.push([shell, ...holes.map(simplifyRing).filter((ring): ring is Position[] => !!ring)])
    }
  }
  cached = polygons
  return polygons
}

// The land as flat typed arrays, ready for the UI thread: unit vectors (x, y, z) of every ring's vertices, where ring k
// is vertices [starts[k], starts[k + 1]), and the cap (x, y, z, sin radius) of ring k at caps[4k..4k+3].
export type LandData = { vertices: Float32Array; starts: Int32Array; caps: Float32Array }

export function landData(): LandData {
  const rings = landPolygons().flat()
  const starts = new Int32Array(rings.length + 1)
  const caps = new Float32Array(rings.length * 4)
  let total = 0
  rings.forEach((ring, k) => {
    starts[k] = total
    total += ring.length
  })
  starts[rings.length] = total
  const vertices = new Float32Array(total * 3)
  rings.forEach((ring, k) => {
    ring.forEach(([lon, lat], i) => vertices.set(toVector(lon, lat), (starts[k] + i) * 3))
    caps.set(capOf(ring), k * 4)
  })
  return { vertices, starts, caps }
}

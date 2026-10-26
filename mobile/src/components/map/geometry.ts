// Projects the country dataset once into Skia paths.
// Map space is a Web Mercator square of WORLD_SIZE units, matching Leaflet's
// zoom 2 (256 * 2^2), so Leaflet zoom z <=> scale 2^(z - BASE_ZOOM).
import { Skia, type SkPath } from '@shopify/react-native-skia'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson'

import countriesData from '@/assets/data/countries.json'

export const BASE_ZOOM = 2
export const WORLD_SIZE = 256 * 2 ** BASE_ZOOM

export type CountryProperties = {
  ADMIN: string
  ISO_A2?: string
  ISO_A3?: string
  Difficulty?: string
  continent?: string
  areaKm2?: number
  center?: [number, number]
  [key: string]: unknown
}

export type CountryFeature = Feature<Geometry, CountryProperties>

export type LatLngBounds = { south: number; west: number; north: number; east: number }

export type CountryShape = {
  feature: CountryFeature
  name: string
  path: SkPath
  // Bounds in map space
  x: number
  y: number
  width: number
  height: number
  geoBounds: LatLngBounds
  // Biggest piece of land, in map space: where a tiny country's dot goes and how big that piece is.
  // The whole country's bounds are no use for archipelagos (huge span, yet every island is a speck).
  marker: { x: number; y: number; span: number }
}

export const projection = geoMercator()
  .scale(WORLD_SIZE / (2 * Math.PI))
  .translate([WORLD_SIZE / 2, WORLD_SIZE / 2])

const pathGenerator = geoPath(projection)

export const allCountries = (countriesData as unknown as FeatureCollection<Geometry, CountryProperties>)
  .features as CountryFeature[]

function forEachPosition(geometry: Geometry, fn: (position: Position) => void) {
  if (geometry.type === 'Polygon') geometry.coordinates.forEach((ring) => ring.forEach(fn))
  else if (geometry.type === 'MultiPolygon')
    geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach(fn)))
}

// Plain lat/lng min/max, same as Leaflet's L.geoJSON(feature).getBounds()
export function getGeoBounds(feature: CountryFeature): LatLngBounds {
  let south = 90
  let north = -90
  let west = 180
  let east = -180
  forEachPosition(feature.geometry, ([lng, lat]) => {
    if (lat < south) south = lat
    if (lat > north) north = lat
    if (lng < west) west = lng
    if (lng > east) east = lng
  })
  return { south, west, north, east }
}

// Box of a ring in map space, over the dateline when the ring crosses it
function ringBox(ring: Position[]) {
  let lngs = ring.map((c) => c[0])
  if (Math.max(...lngs) - Math.min(...lngs) > 180) lngs = lngs.map((l) => (l < 0 ? l + 360 : l))
  const lats = ring.map((c) => c[1])
  const west = Math.min(...lngs)
  const east = Math.max(...lngs)
  const top = project(Math.max(...lats), 0).y
  const bottom = project(Math.min(...lats), 0).y
  const center = project((Math.max(...lats) + Math.min(...lats)) / 2, ((((west + east) / 2 + 540) % 360) - 180))
  return { x: center.x, y: center.y, span: Math.max(((east - west) * WORLD_SIZE) / 360, bottom - top) }
}

function biggestPiece(geometry: Geometry): CountryShape['marker'] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  return polygons.map((polygon) => ringBox(polygon[0])).reduce((a, c) => (c.span > a.span ? c : a), { x: 0, y: 0, span: -1 })
}

let shapeCache: Map<string, CountryShape> | null = null

function buildShape(feature: CountryFeature): CountryShape | null {
  const d = pathGenerator(feature)
  if (!d) return null
  const path = Skia.Path.MakeFromSVGString(d)
  if (!path) return null
  const bounds = path.getBounds()
  return {
    feature,
    name: feature.properties.ADMIN,
    path,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    geoBounds: getGeoBounds(feature),
    marker: biggestPiece(feature.geometry),
  }
}

export function getCountryShapes(): Map<string, CountryShape> {
  if (shapeCache) return shapeCache
  shapeCache = new Map()
  for (const feature of allCountries) {
    const shape = buildShape(feature)
    if (shape) shapeCache.set(shape.name, shape)
  }
  return shapeCache
}

// ---- Base map: simplified levels, cut into tiles ----------------------------------------------------
// The land under the game's colors is redrawn on every frame of a pan or pinch. Drawing all ~100 000 vertices of the
// world (twice: the map shows two copies of it) made the gestures stutter on mid-range Android phones. So the base map
// comes in levels of detail, Douglas-Peucker simplified in map space, each used while its error stays under
// MAX_ERROR_DP on screen, and each level is cut into tiles: Skia skips a tile's path when it is off screen, so a zoomed
// in map only draws the land around the view.

// Map units each level may move a vertex by; 0 is the full dataset. ~17k, ~32k, ~61k and ~102k vertices.
export const LOD_TOLERANCES = [1, 0.3, 0.1, 0]
const MAX_ERROR_DP = 0.4
const TILE_GRID = 8

// The level of detail to draw at `scale` (screen dp per map unit)
export function lodLevel(scale: number) {
  'worklet'
  for (let i = 0; i < LOD_TOLERANCES.length - 1; i++) {
    if (LOD_TOLERANCES[i] * scale <= MAX_ERROR_DP) return i
  }
  return LOD_TOLERANCES.length - 1
}

// Rings in map space as flat [x0, y0, x1, y1, ...], cut at the dateline by d3 like the shapes' paths
type Ring = number[]
let ringSink: Ring[] = []
const ringPath = geoPath(projection, {
  moveTo: (x: number, y: number) => {
    ringSink.push([x, y])
  },
  lineTo: (x: number, y: number) => {
    ringSink[ringSink.length - 1].push(x, y)
  },
  closePath: () => {},
  arc: () => {},
} as unknown as CanvasRenderingContext2D)

const ringCache = new Map<string, Ring[]>()
function shapeRings(shape: CountryShape) {
  let rings = ringCache.get(shape.name)
  if (!rings) {
    ringSink = []
    ringPath(shape.feature)
    rings = ringSink
    ringCache.set(shape.name, rings)
  }
  return rings
}

// Douglas-Peucker; a ring that would collapse is dropped when it is smaller than the tolerance, kept whole otherwise
function simplifyRing(ring: Ring, tolerance: number): Ring | null {
  const count = ring.length / 2
  if (!tolerance || count <= 4) return ring
  const keep = new Uint8Array(count)
  keep[0] = keep[count - 1] = 1
  const stack = [0, count - 1]
  const max2 = tolerance * tolerance
  while (stack.length) {
    const b = stack.pop()!
    const a = stack.pop()!
    const ax = ring[a * 2], ay = ring[a * 2 + 1]
    const dx = ring[b * 2] - ax, dy = ring[b * 2 + 1] - ay
    const length2 = dx * dx + dy * dy
    let farthest = -1
    let distance2 = max2
    for (let i = a + 1; i < b; i++) {
      const px = ring[i * 2] - ax, py = ring[i * 2 + 1] - ay
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
  const out: Ring = []
  for (let i = 0; i < count; i++) if (keep[i]) out.push(ring[i * 2], ring[i * 2 + 1])
  if (out.length >= 8) return out
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i])
    minY = Math.min(minY, ring[i + 1]); maxY = Math.max(maxY, ring[i + 1])
  }
  return Math.max(maxX - minX, maxY - minY) < tolerance ? null : ring
}

// One Skia path per tile and level: tiles[tile][level]. A ring goes to the tile of its box's center (the base map is
// one color, so a hole drawn in another tile looks the same).
const tileCache = new Map<string, SkPath[][]>()
export function getBaseTiles(shapes: CountryShape[]): SkPath[][] {
  const key = shapes.map((shape) => shape.name).join('|')
  const cached = tileCache.get(key)
  if (cached) return cached
  const cell = WORLD_SIZE / TILE_GRID
  const svg = new Map<number, string[]>()
  for (const shape of shapes) {
    for (const ring of shapeRings(shape)) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (let i = 0; i < ring.length; i += 2) {
        minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i])
        minY = Math.min(minY, ring[i + 1]); maxY = Math.max(maxY, ring[i + 1])
      }
      const column = Math.min(TILE_GRID - 1, Math.max(0, Math.floor((minX + maxX) / 2 / cell)))
      const row = Math.min(TILE_GRID - 1, Math.max(0, Math.floor((minY + maxY) / 2 / cell)))
      const tile = row * TILE_GRID + column
      if (!svg.has(tile)) svg.set(tile, LOD_TOLERANCES.map(() => ''))
      const levels = svg.get(tile)!
      LOD_TOLERANCES.forEach((tolerance, level) => {
        const simplified = simplifyRing(ring, tolerance)
        if (!simplified) return
        let d = `M${simplified[0].toFixed(2)} ${simplified[1].toFixed(2)}`
        for (let i = 2; i < simplified.length; i += 2) d += `L${simplified[i].toFixed(2)} ${simplified[i + 1].toFixed(2)}`
        levels[level] += `${d}Z`
      })
    }
  }
  const tiles = [...svg.values()].map((levels) => levels.map((d) => Skia.Path.MakeFromSVGString(d || 'M0 0') ?? Skia.Path.Make()))
  tileCache.set(key, tiles)
  return tiles
}

export function project(lat: number, lng: number) {
  const point = projection([lng, lat])
  return point ? { x: point[0], y: point[1] } : { x: 0, y: 0 }
}

export function unproject(x: number, y: number) {
  const point = projection.invert?.([x, y])
  return point ? { lat: point[1], lng: point[0] } : { lat: 0, lng: 0 }
}

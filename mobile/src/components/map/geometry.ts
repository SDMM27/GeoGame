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

export function project(lat: number, lng: number) {
  const point = projection([lng, lat])
  return point ? { x: point[0], y: point[1] } : { x: 0, y: 0 }
}

export function unproject(x: number, y: number) {
  const point = projection.invert?.([x, y])
  return point ? { lat: point[1], lng: point[0] } : { lat: 0, lng: 0 }
}

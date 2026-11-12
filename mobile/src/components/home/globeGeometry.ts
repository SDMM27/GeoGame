// Everything the globe draws, computed once at module load as flat typed arrays of unit vectors, so that the UI thread
// only rotates and projects it (see globeMath.ts). d3-geo is used here only, to sample the great circles.
import { geoGraticule, geoInterpolate } from 'd3-geo'

import { landData } from './globeLand'
import { CITIES } from './globeModel'
import { toVector, type Lines, type Rings } from './globeMath'

const cityAt = (code: string) => CITIES.find((c) => c.code === code)!.at

function flatten(lines: [number, number][][]): Lines {
  const starts = new Int32Array(lines.length + 1)
  let total = 0
  lines.forEach((line, k) => {
    starts[k] = total
    total += line.length
  })
  starts[lines.length] = total
  const vertices = new Float32Array(total * 3)
  lines.forEach((line, k) => line.forEach(([lon, lat], i) => vertices.set(toVector(lon, lat), (starts[k] + i) * 3)))
  return { vertices, starts }
}

function arc(a: [number, number], b: [number, number], steps: number): [number, number][] {
  const at = geoInterpolate(a, b)
  return Array.from({ length: steps + 1 }, (_, i) => at(i / steps) as [number, number])
}

const ROUTE_STEPS = 48
const routes = (pairs: [string, string][]) => flatten(pairs.map(([a, b]) => arc(cityAt(a), cityAt(b), ROUTE_STEPS)))

export const LAND: Rings = landData()
// A 10-degree chord deviates by at most ~0.5 pt at this globe's 136 pt radius.
// Keep the same meridians/parallels with fewer native path commands per frame.
export const GRATICULE: Lines = flatten(geoGraticule().precision(10).lines().map((line) => line.coordinates as [number, number][]))
export const ROUTES_ACCENT: Lines = routes([['PAR', 'TYO'], ['NYC', 'PAR'], ['CAI', 'SYD']])
export const ROUTES_ACCENT2: Lines = routes([['NYC', 'RIO'], ['RIO', 'CAI'], ['CAI', 'NBO']])
// The plane flies Paris -> Tokyo along its route
export const FLIGHT_PATH: Float32Array = flatten([arc(cityAt('PAR'), cityAt('TYO'), 96)]).vertices
export const CITY_VECTORS: Float32Array = flatten([CITIES.map((c) => c.at)]).vertices

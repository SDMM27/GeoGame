// Splits the full-resolution country dataset into two files the website can load separately:
//
//   src/data/countries.meta.json  properties only (names, difficulty, ISO, continent, population,
//                                 capital...) + areaKm2 (official total area from countryAreas.json, else
//                                 computed from the FULL geometry) and center.
//                                 Small enough to stay in the main bundle: the games pick their
//                                 questions from it synchronously.
//   src/data/countries.geo.json   simplified geometries, in the same order as the features of the
//                                 meta file. Loaded on demand by the pages that draw a map
//                                 (see src/data/countryGeometry.js).
//
// Source: src/data/countriesWithDifficulty_FR.json (full resolution, ~90 MB). It stays the reference
// for scripts/scoreCaps.mjs and mobile/scripts/build-*.mjs, and for any future enrichment.
// The website never bundles it: vite.config.mjs resolves its imports to countries.meta.json.
//
// Every polygon of every country is kept (islands included, each reduced to a few vertices at the
// least) so the small states and archipelagos stay visible and clickable.
//
// Simplification: Douglas-Peucker with a tolerance in metres (default 1000), i.e. no vertex is moved by
// more than ~1 km, which is far below a pixel at the world zoom and a few pixels at country zoom.
// A uniform tolerance keeps small countries recognisable (a percentage-based method reduces them to
// a handful of points) while the large ones lose the bulk of their vertices.
//
// Run it again whenever the source dataset changes (scripts/add-gdp-data.cjs, populate-capitals.js...).
//
// Countries under 6 000 km2 use a finer tolerance (100 m by default).
//
// Usage: node scripts/build-geo-data.mjs [tolerance in metres] [small-country tolerance in metres]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCountryAreaKm2, getGeographicCenter } from '../src/utils/countryArea.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src', 'data')
const tolerance = Number(process.argv[2] ?? 1000)
const smallTolerance = Number(process.argv[3] ?? 100)
const SMALL_COUNTRY_KM2 = 6000
const PRECISION = 0.001 // degrees (~100 m)

const polygonsOf = (geometry) => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates)
const round = (value) => Math.round(value / PRECISION) * PRECISION
const roundPolygon = (polygon) =>
  polygon.map((ring) => ring.map(([lng, lat]) => [Number(round(lng).toFixed(3)), Number(round(lat).toFixed(3))]))

const source = JSON.parse(readFileSync(join(dataDir, 'countriesWithDifficulty_FR.json'), 'utf8'))
// Official total areas (inland water included) by ISO_A2: the map outlines leave out the lakes and are too coarse to rank
// the large countries (they put Canada 4th)
const officialAreas = JSON.parse(readFileSync(join(dataDir, 'countryAreas.json'), 'utf8'))

// 1. Metadata, with the values that need the full-resolution geometry
const meta = source.features.map((feature) => {
  const { lat, lng } = getGeographicCenter(feature)
  return {
    type: 'Feature',
    properties: { ...feature.properties, areaKm2: officialAreas[feature.properties.ISO_A2] ?? getCountryAreaKm2(feature), center: [lng, lat] },
    geometry: null,
  }
})

// 2. Simplified geometries. Multi-part countries are exploded first so that `keep-shapes` keeps
// every island, then regrouped by country.
const tmp = mkdtempSync(join(tmpdir(), 'geogame-geo-'))
const originalPolygons = []
const exploded = source.features.map((feature, index) => {
  polygonsOf(feature.geometry).forEach((polygon) => originalPolygons.push({ index, polygon }))
  return { type: 'Feature', properties: { i: index, small: getCountryAreaKm2(feature) < SMALL_COUNTRY_KM2 }, geometry: feature.geometry }
})

// Small countries get a much finer tolerance: at 1 km an island such as Dominica keeps ~20 vertices
// and turns into a polygon, which makes the border guess unfair.
const simplifyGroup = (name, features, interval) => {
  const input = join(tmp, `${name}-in.json`)
  const output = join(tmp, `${name}-out.json`)
  writeFileSync(input, JSON.stringify({ type: 'FeatureCollection', features }))
  execFileSync(
    process.execPath,
    [
      join(root, 'node_modules', 'mapshaper', 'bin', 'mapshaper'),
      input,
      '-explode',
      '-simplify', 'dp', `interval=${interval}`, 'keep-shapes',
      '-o', output, `precision=${PRECISION}`, 'format=geojson',
    ],
    { stdio: 'inherit' }
  )
  return JSON.parse(readFileSync(output, 'utf8')).features
}
const bySource = (small) => exploded.filter((feature) => feature.properties.small === small)
const simplifiedBySource = new Map()
for (const [name, small, interval] of [['small', true, smallTolerance], ['large', false, tolerance]]) {
  const features = simplifyGroup(name, bySource(small), interval)
  features.forEach((feature) => {
    const list = simplifiedBySource.get(feature.properties.i) ?? []
    list.push(feature)
    simplifiedBySource.set(feature.properties.i, list)
  })
}
rmSync(tmp, { recursive: true, force: true })
// Back to the order of originalPolygons (source order, polygon after polygon)
const simplified = [...simplifiedBySource.keys()].sort((x, y) => x - y).flatMap((i) => simplifiedBySource.get(i))

if (simplified.length !== originalPolygons.length) {
  throw new Error(`Expected ${originalPolygons.length} polygons, mapshaper returned ${simplified.length}`)
}

const parts = source.features.map(() => [])
simplified.forEach((feature, position) => {
  const { index, polygon } = originalPolygons[position]
  if (feature.properties.i !== index) throw new Error(`Polygon ${position} is out of order`)
  // A ring that collapses to nothing is kept as the original (rounded) polygon
  const result = feature.geometry
  const kept = (result && polygonsOf(result)[0]) || roundPolygon(polygon)
  parts[index].push(kept)
})

const geometries = source.features.map((feature, index) =>
  feature.geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: parts[index][0] }
    : { type: 'MultiPolygon', coordinates: parts[index] }
)

// One feature per line keeps the diffs of the meta file readable
const metaText = `{"type":"FeatureCollection","features":[\n${meta.map((f) => JSON.stringify(f)).join(',\n')}\n]}\n`
writeFileSync(join(dataDir, 'countries.meta.json'), metaText)
writeFileSync(join(dataDir, 'countries.geo.json'), JSON.stringify(geometries))

console.log(`Wrote countries.meta.json (${meta.length} countries) and countries.geo.json (${simplified.length} polygons, ${tolerance} m tolerance)`)

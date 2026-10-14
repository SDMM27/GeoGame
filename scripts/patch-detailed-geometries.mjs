// Replaces the hand-drawn outlines of Natural Earth for the tiny territories (Dominica, Curaçao,
// Bermuda...) with real coastlines from geoBoundaries (gbOpen ADM0, CC BY 4.0 — see the credits in
// the legal documents / README).
//
// Natural Earth 10m draws the micro-territories with a few dozen vertices, which gives the geometric
// shapes that make the border guess game unfair. geoBoundaries ships much more detailed outlines
// (Sentinel-2 land cover for most islands).
//
// Territories geoBoundaries does not have (or whose outline is rejected by the checks below) fall back
// to OpenStreetMap through Overpass (ODbL, credited next to geoBoundaries): the closed
// natural=coastline rings around the territory, or its administrative relation for the ones without a
// coast (Vatican). OSM administrative relations of islands include the territorial waters, so
// coastlines are the right source for them.
//
// What it does, for every country of src/data/countriesWithDifficulty_FR.json that has an ISO_A3 and
// fewer than --max-vertices vertices (default 100):
//   1. downloads its geoBoundaries ADM0 outline (cached in the OS temp dir),
//   2. simplifies it (Douglas-Peucker, 50 m by default) so the 90 MB source does not explode,
//   3. refuses the replacement when the area or the centre moved too much (disputed borders,
//      territorial waters included, wrong country...) and reports why,
//   4. writes the patched geometries in the source file. Geometry only: no property is touched.
//
// The patch is idempotent: a country already patched has more vertices than the threshold and is
// skipped. Afterwards, regenerate the derived datasets:
//   node scripts/build-geo-data.mjs
//   cd mobile && npm run build:countries && npm run build:silhouettes
//
// Usage: node scripts/patch-detailed-geometries.mjs [--max-vertices 100] [--tolerance 50] [--dry-run]
//        [--report path.json]   (writes {iso, name, before, after} geometries for the before/after page)
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCountryAreaKm2, getGeographicCenter } from '../src/utils/countryArea.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(root, 'src', 'data', 'countriesWithDifficulty_FR.json')

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1]
}
const maxVertices = Number(option('--max-vertices', 100))
const tolerance = Number(option('--tolerance', 50))
const reportPath = option('--report', null)
const dryRun = args.includes('--dry-run')

const AREA_RATIO = [0.5, 2] // accepted newArea / oldArea
const MAX_CENTER_SHIFT_KM = 40
// Natural Earth is the odd one out for these: geoBoundaries and OpenStreetMap agree with each other
// (the Vatican is 0.44 km2, Natural Earth has it at 0.01; American Samoa gains Swains Island), so the
// area / centre checks are not applied.
const TRUSTED_OVERRIDES = new Set(['VAT', 'ASM'])
const MIN_GAIN = 1.5 // the new outline must have at least 1.5x the vertices
const MIN_POLYGON_KM2 = 0.01 // 10 000 m², about the size of a vertex at the website's precision
const PRECISION = 0.0001 // degrees (~10 m)

const countVertices = (coordinates) =>
  typeof coordinates[0] === 'number' ? 1 : coordinates.reduce((sum, entry) => sum + countVertices(entry), 0)

const distanceKm = (a, b) => {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const work = mkdtempSync(join(tmpdir(), 'geogame-patch-'))
const cacheDir = join(tmpdir(), 'geogame-geoboundaries-cache')
mkdirSync(cacheDir, { recursive: true })

async function fetchOutline(iso3) {
  const cached = join(cacheDir, `${iso3}.json`)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'))
  let meta
  for (const release of ['gbOpen', 'gbHumanitarian']) {
    meta = await fetch(`https://www.geoboundaries.org/api/current/${release}/${iso3}/ADM0/`)
    if (meta.ok) break
  }
  if (!meta.ok) throw new Error(`no geoBoundaries entry (HTTP ${meta.status})`)
  const { gjDownloadURL } = await meta.json()
  const response = await fetch(gjDownloadURL)
  if (!response.ok) throw new Error(`download failed (HTTP ${response.status})`)
  const text = await response.text()
  writeFileSync(cached, text)
  return JSON.parse(text)
}

// Merge every feature of the download into one MultiPolygon, simplified.
function simplify(collection, iso3) {
  const polygons = collection.features.flatMap((feature) =>
    feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  )
  const input = join(work, `${iso3}-in.json`)
  const output = join(work, `${iso3}-out.json`)
  writeFileSync(
    input,
    JSON.stringify({
      type: 'FeatureCollection',
      features: polygons.map((coordinates, i) => ({
        type: 'Feature',
        properties: { i },
        geometry: { type: 'Polygon', coordinates },
      })),
    })
  )
  execFileSync(
    process.execPath,
    [
      join(root, 'node_modules', 'mapshaper', 'bin', 'mapshaper'),
      input,
      '-simplify', 'dp', `interval=${tolerance}`, 'keep-shapes',
      '-o', output, `precision=${PRECISION}`, 'format=geojson',
    ],
    { stdio: 'ignore' }
  )
  const kept = JSON.parse(readFileSync(output, 'utf8')).features.filter((f) => f.geometry)
  const all = kept.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates))
  // Drop the specks (a few metres wide) left by the raster vectorisation: they only add noise and
  // collapse to nothing once the website rounds them. The largest polygon is always kept.
  const areaOf = (polygon) => getCountryAreaKm2({ geometry: { type: 'Polygon', coordinates: polygon } })
  const largest = Math.max(...all.map(areaOf))
  const result = all.filter((polygon) => polygon[0].length >= 4 && (areaOf(polygon) >= MIN_POLYGON_KM2 || areaOf(polygon) === largest))
  if (result.length === 0) throw new Error('empty geometry after simplification')
  return result.length === 1 ? { type: 'Polygon', coordinates: result[0] } : { type: 'MultiPolygon', coordinates: result }
}


// ---------------------------------------------------------------- OpenStreetMap fallback
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const LAND_RELATION_ONLY = new Set(['VAT']) // no coast: the administrative relation is the land
const BBOX_MARGIN = 0.15 // degrees around the Natural Earth outline

async function overpass(query, key) {
  const cached = join(cacheDir, `osm-${key}.json`)
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'))
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(OVERPASS, {
      method: 'POST',
      headers: {
        'User-Agent': 'GeoGame-geometry-patch/1.0 (https://github.com/SDMM27)',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })
    const text = await response.text()
    if (response.ok && text.trimStart().startsWith('{')) {
      writeFileSync(cached, text)
      await new Promise((resolve) => setTimeout(resolve, 2000)) // be kind with the public instance
      return JSON.parse(text)
    }
    await new Promise((resolve) => setTimeout(resolve, 8000 * (attempt + 1)))
  }
  throw new Error('Overpass unavailable')
}

// Joins OSM way fragments end to end and returns the closed rings, as [lng, lat] arrays.
function assembleRings(ways) {
  const pending = ways.filter((way) => way.length >= 2).map((way) => way.slice())
  const same = (a, b) => a[0] === b[0] && a[1] === b[1]
  const rings = []
  while (pending.length) {
    let ring = pending.pop()
    let grew = true
    while (grew && !same(ring[0], ring[ring.length - 1])) {
      grew = false
      for (let i = 0; i < pending.length; i += 1) {
        const way = pending[i]
        const head = ring[0]
        const tail = ring[ring.length - 1]
        if (same(tail, way[0])) ring = ring.concat(way.slice(1))
        else if (same(tail, way[way.length - 1])) ring = ring.concat(way.slice(0, -1).reverse())
        else if (same(head, way[way.length - 1])) ring = way.concat(ring.slice(1))
        else if (same(head, way[0])) ring = way.slice().reverse().concat(ring.slice(1))
        else continue
        pending.splice(i, 1)
        grew = true
        break
      }
    }
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) rings.push(ring)
  }
  return rings
}

const wayCoordinates = (geometry) => geometry.map(({ lon, lat }) => [lon, lat])

async function fetchOsmOutline(feature) {
  const { ISO_A2: iso2, ISO_A3: iso3 } = feature.properties
  let rings
  if (LAND_RELATION_ONLY.has(iso3)) {
    const data = await overpass(`[out:json][timeout:90];rel["ISO3166-1"="${iso2}"]["boundary"="administrative"];out geom;`, iso3)
    const outer = data.elements.flatMap((element) =>
      (element.members ?? []).filter((member) => member.type === 'way' && member.role === 'outer').map((member) => wayCoordinates(member.geometry))
    )
    rings = assembleRings(outer)
  } else {
    const points = []
    const walk = (coordinates) =>
      typeof coordinates[0] === 'number' ? points.push(coordinates) : coordinates.forEach(walk)
    walk(feature.geometry.coordinates)
    const west = Math.min(...points.map((p) => p[0])) - BBOX_MARGIN
    const east = Math.max(...points.map((p) => p[0])) + BBOX_MARGIN
    const south = Math.min(...points.map((p) => p[1])) - BBOX_MARGIN
    const north = Math.max(...points.map((p) => p[1])) + BBOX_MARGIN
    const data = await overpass(
      `[out:json][timeout:90];way["natural"="coastline"](${south},${west},${north},${east});out geom;`,
      iso3
    )
    rings = assembleRings(data.elements.map((element) => wayCoordinates(element.geometry)))
    // Keep the islands that belong to the territory: their centre is inside the margin box
    rings = rings.filter((ring) => {
      const lng = ring.reduce((sum, p) => sum + p[0], 0) / ring.length
      const lat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length
      return lng >= west && lng <= east && lat >= south && lat <= north
    })
  }
  if (rings.length === 0) throw new Error('no OSM ring found')
  // OSM puts the land on the left of a coastline: counter-clockwise outer rings are what GeoJSON wants
  return {
    type: 'FeatureCollection',
    features: rings.map((ring) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } })),
  }
}

const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
const candidates = source.features.filter(
  (feature) =>
    feature.properties.ISO_A3 &&
    feature.properties.ISO_A3 !== '-99' &&
    countVertices(feature.geometry.coordinates) < maxVertices
)
console.log(`${candidates.length} candidates under ${maxVertices} vertices`)

const report = []
const rejected = []
let patched = 0

for (const feature of candidates) {
  const { ADMIN: name, ISO_A3: iso3 } = feature.properties
  const before = countVertices(feature.geometry.coordinates)
  const oldArea = getCountryAreaKm2(feature)
  const oldCenter = getGeographicCenter(feature)
  const failures = []
  let done = false
  for (const [source, fetchOutlineFor] of [
    ['geoBoundaries', () => fetchOutline(iso3)],
    ['OSM', () => fetchOsmOutline(feature)],
  ]) {
    try {
      const next = simplify(await fetchOutlineFor(), `${iso3}-${source}`)
      const candidate = { type: 'Feature', properties: {}, geometry: next }
      const ratio = getCountryAreaKm2(candidate) / oldArea
      const shift = distanceKm(oldCenter, getGeographicCenter(candidate))
      const after = countVertices(next.coordinates)
      const line = `${iso3} ${name} [${source}]: ${before} -> ${after} vertices, area x${ratio.toFixed(2)}, centre ${shift.toFixed(1)} km`
      if (!TRUSTED_OVERRIDES.has(iso3) && (ratio < AREA_RATIO[0] || ratio > AREA_RATIO[1] || shift > MAX_CENTER_SHIFT_KM)) {
        failures.push(`${line} [rejected]`)
        continue
      }
      if (after < before * MIN_GAIN) {
        failures.push(`${line} [not more detailed]`)
        continue
      }
      console.log(line)
      report.push({ iso3, name, source, before: feature.geometry, after: next })
      feature.geometry = next
      patched += 1
      done = true
      break
    } catch (error) {
      failures.push(`${iso3} ${name} [${source}]: ${error.message}`)
    }
  }
  if (!done) rejected.push(...failures)
}

rmSync(work, { recursive: true, force: true })

console.log(`\nPatched ${patched}, skipped ${rejected.length}:`)
rejected.forEach((line) => console.log(`  ${line}`))

if (reportPath) writeFileSync(reportPath, JSON.stringify(report))
if (!dryRun && patched > 0) {
  writeFileSync(sourcePath, JSON.stringify(source, null, 4))
  console.log(`\nWrote ${sourcePath}`)
}

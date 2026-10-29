// Builds the lightweight country dataset bundled in the mobile app.
// Source: ../src/data/countriesWithDifficulty_FR.json (full resolution, ~90 MB)
// Output: assets/data/countries.json (simplified geometry + precomputed area/center)
//
// Usage: node scripts/build-countries.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea } from 'd3-geo'
import { getCountryAreaKm2, getGeographicCenter } from '../../src/utils/countryArea.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '..', 'src', 'data', 'countriesWithDifficulty_FR.json')
const tmp = join(root, '.countries-tmp.json')
const out = join(root, 'assets', 'data', 'countries.json')

const data = JSON.parse(readFileSync(source, 'utf8'))
// Official total areas by ISO_A2 (see scripts/build-geo-data.mjs); the drawn area still picks the simplification
const officialAreas = JSON.parse(readFileSync(join(root, '..', 'src', 'data', 'countryAreas.json'), 'utf8'))
for (const feature of data.features) {
  const { lat, lng } = getGeographicCenter(feature)
  feature.properties.areaKm2 = getCountryAreaKm2(feature)
  feature.properties.center = [lng, lat]
}
// Percentage-based simplification reduces the small countries to a handful of vertices (Dominica ends
// up as a polygon), so they get a fixed tolerance in metres instead.
const SMALL_COUNTRY_KM2 = 6000
const SMALL_TOLERANCE_M = 150
const isSmall = (feature) => feature.properties.areaKm2 < SMALL_COUNTRY_KM2
mkdirSync(dirname(out), { recursive: true })

function simplifyGroup(features, simplifyArgs) {
  writeFileSync(tmp, JSON.stringify({ type: 'FeatureCollection', features }))
  execSync(`npx -y mapshaper "${tmp}" ${simplifyArgs} -o "${out}" precision=0.001 format=geojson`, { stdio: 'inherit' })
  return JSON.parse(readFileSync(out, 'utf8')).features
}
const small = simplifyGroup(data.features.filter(isSmall), `-simplify dp interval=${SMALL_TOLERANCE_M} keep-shapes`)
const large = simplifyGroup(data.features.filter((feature) => !isSmall(feature)), '-simplify 15% weighted keep-shapes')
rmSync(tmp)
// Back to the source order
const byName = new Map([...small, ...large].map((feature) => [feature.properties.ISO_A3 + feature.properties.ADMIN, feature]))
const simplified = { type: 'FeatureCollection', features: data.features.map((f) => byName.get(f.properties.ISO_A3 + f.properties.ADMIN)) }

// d3-geo expects clockwise outer rings (RFC 7946 GeoJSON is the opposite):
// rewind any polygon d3 would read as covering the rest of the globe.
const rewind = (polygon) => {
  if (geoArea({ type: 'Polygon', coordinates: polygon }) > 2 * Math.PI) polygon.forEach((ring) => ring.reverse())
}
for (const feature of simplified.features) {
  const { geometry } = feature
  if (geometry?.type === 'Polygon') rewind(geometry.coordinates)
  else if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach(rewind)
}
for (const feature of simplified.features) {
  feature.properties.areaKm2 = officialAreas[feature.properties.ISO_A2] ?? feature.properties.areaKm2
}
writeFileSync(out, JSON.stringify(simplified))

console.log(`Wrote ${out}`)

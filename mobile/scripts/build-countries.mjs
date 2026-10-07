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
for (const feature of data.features) {
  const { lat, lng } = getGeographicCenter(feature)
  feature.properties.areaKm2 = getCountryAreaKm2(feature)
  feature.properties.center = [lng, lat]
}
writeFileSync(tmp, JSON.stringify(data))

mkdirSync(dirname(out), { recursive: true })
execSync(
  `npx -y mapshaper "${tmp}" -simplify 15% weighted keep-shapes -o "${out}" precision=0.001 format=geojson`,
  { stdio: 'inherit' }
)
rmSync(tmp)

// d3-geo expects clockwise outer rings (RFC 7946 GeoJSON is the opposite):
// rewind any polygon d3 would read as covering the rest of the globe.
const simplified = JSON.parse(readFileSync(out, 'utf8'))
const rewind = (polygon) => {
  if (geoArea({ type: 'Polygon', coordinates: polygon }) > 2 * Math.PI) polygon.forEach((ring) => ring.reverse())
}
for (const feature of simplified.features) {
  const { geometry } = feature
  if (geometry?.type === 'Polygon') rewind(geometry.coordinates)
  else if (geometry?.type === 'MultiPolygon') geometry.coordinates.forEach(rewind)
}
writeFileSync(out, JSON.stringify(simplified))

console.log(`Wrote ${out}`)

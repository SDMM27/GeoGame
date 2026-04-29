import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load our GeoJSON data to build ISO A3 → ISO A2 mapping
const raw = readFileSync(join(__dirname, '../src/data/countriesWithDifficulty_FR.json'), 'utf-8')
const geojson = JSON.parse(raw)

const isoA3ToA2 = {}
for (const feature of geojson.features) {
  const { ISO_A2, ISO_A3 } = feature.properties
  if (ISO_A3 && ISO_A2 && ISO_A3 !== '-99' && ISO_A2 !== '-99') {
    isoA3ToA2[ISO_A3] = ISO_A2
  }
}

// Fetch border data from restcountries.com
console.log('Fetching border data from restcountries.com...')
const response = await fetch('https://restcountries.com/v3.1/all?fields=cca2,cca3,borders')
if (!response.ok) throw new Error(`HTTP ${response.status}`)
const data = await response.json()

const countryBorders = {}

for (const country of data) {
  const iso2 = country.cca2
  const borders = country.borders ?? []

  // Convert ISO A3 → ISO A2 and filter unknown codes
  const neighborISO2s = borders
    .map(a3 => isoA3ToA2[a3])
    .filter(Boolean)

  // Only include countries with at least one land border
  if (neighborISO2s.length > 0) {
    countryBorders[iso2] = neighborISO2s
  }
}

const outputPath = join(__dirname, '../src/data/countryBorders.js')
const content = `// Auto-generated — do not edit manually
// Source: restcountries.com (land borders only)
// Regenerate: node scripts/generate-borders.mjs

export const countryBorders = ${JSON.stringify(countryBorders, null, 2)}
`

writeFileSync(outputPath, content, 'utf-8')
console.log(`Done. Generated ${Object.keys(countryBorders).length} countries with land borders.`)

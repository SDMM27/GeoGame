// scripts/populate-capitals.js
// Requires Node.js 18+ (native fetch)
// Run: node scripts/populate-capitals.js

const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(__dirname, '../src/data/countriesWithDifficulty_FR.json')
// WARNING: This script overwrites capitalAliases with [] on every run.
// All manually entered aliases will be LOST if you run this again.
// This is a one-shot script — only run it once on a fresh dataset.

async function fetchCapitalsMap() {
  const res = await fetch('https://restcountries.com/v3.1/all?fields=cca2,capital')
  if (!res.ok) throw new Error(`RestCountries API error: ${res.status}`)
  const countries = await res.json()
  return Object.fromEntries(
    countries.map(c => [c.cca2, c.capital?.[0] ?? ''])
  )
}

async function main() {
  console.log('Fetching capitals from RestCountries API...')
  const capitalsMap = await fetchCapitalsMap()

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))

  let matched = 0
  let missing = []

  data.features = data.features.map(feature => {
    const iso = feature.properties.ISO_A2
    const capital = capitalsMap[iso] ?? ''
    if (capital) {
      matched++
    } else {
      missing.push(`${feature.properties.ADMIN} (${iso})`)
    }
    return {
      ...feature,
      properties: {
        ...feature.properties,
        capital,
        capitalAliases: [],
      },
    }
  })

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8')

  console.log(`\nDone!`)
  console.log(`  ✓ Matched: ${matched} countries`)
  console.log(`  ✗ Missing (${missing.length}): ${missing.join(', ') || 'none'}`)
  console.log('\nNext step: manually review and correct French names in the JSON.')
}

main().catch(err => { console.error(err); process.exit(1) })

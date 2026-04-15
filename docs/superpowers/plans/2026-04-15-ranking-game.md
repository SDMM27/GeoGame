# Ranking Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Classement" game mode where players rank N countries by a random criterion (population, area, GDP, density) using drag-and-drop, in daily and infinite modes.

**Architecture:** New hook `useRankingGameState` (mirrors `useCountryClueState` pattern) + new page `RankingGamePage` using `@hello-pangea/dnd`. Area computation extracted to a shared utility so both hooks share the same implementation. GDP added directly to the country JSON via a patch script.

**Tech Stack:** React 18, Vite, `@hello-pangea/dnd`, Firebase Firestore (daily leaderboard), Vitest (tests), Bootstrap 5.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `src/utils/countryArea.js` | Extracted area helpers (collectCoordinates, getRingAreaKm2, getCountryAreaKm2) |
| Create | `src/utils/countryArea.test.js` | Tests for area utility |
| Modify | `src/hooks/useCountryClueState.js` | Import from countryArea instead of local functions |
| Create | `scripts/add-gdp-data.cjs` | One-shot patch script to add `gdp` field to country JSON |
| Modify | `src/data/countriesWithDifficulty_FR.json` | Add `gdp` field (run by script) |
| Modify | `src/utils/gameTypes.js` | Add `RANKING` constant |
| Modify | `src/utils/scoringRules.js` | Add `getRankingGamePoints(totalError, n)` |
| Create | `src/utils/scoringRules.test.js` | Tests for all scoring functions including new one |
| Create | `src/utils/rankingCriteria.js` | CRITERIA config + buildCountryPool helper |
| Create | `src/utils/rankingCriteria.test.js` | Tests for criteria compute functions |
| Create | `src/hooks/useRankingGameState.js` | Game state hook (daily/infinite, timer, scoring) |
| Create | `src/hooks/useRankingGameState.test.js` | Tests for computeTotalError |
| Create | `src/pages/RankingGamePage.jsx` | Full game page with DnD + results + leaderboard |
| Modify | `src/App.jsx` | Add `/ranking` route |
| Modify | `src/pages/HomePage.jsx` | Add RankingCard + game config entry |

---

## Task 1: Install @hello-pangea/dnd

**Files:**
- (none — dependency install only)

- [ ] **Step 1: Install the library**

```bash
npm install @hello-pangea/dnd
```

Expected output: added 1 package (or similar), no errors.

- [ ] **Step 2: Verify it resolves**

```bash
node -e "require('@hello-pangea/dnd'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @hello-pangea/dnd for drag-and-drop"
```

---

## Task 2: Extract area utility

**Files:**
- Create: `src/utils/countryArea.js`
- Create: `src/utils/countryArea.test.js`
- Modify: `src/hooks/useCountryClueState.js` (remove duplicated functions, import from utility)

- [ ] **Step 1: Write the failing test**

Create `src/utils/countryArea.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { collectCoordinates, getRingAreaKm2, getCountryAreaKm2 } from './countryArea'

describe('collectCoordinates', () => {
  it('returns empty array for null geometry', () => {
    expect(collectCoordinates(null)).toEqual([])
  })

  it('wraps Polygon coordinates in an array', () => {
    const geometry = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1]]] }
    expect(collectCoordinates(geometry)).toEqual([[[[0, 0], [1, 0], [1, 1]]]])
  })

  it('returns MultiPolygon coordinates as-is', () => {
    const coords = [
      [[[0, 0], [1, 0], [1, 1]]],
      [[[2, 2], [3, 2], [3, 3]]],
    ]
    const geometry = { type: 'MultiPolygon', coordinates: coords }
    expect(collectCoordinates(geometry)).toBe(coords)
  })
})

describe('getRingAreaKm2', () => {
  it('returns 0 for rings with fewer than 3 points', () => {
    expect(getRingAreaKm2([[0, 0], [1, 1]])).toBe(0)
    expect(getRingAreaKm2([])).toBe(0)
  })

  it('returns a positive area for a valid ring', () => {
    // Rough triangle near equator — just check it's positive and non-zero
    const ring = [[0, 0], [1, 0], [0.5, 1], [0, 0]]
    expect(getRingAreaKm2(ring)).toBeGreaterThan(0)
  })
})

describe('getCountryAreaKm2', () => {
  it('returns a positive area for a simple polygon country', () => {
    const country = {
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      },
    }
    expect(getCountryAreaKm2(country)).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/countryArea.test.js
```

Expected: FAIL — `countryArea.js` does not exist yet.

- [ ] **Step 3: Create `src/utils/countryArea.js`**

```js
// src/utils/countryArea.js
// Shared area computation extracted from useCountryClueState.js

const EARTH_RADIUS_KM = 6371

export function collectCoordinates(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return []
}

export function getRingAreaKm2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0

  const referenceLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
  const latScale = (Math.PI / 180) * EARTH_RADIUS_KM
  const lngScale = latScale * Math.cos((referenceLat * Math.PI) / 180)

  let area = 0
  for (let index = 0; index < ring.length; index += 1) {
    const [lng1, lat1] = ring[index]
    const [lng2, lat2] = ring[(index + 1) % ring.length]
    area += lng1 * lngScale * lat2 * latScale - lng2 * lngScale * lat1 * latScale
  }

  return Math.abs(area / 2)
}

export function getCountryAreaKm2(country) {
  return collectCoordinates(country.geometry).reduce((totalArea, polygon) => {
    const [outerRing, ...holes] = polygon
    const outerArea = getRingAreaKm2(outerRing)
    const holesArea = holes.reduce((sum, ring) => sum + getRingAreaKm2(ring), 0)
    return totalArea + Math.max(outerArea - holesArea, 0)
  }, 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/countryArea.test.js
```

Expected: PASS (3 test suites, all green).

- [ ] **Step 5: Update `useCountryClueState.js` to import from the utility**

At the top of `src/hooks/useCountryClueState.js`, add:
```js
import { collectCoordinates, getRingAreaKm2, getCountryAreaKm2 } from '../utils/countryArea'
```

Then remove the three functions `collectCoordinates`, `getRingAreaKm2`, `getCountryAreaKm2` and the `const EARTH_RADIUS_KM = 6371` line from that file (they are now imported).

- [ ] **Step 6: Verify existing tests still pass**

```bash
npx vitest run
```

Expected: all existing tests pass (no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/utils/countryArea.js src/utils/countryArea.test.js src/hooks/useCountryClueState.js
git commit -m "refactor: extract area computation to shared countryArea utility"
```

---

## Task 3: Add GDP data to JSON

**Files:**
- Create: `scripts/add-gdp-data.cjs` (run once, then keep for reference)
- Modify: `src/data/countriesWithDifficulty_FR.json` (output of script)

- [ ] **Step 1: Create the patch script**

Create `scripts/add-gdp-data.cjs`:

```js
// scripts/add-gdp-data.cjs
// Adds `gdp` field (nominal GDP in billion USD, IMF 2023) to each country feature.
// Run with: node scripts/add-gdp-data.cjs

const fs = require('fs')
const path = require('path')

// Nominal GDP in billion USD (IMF World Economic Outlook 2023).
// null = no reliable data (micro-states, territories, sanctioned economies).
const GDP_BY_ISO = {
  // Americas
  USA: 26944, CAN: 2090, MEX: 1463, BRA: 2127, ARG: 640,
  COL: 363,  CHL: 344,  PER: 268,  ECU: 115,  VEN: 97,
  BOL: 44,   PRY: 45,   URY: 78,   GTM: 95,   DOM: 113,
  CUB: 107,  CRI: 70,   PAN: 77,   HND: 32,   SLV: 34,
  NIC: 16,   HTI: 20,   JAM: 16,   TTO: 27,   GUY: 17,
  SUR: 4,    BLZ: 3,    ATG: 2,    BRB: 6,    DMA: 1,
  GRD: 1,    KNA: 1,    LCA: 2,    VCT: 1,
  // Europe
  DEU: 4430, GBR: 3070, FRA: 2923, ITA: 2170, ESP: 1582,
  NLD: 1081, CHE: 869,  POL: 748,  SWE: 597,  BEL: 628,
  NOR: 546,  AUT: 516,  IRL: 550,  DNK: 404,  FIN: 305,
  CZE: 335,  ROU: 284,  PRT: 267,  HUN: 207,  SVK: 115,
  BGR: 90,   HRV: 75,   SVN: 66,   LTU: 73,   LVA: 43,
  EST: 41,   LUX: 86,   ISL: 28,   SRB: 63,   BLR: 73,
  UKR: 160,  MDA: 17,   GEO: 28,   ARM: 24,   AZE: 78,
  ALB: 20,   MKD: 14,   BIH: 24,   MNE: 7,    MLT: 18,
  CYP: 32,   RUS: 1862,
  // Asia & Middle East
  CHN: 17700, JPN: 4231, IND: 3730, KOR: 1710, IDN: 1371,
  SAU: 1069,  TUR: 1029, THA: 514,  SGP: 467,  MYS: 408,
  VNM: 430,   PHL: 404,  BGD: 460,  PAK: 341,  IRN: 367,
  ARE: 504,   QAT: 220,  KWT: 163,  IRQ: 268,  OMN: 104,
  ISR: 539,   JOR: 46,   LBN: 23,   KAZ: 225,  UZB: 91,
  TKM: 59,   MNG: 17,   NPL: 40,   LKA: 74,   MMR: 65,
  KHM: 30,   LAO: 15,   BRN: 15,   TLS: 3,    TJK: 11,
  KGZ: 11,   AFG: 14,   MDV: 7,    BTN: 3,    YEM: 21,
  SYR: null, PRK: null, PSE: null,
  // Oceania
  AUS: 1693, NZL: 247, PNG: 28, FJI: 5, SLB: 2,
  VUT: 1,    WSM: 1,   TON: 1,
  // Africa
  NGA: 473, ZAF: 378, EGY: 378, DZA: 190, ETH: 126,
  GHA: 77,  KEN: 110, TZA: 78,  AGO: 84,  MOZ: 18,
  CMR: 44,  CIV: 68,  SDN: 34,  COD: 67,  UGA: 48,
  MAR: 141, TUN: 49,  LBY: 48,  SEN: 27,  BFA: 19,
  MLI: 20,  NER: 17,  TCD: 12,  GIN: 22,  BEN: 20,
  TGO: 9,   MDG: 16,  ZMB: 27,  ZWE: 28,  RWA: 13,
  BWA: 20,  NAM: 13,  MWI: 14,  SOM: 9,   DJI: 4,
  LSO: 3,   SWZ: 5,   GAB: 22,  COG: 15,  CAF: 3,
  GNQ: 12,  MRT: 10,  GMB: 2,   GNB: 2,   SLE: 4,
  LBR: 4,   COM: 1,   MUS: 14,  SYC: 2,   CPV: 2,
  BDI: 3,   ERI: null, STP: null,
}

const jsonPath = path.join(__dirname, '../src/data/countriesWithDifficulty_FR.json')
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

let patched = 0
let missing = 0

data.features = data.features.map((feature) => {
  const iso = feature.properties?.ISO_A3
  if (iso && iso !== '-99' && iso in GDP_BY_ISO) {
    feature.properties.gdp = GDP_BY_ISO[iso]
    patched++
  } else {
    feature.properties.gdp = null
    missing++
  }
  return feature
})

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8')
console.log(`Patched: ${patched} countries with GDP data`)
console.log(`Set to null: ${missing} countries (no data or unknown ISO)`)
```

- [ ] **Step 2: Run the script**

```bash
node scripts/add-gdp-data.cjs
```

Expected output (approximate):
```
Patched: 170 countries with GDP data
Set to null: 10 countries (no data or unknown ISO)
```

- [ ] **Step 3: Verify the JSON was updated**

```bash
node -e "const d = require('./src/data/countriesWithDifficulty_FR.json'); const f = d.features.find(f => f.properties.ISO_A3 === 'FRA'); console.log('FRA gdp:', f.properties.gdp)"
```

Expected: `FRA gdp: 2923`

- [ ] **Step 4: Commit**

```bash
git add scripts/add-gdp-data.cjs src/data/countriesWithDifficulty_FR.json
git commit -m "feat(data): add GDP field to country JSON via patch script"
```

---

## Task 4: Add RANKING game type and scoring function (TDD)

**Files:**
- Modify: `src/utils/gameTypes.js`
- Create: `src/utils/scoringRules.test.js`
- Modify: `src/utils/scoringRules.js`

- [ ] **Step 1: Add RANKING to gameTypes.js**

In `src/utils/gameTypes.js`, add `RANKING`:

```js
export const GAME_TYPES = {
  PLACEMENT: 'PLACEMENT',
  FLAGS: 'FLAGS',
  CAPITALS: 'CAPITALS',
  BORDER_GUESS: 'BORDER_GUESS',
  COUNTRY_CLUE: 'COUNTRY_CLUE',
  RANKING: 'RANKING',
}
```

- [ ] **Step 2: Write the failing test**

Create `src/utils/scoringRules.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { getRankingGamePoints } from './scoringRules'

describe('getRankingGamePoints', () => {
  it('returns 3 for a perfect score (totalError = 0)', () => {
    expect(getRankingGamePoints(0, 5)).toBe(3)
    expect(getRankingGamePoints(0, 8)).toBe(3)
    expect(getRankingGamePoints(0, 10)).toBe(3)
  })

  it('returns 2 for totalError <= n', () => {
    expect(getRankingGamePoints(1, 5)).toBe(2)
    expect(getRankingGamePoints(5, 5)).toBe(2)
    expect(getRankingGamePoints(8, 8)).toBe(2)
  })

  it('returns 1 for n < totalError <= 2*n', () => {
    expect(getRankingGamePoints(6, 5)).toBe(1)
    expect(getRankingGamePoints(10, 5)).toBe(1)
    expect(getRankingGamePoints(9, 8)).toBe(1)
    expect(getRankingGamePoints(16, 8)).toBe(1)
  })

  it('returns 0 for totalError > 2*n', () => {
    expect(getRankingGamePoints(11, 5)).toBe(0)
    expect(getRankingGamePoints(17, 8)).toBe(0)
    expect(getRankingGamePoints(21, 10)).toBe(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/utils/scoringRules.test.js
```

Expected: FAIL — `getRankingGamePoints is not a function`

- [ ] **Step 4: Add `getRankingGamePoints` to `scoringRules.js`**

Append to `src/utils/scoringRules.js`:

```js
/**
 * Ranking Game — based on sum of absolute position errors across all N countries.
 * totalError = Σ |player_position[i] - correct_position[i]|
 * 0 (perfect) → 3 pts, ≤ n → 2 pts, ≤ 2n → 1 pt, > 2n → 0 pt.
 */
export function getRankingGamePoints(totalError, n) {
  if (totalError === 0) return 3
  if (totalError <= n) return 2
  if (totalError <= 2 * n) return 1
  return 0
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/utils/scoringRules.test.js
```

Expected: PASS (4 tests, all green).

- [ ] **Step 6: Commit**

```bash
git add src/utils/gameTypes.js src/utils/scoringRules.js src/utils/scoringRules.test.js
git commit -m "feat(scoring): add RANKING game type and getRankingGamePoints"
```

---

## Task 5: Create rankingCriteria.js utility (TDD)

**Files:**
- Create: `src/utils/rankingCriteria.js`
- Create: `src/utils/rankingCriteria.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/rankingCriteria.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { CRITERIA, CRITERIA_KEYS, buildCountryPool } from './rankingCriteria'

const makeCountry = (overrides = {}) => ({
  properties: {
    ADMIN: 'TestCountry',
    ISO_A3: 'TST',
    ISO_A2: 'TS',
    population: 10_000_000,
    gdp: 500,
    ...overrides,
  },
  geometry: { type: 'Polygon', coordinates: [] },
})

describe('CRITERIA_KEYS', () => {
  it('contains exactly population, area, gdp, density', () => {
    expect(CRITERIA_KEYS).toEqual(expect.arrayContaining(['population', 'area', 'gdp', 'density']))
    expect(CRITERIA_KEYS).toHaveLength(4)
  })
})

describe('CRITERIA.population.compute', () => {
  it('returns the population property', () => {
    const country = makeCountry({ population: 67_000_000 })
    expect(CRITERIA.population.compute(country, new Map())).toBe(67_000_000)
  })

  it('returns null when population is missing', () => {
    const country = makeCountry({ population: undefined })
    expect(CRITERIA.population.compute(country, new Map())).toBeNull()
  })
})

describe('CRITERIA.gdp.compute', () => {
  it('returns the gdp property', () => {
    const country = makeCountry({ gdp: 2923 })
    expect(CRITERIA.gdp.compute(country, new Map())).toBe(2923)
  })

  it('returns null when gdp is null', () => {
    const country = makeCountry({ gdp: null })
    expect(CRITERIA.gdp.compute(country, new Map())).toBeNull()
  })
})

describe('CRITERIA.area.compute', () => {
  it('returns area from the areaMap', () => {
    const country = makeCountry({ ADMIN: 'France' })
    const areaMap = new Map([['France', 551695]])
    expect(CRITERIA.area.compute(country, areaMap)).toBe(551695)
  })

  it('returns null when country is not in areaMap', () => {
    const country = makeCountry({ ADMIN: 'Unknown' })
    expect(CRITERIA.area.compute(country, new Map())).toBeNull()
  })
})

describe('CRITERIA.density.compute', () => {
  it('returns population / area', () => {
    const country = makeCountry({ ADMIN: 'France', population: 68_000_000 })
    const areaMap = new Map([['France', 551695]])
    const density = CRITERIA.density.compute(country, areaMap)
    expect(density).toBeCloseTo(68_000_000 / 551695, 2)
  })

  it('returns null when area is missing', () => {
    const country = makeCountry({ population: 1_000_000 })
    expect(CRITERIA.density.compute(country, new Map())).toBeNull()
  })

  it('returns null when population is missing', () => {
    const country = makeCountry({ ADMIN: 'Test', population: undefined })
    const areaMap = new Map([['Test', 100000]])
    expect(CRITERIA.density.compute(country, areaMap)).toBeNull()
  })
})

describe('buildCountryPool', () => {
  it('excludes countries where compute returns null', () => {
    const countries = [
      makeCountry({ ADMIN: 'A', gdp: 100 }),
      makeCountry({ ADMIN: 'B', gdp: null }),
      makeCountry({ ADMIN: 'C', gdp: 50 }),
    ]
    const pool = buildCountryPool(countries, CRITERIA.gdp, new Map())
    expect(pool).toHaveLength(2)
    expect(pool.map((c) => c.properties.ADMIN)).toEqual(['A', 'C'])
  })

  it('excludes countries where compute returns 0', () => {
    const countries = [
      makeCountry({ population: 0 }),
      makeCountry({ population: 5_000_000 }),
    ]
    const pool = buildCountryPool(countries, CRITERIA.population, new Map())
    expect(pool).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/rankingCriteria.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/utils/rankingCriteria.js`**

```js
// src/utils/rankingCriteria.js
// Criteria definitions for the Ranking game.
// Each criterion has: key, label, consigne, unit, compute(country, areaMap), format(value).

function formatValue(value, criterion) {
  if (value === null || value === undefined) return '—'
  return criterion.format(value)
}

export const CRITERIA = {
  population: {
    key: 'population',
    label: 'Population',
    consigne: 'Classe du plus peuplé au moins peuplé',
    unit: 'hab',
    compute: (country) => {
      const v = country.properties.population
      return v != null && v > 0 ? v : null
    },
    format: (value) => {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2).replace('.', ',')} Md`
      if (value >= 1e6) return `${Math.round(value / 1e6)} M`
      return value.toLocaleString('fr-FR')
    },
  },

  area: {
    key: 'area',
    label: 'Superficie',
    consigne: 'Classe du plus grand au moins grand',
    unit: 'km²',
    compute: (country, areaMap) => {
      const v = areaMap?.get(country.properties.ADMIN)
      return v != null && v > 0 ? v : null
    },
    format: (value) => `${Math.round(value).toLocaleString('fr-FR')} km²`,
  },

  gdp: {
    key: 'gdp',
    label: 'PIB',
    consigne: 'Classe du plus riche au moins riche',
    unit: 'Mrd $',
    compute: (country) => {
      const v = country.properties.gdp
      return v != null && v > 0 ? v : null
    },
    format: (value) => `${value.toLocaleString('fr-FR')} Mrd $`,
  },

  density: {
    key: 'density',
    label: 'Densité',
    consigne: 'Classe du plus dense au moins dense',
    unit: 'hab/km²',
    compute: (country, areaMap) => {
      const area = areaMap?.get(country.properties.ADMIN)
      const pop = country.properties.population
      if (!area || !pop) return null
      return pop / area
    },
    format: (value) => `${Math.round(value).toLocaleString('fr-FR')} hab/km²`,
  },
}

export const CRITERIA_KEYS = Object.keys(CRITERIA)

/**
 * Filters a country array down to those that have a valid (non-null, > 0)
 * value for the given criterion.
 */
export function buildCountryPool(countries, criterion, areaMap) {
  return countries.filter((country) => {
    const val = criterion.compute(country, areaMap)
    return val !== null && val > 0
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/utils/rankingCriteria.test.js
```

Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/rankingCriteria.js src/utils/rankingCriteria.test.js
git commit -m "feat: add rankingCriteria utility with 4 criteria and pool builder"
```

---

## Task 6: Create useRankingGameState.js

**Files:**
- Create: `src/hooks/useRankingGameState.js`
- Create: `src/hooks/useRankingGameState.test.js`

- [ ] **Step 1: Write the failing tests for the pure helpers**

Create `src/hooks/useRankingGameState.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { computeTotalError } from './useRankingGameState'

const c = (iso) => ({ properties: { ISO_A3: iso } })

describe('computeTotalError', () => {
  it('returns 0 for a perfect ordering', () => {
    const order = [c('FRA'), c('DEU'), c('ESP')]
    expect(computeTotalError(order, order)).toBe(0)
  })

  it('returns 2 when two adjacent countries are swapped', () => {
    const correct = [c('FRA'), c('DEU'), c('ESP')]
    // swap first two: DEU at index 0 (correct: 1) → |0-1|=1, FRA at index 1 (correct: 0) → |1-0|=1
    const player = [c('DEU'), c('FRA'), c('ESP')]
    expect(computeTotalError(player, correct)).toBe(2)
  })

  it('returns 4 when first country is placed last (3 countries)', () => {
    const correct = [c('A'), c('B'), c('C')]
    const player  = [c('B'), c('C'), c('A')]
    // A: player=2, correct=0 → 2; B: player=0, correct=1 → 1; C: player=1, correct=2 → 1 → total=4
    expect(computeTotalError(player, correct)).toBe(4)
  })

  it('handles single country (always 0)', () => {
    const order = [c('FRA')]
    expect(computeTotalError(order, order)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/hooks/useRankingGameState.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useRankingGameState.js`**

```js
// src/hooks/useRankingGameState.js
import { useEffect, useMemo, useRef, useState } from 'react'
import countries from '../data/countriesWithDifficulty_FR.json'
import { getCountryAreaKm2 } from '../utils/countryArea'
import { CRITERIA, CRITERIA_KEYS, buildCountryPool } from '../utils/rankingCriteria'
import { getRankingGamePoints } from '../utils/scoringRules'

const DAILY_TIME_ZONE = 'Europe/Paris'
const DAILY_STORAGE_PREFIX = 'ranking-daily'
const COUNTRY_COUNT = { Facile: 5, Moyen: 8, Difficile: 10 }
const DAILY_COUNT = 6

const RANKING_COUNTRIES = countries.features.filter(
  (country) => country?.properties?.ADMIN && country?.geometry?.coordinates?.length
)

// --- Pure helpers (exported for testing) ---

export function computeTotalError(playerOrder, correctOrder) {
  const correctIndexMap = new Map(
    correctOrder.map((country, i) => [country.properties.ISO_A3, i])
  )
  return playerOrder.reduce((sum, country, playerIdx) => {
    const correctIdx = correctIndexMap.get(country.properties.ISO_A3) ?? playerIdx
    return sum + Math.abs(playerIdx - correctIdx)
  }, 0)
}

// --- Private helpers ---

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function pickN(pool, n, rand) {
  const available = [...pool]
  const selected = []
  for (let i = 0; i < n && available.length > 0; i++) {
    const idx = Math.floor(rand() * available.length)
    selected.push(available.splice(idx, 1)[0])
  }
  return selected
}

function shuffle(arr, rand) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function computeCorrectOrder(countryList, criterion, areaMap) {
  return [...countryList].sort((a, b) => {
    const va = criterion.compute(a, areaMap) ?? -Infinity
    const vb = criterion.compute(b, areaMap) ?? -Infinity
    return vb - va
  })
}

function readDailyProgress(dateKey) {
  try {
    const raw = window.localStorage.getItem(`${DAILY_STORAGE_PREFIX}:${dateKey}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDailyProgress(dateKey, data) {
  try {
    window.localStorage.setItem(
      `${DAILY_STORAGE_PREFIX}:${dateKey}`,
      JSON.stringify(data)
    )
  } catch {
    // localStorage unavailable — ignore
  }
}

// --- Hook ---

export default function useRankingGameState(mode, options = {}) {
  const { difficulty = 'Facile' } = options

  const areaMap = useMemo(
    () => new Map(RANKING_COUNTRIES.map((c) => [c.properties.ADMIN, getCountryAreaKm2(c)])),
    []
  )

  const [countries, setCountries] = useState([])
  const [criterion, setCriterion] = useState(null)
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(null)
  const [totalError, setTotalError] = useState(null)
  const [correctOrder, setCorrectOrder] = useState([])
  const [countryValues, setCountryValues] = useState(new Map())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  // Timer management
  useEffect(() => {
    if (isTimerRunning) {
      startTimeRef.current = Date.now() - elapsedTime
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current)
      }, 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isTimerRunning])

  // Initialize on mode/difficulty change
  useEffect(() => {
    if (mode === 'daily') {
      initDailyRound()
    } else {
      initInfiniteRound()
    }
    return () => clearInterval(timerRef.current)
  }, [mode, difficulty])

  function initDailyRound() {
    const dateKey = getTodayKey()
    const saved = readDailyProgress(dateKey)

    if (saved) {
      const savedCriterion = CRITERIA[saved.criterion]
      const restoredCountries = saved.playerOrder
        .map((iso) => RANKING_COUNTRIES.find((c) => c.properties.ISO_A3 === iso))
        .filter(Boolean)

      setCriterion(savedCriterion)
      setCountries(restoredCountries)
      setStatus(saved.status)
      setElapsedTime(saved.elapsedTime ?? 0)

      if (saved.status === 'submitted') {
        const correct = computeCorrectOrder(restoredCountries, savedCriterion, areaMap)
        setCorrectOrder(correct)
        setScore(saved.score)
        setTotalError(saved.totalError)
        setCountryValues(buildValuesMap(restoredCountries, savedCriterion, areaMap))
      }
    } else {
      const seed = hashString(`ranking:${dateKey}`)
      const rand = seededRandom(seed)
      const criterionKey = CRITERIA_KEYS[Math.floor(rand() * CRITERIA_KEYS.length)]
      const crit = CRITERIA[criterionKey]
      const pool = buildCountryPool(RANKING_COUNTRIES, crit, areaMap)
      const selected = pickN(pool, DAILY_COUNT, rand)
      const shuffled = shuffle(selected, seededRandom(seed + 1))

      setCriterion(crit)
      setCountries(shuffled)
      setStatus('playing')
      setElapsedTime(0)
      setIsTimerRunning(false)

      saveDailyProgress(dateKey, {
        criterion: criterionKey,
        initialOrder: shuffled.map((c) => c.properties.ISO_A3),
        playerOrder: shuffled.map((c) => c.properties.ISO_A3),
        status: 'playing',
        elapsedTime: 0,
        score: null,
        totalError: null,
      })
    }
  }

  function initInfiniteRound() {
    const n = COUNTRY_COUNT[difficulty] ?? 5
    const criterionKey = CRITERIA_KEYS[Math.floor(Math.random() * CRITERIA_KEYS.length)]
    const crit = CRITERIA[criterionKey]
    const pool = buildCountryPool(RANKING_COUNTRIES, crit, areaMap)
    const selected = pickN(pool, n, Math.random.bind(Math))
    const shuffled = selected.sort(() => Math.random() - 0.5)

    setCriterion(crit)
    setCountries(shuffled)
    setStatus('playing')
    setScore(null)
    setTotalError(null)
    setCorrectOrder([])
    setCountryValues(new Map())
    setElapsedTime(0)
    setIsTimerRunning(false)
  }

  function startTimer() {
    if (status === 'playing' && !isTimerRunning) {
      setIsTimerRunning(true)
    }
  }

  function reorderCountries(newOrder) {
    setCountries(newOrder)
    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      if (saved) {
        saveDailyProgress(dateKey, {
          ...saved,
          playerOrder: newOrder.map((c) => c.properties.ISO_A3),
        })
      }
    }
  }

  function handleSubmit() {
    if (status !== 'playing' || !criterion) return

    setIsTimerRunning(false)
    const finalTime = elapsedTime

    const correct = computeCorrectOrder(countries, criterion, areaMap)
    const error = computeTotalError(countries, correct)
    const pts = getRankingGamePoints(error, countries.length)
    const valuesMap = buildValuesMap(countries, criterion, areaMap)

    setCorrectOrder(correct)
    setTotalError(error)
    setScore(pts)
    setCountryValues(valuesMap)
    setStatus('submitted')

    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      saveDailyProgress(dateKey, {
        ...(saved ?? {}),
        playerOrder: countries.map((c) => c.properties.ISO_A3),
        status: 'submitted',
        score: pts,
        totalError: error,
        elapsedTime: finalTime,
      })
    }
  }

  function startNextRound() {
    if (mode !== 'infinite') return
    initInfiniteRound()
  }

  return {
    criterion,
    countries,
    countryValues,
    reorderCountries,
    status,
    score,
    totalError,
    correctOrder,
    elapsedTime,
    isTimerRunning,
    startTimer,
    handleSubmit,
    startNextRound,
    dailyKey: mode === 'daily' ? getTodayKey() : null,
  }
}

function buildValuesMap(countryList, criterion, areaMap) {
  return new Map(
    countryList.map((country) => {
      const val = criterion.compute(country, areaMap)
      return [country.properties.ISO_A3, val != null ? criterion.format(val) : '—']
    })
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useRankingGameState.test.js
```

Expected: PASS (4 tests, all green).

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useRankingGameState.js src/hooks/useRankingGameState.test.js
git commit -m "feat: add useRankingGameState hook (daily + infinite modes)"
```

---

## Task 7: Create RankingGamePage.jsx

**Files:**
- Create: `src/pages/RankingGamePage.jsx`

- [ ] **Step 1: Create the page**

Create `src/pages/RankingGamePage.jsx`:

```jsx
import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import NavBar from '../components/NavBar'
import DailyLeaderboard from './DailyLeaderboard'
import useRankingGameState from '../hooks/useRankingGameState'
import { GAME_TYPES } from '../utils/gameTypes'
import { formatTime } from '../utils/formatTime'
import { firestore } from '../Firebase'

const FLAG_URL = (iso2) =>
  iso2 ? `https://flagcdn.com/w40/${iso2.toLowerCase()}.png` : null

function CriterionBanner({ criterion }) {
  if (!criterion) return null
  return (
    <div
      style={{
        background: '#1a2a3a',
        borderLeft: '3px solid #4a8aff',
        borderRadius: 4,
        padding: '10px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>
        Critère
      </div>
      <div style={{ fontSize: 16, fontWeight: 'bold' }}>{criterion.label}</div>
      <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{criterion.consigne}</div>
    </div>
  )
}

export default function RankingGamePage() {
  const location = useLocation()
  const initialMode = location.state?.mode ?? 'daily'
  const [mode, setMode] = useState(initialMode)
  const [difficulty, setDifficulty] = useState('Facile')
  const [submitName, setSubmitName] = useState('')
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    criterion,
    countries,
    countryValues,
    reorderCountries,
    status,
    score,
    totalError,
    correctOrder,
    elapsedTime,
    isTimerRunning,
    startTimer,
    handleSubmit,
    startNextRound,
    dailyKey,
  } = useRankingGameState(mode, { difficulty })

  function onDragEnd(result) {
    if (!result.destination) return
    const newOrder = Array.from(countries)
    const [moved] = newOrder.splice(result.source.index, 1)
    newOrder.splice(result.destination.index, 0, moved)
    reorderCountries(newOrder)
  }

  async function submitToLeaderboard(e) {
    e.preventDefault()
    const name = submitName.trim()
    if (!name) {
      toast.error('Veuillez entrer un pseudo', { containerId: 'topRightToast' })
      return
    }
    setSubmitting(true)
    try {
      const ref = collection(firestore, 'daily_scores')
      const existing = await getDocs(
        query(
          ref,
          where('name', '==', name),
          where('gameType', '==', GAME_TYPES.RANKING),
          where('dailyKey', '==', dailyKey)
        )
      )

      if (!existing.empty) {
        const prev = existing.docs[0].data()
        if (score > prev.score || (score === prev.score && elapsedTime < prev.elapsedTime)) {
          await deleteDoc(existing.docs[0].ref)
        } else {
          toast.info('Tu as déjà un meilleur score enregistré.', { containerId: 'topRightToast' })
          setSubmitting(false)
          return
        }
      }

      await addDoc(ref, {
        name,
        gameType: GAME_TYPES.RANKING,
        dailyKey,
        score,
        totalError,
        elapsedTime,
      })

      setLeaderboardSubmitted(true)
      toast.success('Score enregistré !', { containerId: 'topRightToast' })
    } catch {
      toast.error('Erreur lors de la sauvegarde.', { containerId: 'topRightToast' })
    }
    setSubmitting(false)
  }

  const isSubmitted = status === 'submitted'

  return (
    <>
      <NavBar />
      <div className="container py-4" style={{ maxWidth: 600 }}>
        <h1 className="game-title">Classement</h1>

        {/* Mode tabs */}
        <div className="game-mode-tabs mb-3">
          {['daily', 'infinite'].map((m) => (
            <button
              key={m}
              className={`game-mode-tab${mode === m ? ' game-mode-tab--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'daily' ? 'Journalier' : 'Infini'}
            </button>
          ))}
        </div>

        {/* Difficulty selector — infinite mode only, before submission */}
        {mode === 'infinite' && !isSubmitted && (
          <div className="d-flex gap-2 mb-3">
            {['Facile', 'Moyen', 'Difficile'].map((d) => (
              <button
                key={d}
                className={`btn btn-sm${difficulty === d ? ' btn-primary' : ' btn-outline-secondary'}`}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Timer */}
        {status !== 'idle' && (
          <div className="text-end mb-2 fw-bold" style={{ color: '#f0c040' }}>
            ⏱ {formatTime(elapsedTime)}
          </div>
        )}

        {/* Criterion banner */}
        <CriterionBanner criterion={criterion} />

        {/* === PLAYING === */}
        {status === 'playing' && (
          <>
            {!isTimerRunning && (
              <button className="btn btn-outline-light w-100 mb-3" onClick={startTimer}>
                ▶ Démarrer le chrono
              </button>
            )}

            <div className="text-muted small mb-2">Glisse pour réordonner</div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="ranking-countries">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {countries.map((country, index) => (
                      <Draggable
                        key={country.properties.ISO_A3}
                        draggableId={country.properties.ISO_A3}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              background: snapshot.isDragging ? '#1a3a2e' : '#1e1e3e',
                              border: snapshot.isDragging
                                ? '2px solid #3a8a5e'
                                : '1px solid #3a3a6e',
                              borderRadius: 8,
                              padding: '10px 14px',
                              marginBottom: 6,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              cursor: 'grab',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{ color: '#555', fontSize: 18 }}>⠿</span>
                            <span
                              style={{
                                background: '#2a2a4e',
                                color: '#aaa',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 'bold',
                                flexShrink: 0,
                              }}
                            >
                              {index + 1}
                            </span>
                            {FLAG_URL(country.properties.ISO_A2) && (
                              <img
                                src={FLAG_URL(country.properties.ISO_A2)}
                                alt=""
                                style={{ width: 28, height: 'auto', borderRadius: 2 }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                }}
                              />
                            )}
                            <span style={{ fontWeight: 500 }}>{country.properties.ADMIN}</span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <button
              className="btn btn-primary w-100 mt-3"
              onClick={handleSubmit}
              disabled={!isTimerRunning}
            >
              ✓ Soumettre mon classement
            </button>
          </>
        )}

        {/* === SUBMITTED === */}
        {isSubmitted && (
          <>
            {/* Criterion reminder */}
            <CriterionBanner criterion={criterion} />

            {/* Score */}
            <div className="text-center my-3">
              <div className="display-4 fw-bold" style={{ color: '#f0c040' }}>
                {score} pt{score !== 1 ? 's' : ''}
              </div>
              <div className="text-muted">
                Erreur totale : {totalError} position{totalError !== 1 ? 's' : ''}
              </div>
              <div className="text-muted small">{formatTime(elapsedTime)}</div>
            </div>

            {/* Correct ranking revealed */}
            <h5 className="mb-2">Classement correct</h5>
            {correctOrder.map((country, index) => {
              const playerIdx = countries.findIndex(
                (c) => c.properties.ISO_A3 === country.properties.ISO_A3
              )
              const isCorrect = playerIdx === index
              const formattedVal = countryValues.get(country.properties.ISO_A3) ?? '—'

              return (
                <div
                  key={country.properties.ISO_A3}
                  style={{
                    background: isCorrect ? '#1e3a1e' : '#1e1e3e',
                    border: `1px solid ${isCorrect ? '#3a7a3a' : '#8a3a3a'}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    marginBottom: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      background: isCorrect ? '#3a7a3a' : '#3a3a6e',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  {FLAG_URL(country.properties.ISO_A2) && (
                    <img
                      src={FLAG_URL(country.properties.ISO_A2)}
                      alt=""
                      style={{ width: 24, height: 'auto', borderRadius: 2 }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  )}
                  <span style={{ flexGrow: 1 }}>{country.properties.ADMIN}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#5fa', fontSize: 12, fontWeight: 'bold' }}>
                      {formattedVal}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isCorrect ? '#3a7a3a' : '#e06060',
                      }}
                    >
                      {isCorrect ? '✓ correct' : `✗ tu avais mis #${playerIdx + 1}`}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Daily leaderboard submission */}
            {mode === 'daily' && !leaderboardSubmitted && (
              <form onSubmit={submitToLeaderboard} className="mt-3 d-flex gap-2">
                <input
                  className="form-control"
                  placeholder="Ton pseudo"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  maxLength={30}
                />
                <button className="btn btn-outline-primary" type="submit" disabled={submitting}>
                  {submitting ? '...' : '📤'}
                </button>
              </form>
            )}

            {mode === 'daily' && (
              <DailyLeaderboard gameType={GAME_TYPES.RANKING} dailyKey={dailyKey} />
            )}

            {mode === 'infinite' && (
              <button className="btn btn-outline-primary w-100 mt-3" onClick={startNextRound}>
                ▶ Round suivant
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify no import errors by checking the dev server starts**

```bash
npm run dev
```

Navigate to any existing page (e.g. `/`) — it should load without console errors. Kill the server after verifying (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingGamePage.jsx
git commit -m "feat: add RankingGamePage with drag-and-drop and results view"
```

---

## Task 8: Wire up route and HomePage card

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Add route to `src/App.jsx`**

Add the import at the top (with the other page imports):
```js
import RankingGamePage from './pages/RankingGamePage'
```

Add the route inside `<Routes>` (after the `/country-clue` route):
```jsx
<Route path="/ranking" element={<RankingGamePage />} />
```

- [ ] **Step 2: Add `RankingCard` component and game entry to `src/pages/HomePage.jsx`**

After the `CountryClueCard` function definition (around line 185), add:

```jsx
function RankingCard({ game }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("daily");

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>
      <div className="game-card-controls">
        <div className="game-mode-tabs">
          <button
            className={`game-mode-tab${mode === "daily" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("daily")}
          >
            Journalier
          </button>
          <button
            className={`game-mode-tab${mode === "infinite" ? " game-mode-tab--active" : ""}`}
            onClick={() => setMode("infinite")}
          >
            Infini
          </button>
        </div>
        <div className="border-guess-card-note">
          {mode === "daily"
            ? "Classe 6 pays selon le critère du jour. Un seul essai par jour."
            : "Enchaîne des rounds de classement avec difficulté au choix."}
        </div>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => navigate(game.route, { state: { mode } })}>
            Jouer
          </button>
        </div>
      </div>
    </div>
  );
}
```

In the `GAMES` array (or wherever game entries are defined in `HomePage.jsx`), add an entry for Ranking. Find the array that contains entries with `icon`, `title`, `description`, `route` fields and append:

```js
{
  id: "ranking",
  icon: "🏆",
  title: "Classement",
  description: "Classe des pays du plus grand au plus petit selon un critère : population, superficie, PIB ou densité.",
  route: "/ranking",
  cardType: "ranking",
}
```

In the JSX where game cards are rendered, add a `cardType === "ranking"` branch that renders `<RankingCard game={game} />`. Look for the existing conditional rendering of `BorderGuessCard` and `CountryClueCard` and follow the same pattern.

- [ ] **Step 3: Start dev server and manually test**

```bash
npm run dev
```

1. Open `http://localhost:5173`
2. Confirm "Classement" card appears on the home page
3. Click "Jouer" in daily mode → page loads with criterion banner and 6 countries
4. Click "Démarrer le chrono" → timer starts
5. Drag a country to a different position → order updates
6. Click "Soumettre" → results appear with correct ranking and values
7. Test infinite mode: change difficulty to "Moyen", play, submit, click "Round suivant"
8. Refresh during a daily round → order is restored from localStorage

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/pages/HomePage.jsx
git commit -m "feat: wire up /ranking route and add RankingCard to homepage"
```

---

## Self-Review Notes

- **Spec coverage:** All sections covered — architecture ✓, daily/infinite modes ✓, scoring ✓, drag-and-drop UI ✓, results with criterion reminder ✓, leaderboard submission ✓.
- **No placeholders** — all tasks contain actual code.
- **Type consistency** — `computeTotalError` exported and tested in Task 6, used in `handleSubmit`. `countryValues` (Map<ISO_A3, string>) built in `buildValuesMap`, returned from hook, consumed in Task 7 result view. `criterion.compute` / `criterion.format` defined in Task 5, used in Task 6. All consistent.
- **DailyLeaderboard** — the existing component expects `gameType` and `dailyKey` props and queries Firebase accordingly. The `RANKING` game type is new, so the leaderboard will be empty until players submit — this is correct behaviour.

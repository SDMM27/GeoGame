# Voyage Voyage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le jeu Voyage Voyage — le joueur relie deux pays via leurs frontières terrestres, pays par pays, en cherchant le chemin optimal.

**Architecture:** Un script génère les données de frontières depuis restcountries.com vers `countryBorders.js`. Les utilitaires BFS dans `voyageVoyageUtils.js` calculent le chemin optimal et sélectionnent les paires. Le hook `useVoyageVoyageState.js` gère l'état de jeu. La page `VoyageVoyagePage.jsx` orchestre la carte Leaflet et l'input.

**Tech Stack:** React 18, React-Leaflet 4, Vite, Vitest, Firebase Firestore, GeoJSON existant (`countriesWithDifficulty_FR.json`).

---

## File Map

| Statut | Fichier | Rôle |
|--------|---------|------|
| Créer | `scripts/generate-borders.mjs` | Génère countryBorders.js depuis restcountries.com |
| Créer | `src/data/countryBorders.js` | Données statiques `{ ISO_A2: [ISO_A2, ...] }` |
| Créer | `src/utils/voyageVoyageUtils.js` | BFS, sélection de paires, seed quotidienne |
| Créer | `src/utils/voyageVoyageUtils.test.js` | Tests des utilitaires |
| Créer | `src/hooks/useVoyageVoyageState.js` | Logique de jeu (état, guesses, timer, score) |
| Créer | `src/hooks/useVoyageVoyageState.test.js` | Tests de la logique de score |
| Créer | `src/components/VoyageVoyageMap.jsx` | Carte Leaflet (highlight multi-pays + ligne de chemin) |
| Créer | `src/pages/VoyageVoyagePage.jsx` | Page principale |
| Créer | `src/pages/VoyageVoyagePage.css` | Styles |
| Modifier | `src/utils/gameTypes.js` | Ajouter `VOYAGE_VOYAGE` |
| Modifier | `src/App.jsx` | Ajouter route `/voyage-voyage` |
| Modifier | `src/pages/HomePage.jsx` | Ajouter carte Voyage Voyage |

---

## Task 1: Ajouter le game type VOYAGE_VOYAGE

**Files:**
- Modify: `src/utils/gameTypes.js`

- [ ] **Step 1: Ajouter la constante**

Ouvrir `src/utils/gameTypes.js` et remplacer le contenu par :

```js
export const GAME_TYPES = {
    PLACEMENT: 'PLACEMENT',
    FLAGS: 'FLAGS',
    CAPITALS: 'CAPITALS',
    BORDER_GUESS: 'BORDER_GUESS',
    COUNTRY_CLUE: 'COUNTRY_CLUE',
    RANKING: 'RANKING',
    VOYAGE_VOYAGE: 'VOYAGE_VOYAGE',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/gameTypes.js
git commit -m "feat(voyage-voyage): add VOYAGE_VOYAGE game type constant"
```

---

## Task 2: Générer les données de frontières

**Files:**
- Create: `scripts/generate-borders.mjs`
- Create: `src/data/countryBorders.js` (généré par le script)

- [ ] **Step 1: Créer le script de génération**

Créer `scripts/generate-borders.mjs` :

```js
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Charger nos données GeoJSON pour construire le mapping ISO A3 → ISO A2
const raw = readFileSync(join(__dirname, '../src/data/countriesWithDifficulty_FR.json'), 'utf-8')
const geojson = JSON.parse(raw)

const isoA3ToA2 = {}
for (const feature of geojson.features) {
  const { ISO_A2, ISO_A3 } = feature.properties
  if (ISO_A3 && ISO_A2 && ISO_A3 !== '-99' && ISO_A2 !== '-99') {
    isoA3ToA2[ISO_A3] = ISO_A2
  }
}

// Récupérer les données de frontières depuis restcountries.com
console.log('Fetching border data from restcountries.com...')
const response = await fetch('https://restcountries.com/v3.1/all?fields=cca2,cca3,borders')
if (!response.ok) throw new Error(`HTTP ${response.status}`)
const data = await response.json()

const countryBorders = {}

for (const country of data) {
  const iso2 = country.cca2
  const borders = country.borders ?? []

  // Convertir ISO A3 → ISO A2 et ignorer les codes inconnus
  const neighborISO2s = borders
    .map(a3 => isoA3ToA2[a3])
    .filter(Boolean)

  // N'inclure que les pays avec au moins une frontière terrestre
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
```

- [ ] **Step 2: Exécuter le script**

```bash
node scripts/generate-borders.mjs
```

Expected output :
```
Fetching border data from restcountries.com...
Done. Generated 1XX countries with land borders.
```

Vérifier que `src/data/countryBorders.js` est créé et contient des entrées comme :
```js
"FR": ["ES", "AD", "MC", "IT", "CH", "DE", "LU", "BE"]
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-borders.mjs src/data/countryBorders.js
git commit -m "feat(voyage-voyage): add country border adjacency data"
```

---

## Task 3: Utilitaires BFS (TDD)

**Files:**
- Create: `src/utils/voyageVoyageUtils.js`
- Create: `src/utils/voyageVoyageUtils.test.js`

- [ ] **Step 1: Écrire les tests**

Créer `src/utils/voyageVoyageUtils.test.js` :

```js
import { describe, it, expect } from 'vitest'
import {
  findShortestPath,
  getOptimalLength,
  isNeighbor,
  getEligibleCountries,
  computeScore,
} from './voyageVoyageUtils'

// Graphe de test minimal
const testBorders = {
  A: ['B', 'C'],
  B: ['A', 'D'],
  C: ['A', 'D'],
  D: ['B', 'C', 'E'],
  E: ['D'],
  F: ['G'],
  G: ['F'],
}

describe('findShortestPath', () => {
  it('retourne [A] quand départ = arrivée', () => {
    expect(findShortestPath('A', 'A', testBorders)).toEqual(['A'])
  })

  it('trouve le chemin direct A→B (1 étape)', () => {
    expect(findShortestPath('A', 'B', testBorders)).toEqual(['A', 'B'])
  })

  it('trouve le chemin optimal A→D (2 étapes via B ou C)', () => {
    const path = findShortestPath('A', 'D', testBorders)
    expect(path).toHaveLength(3) // A + 1 intermédiaire + D
    expect(path[0]).toBe('A')
    expect(path[path.length - 1]).toBe('D')
  })

  it('trouve A→E (3 étapes)', () => {
    const path = findShortestPath('A', 'E', testBorders)
    expect(path).toHaveLength(4)
  })

  it('retourne null si aucun chemin possible (graphes disjoints)', () => {
    expect(findShortestPath('A', 'F', testBorders)).toBeNull()
  })
})

describe('getOptimalLength', () => {
  it('retourne 1 pour voisins directs', () => {
    expect(getOptimalLength('A', 'B', testBorders)).toBe(1)
  })

  it('retourne 2 pour A→D', () => {
    expect(getOptimalLength('A', 'D', testBorders)).toBe(2)
  })

  it('retourne null si pas de chemin', () => {
    expect(getOptimalLength('A', 'F', testBorders)).toBeNull()
  })
})

describe('isNeighbor', () => {
  it('retourne true pour deux pays voisins', () => {
    expect(isNeighbor('A', 'B', testBorders)).toBe(true)
  })

  it('retourne false pour deux pays non voisins', () => {
    expect(isNeighbor('A', 'D', testBorders)).toBe(false)
  })

  it('retourne false pour pays inconnu', () => {
    expect(isNeighbor('A', 'Z', testBorders)).toBe(false)
  })
})

describe('getEligibleCountries', () => {
  it('retourne uniquement les pays avec au moins une frontière', () => {
    const eligible = getEligibleCountries(testBorders)
    expect(eligible).toContain('A')
    expect(eligible).toContain('E')
    // Un pays sans frontière ne doit pas apparaître
    const noBorders = { X: [], Y: ['X'] }
    const e2 = getEligibleCountries(noBorders)
    expect(e2).not.toContain('X')
    expect(e2).toContain('Y')
  })
})

describe('computeScore', () => {
  it('score maximum quand chemin optimal sans erreur', () => {
    // optimalLength=3, stepsUsed=3, wrongGuesses=0 → 3*2 - 3 - 0 = 3
    expect(computeScore(3, 3, 0)).toBe(3)
  })

  it('pénalité pour les erreurs', () => {
    // optimalLength=3, stepsUsed=3, wrongGuesses=4 → 6 - 3 - 2 = 1
    expect(computeScore(3, 3, 4)).toBe(1)
  })

  it('pénalité pour étapes supplémentaires', () => {
    // optimalLength=3, stepsUsed=5, wrongGuesses=0 → 6 - 5 - 0 = 1
    expect(computeScore(3, 5, 0)).toBe(1)
  })

  it('score minimum est toujours 1', () => {
    expect(computeScore(2, 10, 20)).toBe(1)
  })
})
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd D:/NasaCode/GeoGame && npx vitest run src/utils/voyageVoyageUtils.test.js
```

Expected: FAIL — `Cannot find module './voyageVoyageUtils'`

- [ ] **Step 3: Implémenter les utilitaires**

Créer `src/utils/voyageVoyageUtils.js` :

```js
/**
 * Trouve le chemin le plus court entre deux pays (BFS).
 * @param {string} startISO - Code ISO A2 du pays de départ
 * @param {string} targetISO - Code ISO A2 du pays d'arrivée
 * @param {Record<string, string[]>} borders - Objet d'adjacence
 * @returns {string[] | null} Tableau de codes ISO du chemin, ou null si aucun chemin
 */
export function findShortestPath(startISO, targetISO, borders) {
  if (startISO === targetISO) return [startISO]
  const queue = [[startISO]]
  const visited = new Set([startISO])
  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]
    for (const neighbor of (borders[current] ?? [])) {
      if (neighbor === targetISO) return [...path, neighbor]
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return null
}

/**
 * Retourne le nombre minimal de frontières à traverser entre deux pays.
 * @returns {number | null}
 */
export function getOptimalLength(startISO, targetISO, borders) {
  const path = findShortestPath(startISO, targetISO, borders)
  return path ? path.length - 1 : null
}

/**
 * Vérifie si deux pays partagent une frontière terrestre.
 */
export function isNeighbor(isoA, isoB, borders) {
  return (borders[isoA] ?? []).includes(isoB)
}

/**
 * Retourne la liste des pays éligibles (au moins une frontière).
 */
export function getEligibleCountries(borders) {
  return Object.entries(borders)
    .filter(([, neighbors]) => neighbors.length > 0)
    .map(([iso]) => iso)
}

/**
 * Calcule le score final.
 * score = max(1, optimalLength × 2 - stepsUsed - wrongGuesses × 0.5)
 */
export function computeScore(optimalLength, stepsUsed, wrongGuessCount) {
  return Math.max(1, optimalLength * 2 - stepsUsed - wrongGuessCount * 0.5)
}

/**
 * Sélectionne une paire aléatoire de pays avec un chemin d'au moins minPathLength étapes.
 * @param {Record<string, string[]>} borders
 * @param {number} minPathLength - Nombre minimum d'étapes (défaut : 3)
 * @param {() => number} rng - Générateur de nombres aléatoires (défaut : Math.random)
 * @returns {{ startISO: string, targetISO: string, optimalLength: number }}
 */
export function selectRandomPair(borders, minPathLength = 3, rng = Math.random) {
  const eligible = getEligibleCountries(borders)
  for (let attempt = 0; attempt < 2000; attempt++) {
    const startISO = eligible[Math.floor(rng() * eligible.length)]
    const targetISO = eligible[Math.floor(rng() * eligible.length)]
    if (startISO === targetISO) continue
    const length = getOptimalLength(startISO, targetISO, borders)
    if (length !== null && length >= minPathLength) {
      return { startISO, targetISO, optimalLength: length }
    }
  }
  throw new Error('Impossible de trouver une paire valide après 2000 tentatives.')
}

/**
 * PRNG déterministe basé sur une chaîne (seed).
 * Utilisé pour le mode quotidien.
 */
function makeSeededRng(seed) {
  let s = seed.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    return (s >>> 0) / 0x100000000
  }
}

/**
 * Retourne la paire du jour (identique pour tous les joueurs).
 * @param {Record<string, string[]>} borders
 * @param {string} dateString - Format YYYY-MM-DD
 */
export function getDailyPair(borders, dateString) {
  const rng = makeSeededRng(dateString)
  return selectRandomPair(borders, 3, rng)
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
npx vitest run src/utils/voyageVoyageUtils.test.js
```

Expected: PASS — tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/utils/voyageVoyageUtils.js src/utils/voyageVoyageUtils.test.js
git commit -m "feat(voyage-voyage): add BFS utilities with tests"
```

---

## Task 4: Hook de jeu (TDD logique de score)

**Files:**
- Create: `src/hooks/useVoyageVoyageState.js`
- Create: `src/hooks/useVoyageVoyageState.test.js`

- [ ] **Step 1: Écrire les tests**

Créer `src/hooks/useVoyageVoyageState.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { computeScore, isNeighbor, findShortestPath } from '../utils/voyageVoyageUtils'

// Ces tests vérifient la logique pure extraite du hook
// (le hook lui-même est testé via l'UI)

const testBorders = {
  FR: ['ES', 'IT', 'DE'],
  ES: ['FR', 'PT'],
  IT: ['FR', 'AT', 'SI'],
  DE: ['FR', 'AT', 'CH'],
  PT: ['ES'],
  AT: ['IT', 'DE', 'SI'],
  SI: ['IT', 'AT'],
  CH: ['DE'],
}

describe('logique de validation de guess', () => {
  it('un pays voisin du dernier validé est accepté', () => {
    // Chaîne : [FR, IT] — le prochain guess doit être voisin de IT
    const lastISO = 'IT'
    expect(isNeighbor(lastISO, 'AT', testBorders)).toBe(true)
    expect(isNeighbor(lastISO, 'PT', testBorders)).toBe(false)
  })

  it('on peut atteindre SI depuis FR en 2 étapes', () => {
    const path = findShortestPath('FR', 'SI', testBorders)
    expect(path).toHaveLength(3) // FR → IT → SI
    expect(path[0]).toBe('FR')
    expect(path[path.length - 1]).toBe('SI')
  })
})

describe('computeScore — formule de score', () => {
  it('chemin parfait FR→SI en 2 étapes, 0 erreur : score = 2', () => {
    // optimal=2, steps=2, wrongs=0 → 2*2 - 2 - 0 = 2
    expect(computeScore(2, 2, 0)).toBe(2)
  })

  it('chemin parfait mais 2 erreurs : score = 1', () => {
    // optimal=2, steps=2, wrongs=2 → 4 - 2 - 1 = 1
    expect(computeScore(2, 2, 2)).toBe(1)
  })

  it('chemin non optimal (3 étapes au lieu de 2) sans erreur : score = 1', () => {
    // optimal=2, steps=3, wrongs=0 → 4 - 3 - 0 = 1
    expect(computeScore(2, 3, 0)).toBe(1)
  })

  it('grand chemin optimal (5 étapes), parfait : score = 5', () => {
    expect(computeScore(5, 5, 0)).toBe(5)
  })
})
```

- [ ] **Step 2: Vérifier que les tests passent (ils testent des fonctions déjà écrites)**

```bash
npx vitest run src/hooks/useVoyageVoyageState.test.js
```

Expected: PASS.

- [ ] **Step 3: Implémenter le hook**

Créer `src/hooks/useVoyageVoyageState.js` :

```js
import { useState, useEffect, useRef, useCallback } from 'react'
import countries from '../data/countriesWithDifficulty_FR.json'
import { countryBorders } from '../data/countryBorders'
import {
  isNeighbor,
  getOptimalLength,
  selectRandomPair,
  getDailyPair,
  computeScore,
} from '../utils/voyageVoyageUtils'
import { checkAnswer } from '../utils/normalizeAnswer'

/** Trouve une feature GeoJSON par son code ISO A2 */
function getFeatureByISO(iso) {
  return countries.features.find(f => f.properties.ISO_A2 === iso) ?? null
}

/** Trouve une feature GeoJSON à partir d'une saisie utilisateur (nom ou alias) */
function findFeatureByInput(input) {
  return countries.features.find(f =>
    checkAnswer(input, f.properties.ADMIN, f.properties.aliases)
  ) ?? null
}

export default function useVoyageVoyageState(mode = 'infinite') {
  const [startCountry, setStartCountry] = useState(null)
  const [targetCountry, setTargetCountry] = useState(null)
  const [validatedChain, setValidatedChain] = useState([])
  const [wrongGuesses, setWrongGuesses] = useState([])
  const [optimalLength, setOptimalLength] = useState(0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [score, setScore] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef(null)

  const initGame = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const { startISO, targetISO, optimalLength: ol } =
      mode === 'daily'
        ? getDailyPair(countryBorders, dateStr)
        : selectRandomPair(countryBorders)

    const start = getFeatureByISO(startISO)
    const target = getFeatureByISO(targetISO)
    if (!start || !target) return

    setStartCountry(start)
    setTargetCountry(target)
    setValidatedChain([start])
    setWrongGuesses([])
    setOptimalLength(ol)
    setIsGameOver(false)
    setScore(null)
    setElapsedTime(0)
  }, [mode])

  // Initialiser au montage et quand le mode change
  useEffect(() => { initGame() }, [initGame])

  // Timer — s'arrête quand la partie est terminée
  useEffect(() => {
    clearInterval(timerRef.current)
    if (isGameOver) return
    timerRef.current = setInterval(() => {
      setElapsedTime(t => t + 100)
    }, 100)
    return () => clearInterval(timerRef.current)
  }, [isGameOver])

  const submitGuess = useCallback((input) => {
    if (isGameOver || !input.trim()) return

    const feature = findFeatureByInput(input)
    if (!feature) return // pays non reconnu — on ignore silencieusement

    const guessISO = feature.properties.ISO_A2
    const lastISO = validatedChain[validatedChain.length - 1].properties.ISO_A2

    if (!isNeighbor(lastISO, guessISO, countryBorders)) {
      // Mauvaise tentative — afficher en rouge
      setWrongGuesses(prev => [...prev, feature])
      return
    }

    // Bonne tentative — ajouter à la chaîne
    const newChain = [...validatedChain, feature]
    setValidatedChain(newChain)

    if (guessISO === targetCountry.properties.ISO_A2) {
      // Arrivée !
      const stepsUsed = newChain.length - 1
      setScore(computeScore(optimalLength, stepsUsed, wrongGuesses.length))
      setIsGameOver(true)
    }
  }, [isGameOver, validatedChain, targetCountry, wrongGuesses, optimalLength])

  return {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    optimalLength,
    isGameOver,
    score,
    elapsedTime,
    submitGuess,
    resetGame: initGame,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useVoyageVoyageState.js src/hooks/useVoyageVoyageState.test.js
git commit -m "feat(voyage-voyage): add game state hook"
```

---

## Task 5: Composant carte

**Files:**
- Create: `src/components/VoyageVoyageMap.jsx`

- [ ] **Step 1: Créer le composant**

Créer `src/components/VoyageVoyageMap.jsx` :

```jsx
import { useEffect } from 'react'
import { MapContainer, GeoJSON, Polyline, useMap } from 'react-leaflet'
import { normalizeWrappedCountry } from '../utils/borderGuessMap'
import 'leaflet/dist/leaflet.css'

/**
 * Calcule le centroïde approximatif d'une feature GeoJSON (pour la ligne de chemin).
 * @param {object} feature - Feature GeoJSON
 * @returns {[number, number]} [lat, lng] pour Leaflet
 */
function getCentroid(feature) {
  const normalized = normalizeWrappedCountry(feature)
  const geom = normalized.geometry
  const ring =
    geom.type === 'MultiPolygon'
      ? geom.coordinates[0][0]
      : geom.coordinates[0]
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length
  return [lat, lng]
}

/** Style Leaflet pour chaque feature selon son rôle dans le jeu */
function getCountryStyle(feature, startISO, targetISO, chainISOs, wrongISOs) {
  const iso = feature.properties.ISO_A2
  if (chainISOs.includes(iso)) {
    return { fillColor: '#4ade80', fillOpacity: 0.6, color: '#166534', weight: 2 }
  }
  if (iso === targetISO) {
    return { fillColor: '#f59e0b', fillOpacity: 0.6, color: '#78350f', weight: 2 }
  }
  if (wrongISOs.includes(iso)) {
    return { fillColor: '#ef4444', fillOpacity: 0.35, color: '#7f1d1d', weight: 1 }
  }
  return { fillColor: '#334155', fillOpacity: 0.12, color: '#475569', weight: 0.5 }
}

/** Composant interne pour ajuster les bounds de la carte via useMap() */
function MapController({ validatedChain, wrongGuesses, targetCountry }) {
  const map = useMap()

  useEffect(() => {
    const highlighted = [...validatedChain, ...wrongGuesses, targetCountry].filter(Boolean)
    if (highlighted.length === 0) return
    const centroids = highlighted.map(getCentroid)
    const lats = centroids.map(c => c[0])
    const lngs = centroids.map(c => c[1])
    const pad = 8
    const bounds = [
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ]
    map.fitBounds(bounds, { padding: [20, 20], animate: false })
  }, [map, validatedChain, wrongGuesses, targetCountry])

  return null
}

/**
 * Carte Leaflet pour Voyage Voyage.
 * Affiche tous les pays du monde en gris, avec les pays de la chaîne (vert),
 * la destination (orange), et les mauvaises tentatives (rouge).
 * Trace une ligne verte entre les pays validés.
 */
export default function VoyageVoyageMap({
  allCountries,
  startCountry,
  targetCountry,
  validatedChain,
  wrongGuesses,
}) {
  const startISO = startCountry?.properties.ISO_A2 ?? ''
  const targetISO = targetCountry?.properties.ISO_A2 ?? ''
  const chainISOs = validatedChain.map(f => f.properties.ISO_A2)
  const wrongISOs = wrongGuesses.map(f => f.properties.ISO_A2)

  // Clé pour forcer le re-rendu du GeoJSON quand les listes changent
  const geoJsonKey = `${chainISOs.join(',')}-${wrongISOs.join(',')}`

  // Positions du chemin validé (pour la Polyline)
  const chainCentroids = validatedChain.map(getCentroid)

  return (
    <MapContainer
      style={{ width: '100%', height: '400px', background: '#0f172a' }}
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      attributionControl={false}
    >
      <MapController
        validatedChain={validatedChain}
        wrongGuesses={wrongGuesses}
        targetCountry={targetCountry}
      />

      <GeoJSON
        key={geoJsonKey}
        data={allCountries}
        style={(feature) =>
          getCountryStyle(feature, startISO, targetISO, chainISOs, wrongISOs)
        }
        onEachFeature={(feature, layer) => {
          const iso = feature.properties.ISO_A2
          const isHighlighted = chainISOs.includes(iso) || iso === targetISO || wrongISOs.includes(iso)
          if (isHighlighted) {
            layer.bindTooltip(feature.properties.ADMIN, {
              permanent: true,
              direction: 'center',
              className: 'voyage-map-label',
            })
          }
        }}
      />

      {chainCentroids.length > 1 && (
        <Polyline
          positions={chainCentroids}
          color="#4ade80"
          weight={2}
          opacity={0.7}
          dashArray={null}
        />
      )}
    </MapContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VoyageVoyageMap.jsx
git commit -m "feat(voyage-voyage): add Leaflet map component"
```

---

## Task 6: Page et styles

**Files:**
- Create: `src/pages/VoyageVoyagePage.jsx`
- Create: `src/pages/VoyageVoyagePage.css`

- [ ] **Step 1: Créer le CSS**

Créer `src/pages/VoyageVoyagePage.css` :

```css
/* ───── Layout principal ───── */
.voyage-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-primary, #0f172a);
  color: #e2e8f0;
  font-family: inherit;
}

/* ───── Header : pays départ / arrivée ───── */
.voyage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  gap: 12px;
}

.voyage-country {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 90px;
}

.voyage-country img {
  height: 32px;
  border-radius: 3px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}

.voyage-country span {
  font-size: 0.85em;
  font-weight: 600;
}

.voyage-country small {
  font-size: 0.68em;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.voyage-start span { color: #4ade80; }
.voyage-target span { color: #f59e0b; }

.voyage-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 0.8em;
  color: #94a3b8;
}

/* ───── Carte ───── */
.voyage-map-container {
  flex: 1;
  min-height: 300px;
}

/* Labels sur la carte */
.voyage-map-label {
  background: rgba(15, 23, 42, 0.85) !important;
  border: 1px solid #475569 !important;
  color: #e2e8f0 !important;
  font-size: 0.72em !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  white-space: nowrap;
  box-shadow: none !important;
}

/* ───── Chaîne validée ───── */
.voyage-chain {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px 16px;
  background: #0f172a;
  border-top: 1px solid #1e293b;
  min-height: 44px;
}

.voyage-chain-sep {
  color: #334155;
  font-size: 1em;
}

.voyage-chain-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #166534;
  color: #4ade80;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.voyage-chain-badge img {
  height: 14px;
  border-radius: 2px;
}

.voyage-chain-empty {
  background: #1e293b;
  border: 1px dashed #475569;
  color: #64748b;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}

/* ───── Input ───── */
.voyage-input-row {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #1e293b;
  border-top: 1px solid #334155;
}

.voyage-input-row input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  outline: none;
  transition: border-color 0.15s;
}

.voyage-input-row input:focus {
  border-color: #3b82f6;
}

.voyage-input-row input::placeholder {
  color: #475569;
}

.voyage-input-row button {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background 0.15s;
}

.voyage-input-row button:hover {
  background: #2563eb;
}

/* ───── Écran de résultat ───── */
.voyage-result {
  padding: 20px 16px;
  background: #1e293b;
  border-top: 1px solid #334155;
  text-align: center;
}

.voyage-result p {
  margin: 4px 0;
  font-size: 0.95em;
  color: #cbd5e1;
}

.voyage-result strong {
  color: #f59e0b;
}

.voyage-result button {
  margin-top: 12px;
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 9px 24px;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
}

.voyage-result button:hover {
  background: #2563eb;
}

/* ───── Barre de statut ───── */
.voyage-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #0f172a;
  border-top: 1px solid #1e293b;
  font-size: 0.78em;
  color: #64748b;
}

.voyage-mode-toggle {
  display: flex;
  gap: 4px;
}

.voyage-mode-toggle button {
  background: transparent;
  border: 1px solid #334155;
  color: #64748b;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.15s;
}

.voyage-mode-toggle button.active {
  background: #1e293b;
  border-color: #3b82f6;
  color: #93c5fd;
}
```

- [ ] **Step 2: Créer la page**

Créer `src/pages/VoyageVoyagePage.jsx` :

```jsx
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import VoyageVoyageMap from '../components/VoyageVoyageMap'
import useVoyageVoyageState from '../hooks/useVoyageVoyageState'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import './VoyageVoyagePage.css'

export default function VoyageVoyagePage() {
  const location = useLocation()
  const [mode, setMode] = useState(location.state?.mode ?? 'infinite')
  const [input, setInput] = useState('')

  const {
    startCountry,
    targetCountry,
    validatedChain,
    wrongGuesses,
    optimalLength,
    isGameOver,
    score,
    elapsedTime,
    submitGuess,
    resetGame,
  } = useVoyageVoyageState(mode)

  const handleSubmit = (e) => {
    e.preventDefault()
    submitGuess(input)
    setInput('')
  }

  const lastValidated = validatedChain[validatedChain.length - 1]
  const stepsUsed = validatedChain.length - 1

  return (
    <div className="voyage-page">
      <NavBar />

      {/* Header — pays départ & arrivée */}
      <div className="voyage-header">
        <div className="voyage-country voyage-start">
          {startCountry && (
            <>
              <img
                src={`/flags/${startCountry.properties.ISO_A2}.png`}
                alt={startCountry.properties.ADMIN}
              />
              <span>{startCountry.properties.ADMIN}</span>
              <small>Départ</small>
            </>
          )}
        </div>

        <div className="voyage-stats">
          <span>{stepsUsed} étape{stepsUsed > 1 ? 's' : ''}</span>
          <span>{wrongGuesses.length} erreur{wrongGuesses.length > 1 ? 's' : ''}</span>
        </div>

        <div className="voyage-country voyage-target">
          {targetCountry && (
            <>
              <img
                src={`/flags/${targetCountry.properties.ISO_A2}.png`}
                alt={targetCountry.properties.ADMIN}
              />
              <span>{targetCountry.properties.ADMIN}</span>
              <small>Arrivée</small>
            </>
          )}
        </div>
      </div>

      {/* Carte */}
      <div className="voyage-map-container">
        {startCountry && targetCountry && (
          <VoyageVoyageMap
            allCountries={countries}
            startCountry={startCountry}
            targetCountry={targetCountry}
            validatedChain={validatedChain}
            wrongGuesses={wrongGuesses}
          />
        )}
      </div>

      {/* Chaîne validée */}
      <div className="voyage-chain">
        {validatedChain.map((feature, i) => (
          <span key={feature.properties.ISO_A2} className="voyage-chain-item">
            {i > 0 && <span className="voyage-chain-sep">›</span>}
            <span className="voyage-chain-badge">
              <img
                src={`/flags/${feature.properties.ISO_A2}.png`}
                alt=""
              />
              {feature.properties.ADMIN}
            </span>
          </span>
        ))}
        {!isGameOver && (
          <>
            <span className="voyage-chain-sep">›</span>
            <span className="voyage-chain-empty">?</span>
          </>
        )}
      </div>

      {/* Input ou résultat */}
      {!isGameOver ? (
        <form className="voyage-input-row" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lastValidated
                ? `Pays voisin de ${lastValidated.properties.ADMIN}…`
                : 'Chargement…'
            }
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit">→</button>
        </form>
      ) : (
        <div className="voyage-result">
          <p>
            🎉 Arrivé en <strong>{stepsUsed}</strong> étape{stepsUsed > 1 ? 's' : ''}{' '}
            (optimal : {optimalLength}) !
          </p>
          <p>
            Score : <strong>{score?.toFixed(1)}</strong> · Temps :{' '}
            {formatTime(elapsedTime)} · Erreurs : {wrongGuesses.length}
          </p>
          <button onClick={resetGame}>Rejouer</button>
        </div>
      )}

      {/* Barre de statut */}
      <div className="voyage-status-bar">
        <span>⏱ {formatTime(elapsedTime)}</span>
        <div className="voyage-mode-toggle">
          <button
            className={mode === 'daily' ? 'active' : ''}
            onClick={() => setMode('daily')}
          >
            Quotidien
          </button>
          <button
            className={mode === 'infinite' ? 'active' : ''}
            onClick={() => setMode('infinite')}
          >
            Infini
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/VoyageVoyagePage.jsx src/pages/VoyageVoyagePage.css
git commit -m "feat(voyage-voyage): add page component and styles"
```

---

## Task 7: Route et carte homepage

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Ajouter la route dans App.jsx**

Dans `src/App.jsx`, ajouter l'import en haut avec les autres pages :

```jsx
import VoyageVoyagePage from "./pages/VoyageVoyagePage";
```

Puis ajouter la route dans `<Routes>`, après la route `country-clue` :

```jsx
<Route path="/voyage-voyage" element={<VoyageVoyagePage />} />
```

- [ ] **Step 2: Ajouter la carte dans HomePage.jsx**

Dans `src/pages/HomePage.jsx`, ajouter l'entrée dans le tableau `GAMES` (après l'entrée `BORDER_GUESS`) :

```jsx
{
  id: GAME_TYPES.VOYAGE_VOYAGE,
  icon: "✈️",
  title: "Voyage Voyage",
  description: "Relie deux pays en passant par leurs frontières communes. Trouve le chemin le plus court !",
  route: "/voyage-voyage",
  cardType: "voyage",
  active: true,
},
```

Ajouter la fonction de carte Voyage Voyage (après `BorderGuessCard`) :

```jsx
function VoyageVoyageCard({ game }) {
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
            ? "Une seule route par jour, identique pour tous les joueurs."
            : "Une nouvelle route à chaque partie, sans limite."}
        </div>
        <div className="game-card-buttons">
          <button
            className="btn-play"
            onClick={() => navigate(game.route, { state: { mode } })}
          >
            Jouer
          </button>
        </div>
      </div>
    </div>
  );
}
```

Dans la zone de rendu des cartes de `HomePage.jsx`, remplacer le bloc ternaire existant :

```jsx
{GAMES.filter((game) => game.active).map((game) =>
  game.id === GAME_TYPES.BORDER_GUESS ? (
    <BorderGuessCard key={game.id} game={game} />
  ) : game.id === GAME_TYPES.COUNTRY_CLUE ? (
    <CountryClueCard key={game.id} game={game} />
  ) : game.cardType === "ranking" ? (
    <RankingCard key={game.id} game={game} />
  ) : (
    <ActiveGameCard key={game.id} game={game} />
  )
)}
```

par :

```jsx
{GAMES.filter((game) => game.active).map((game) =>
  game.id === GAME_TYPES.BORDER_GUESS ? (
    <BorderGuessCard key={game.id} game={game} />
  ) : game.id === GAME_TYPES.COUNTRY_CLUE ? (
    <CountryClueCard key={game.id} game={game} />
  ) : game.cardType === "ranking" ? (
    <RankingCard key={game.id} game={game} />
  ) : game.cardType === "voyage" ? (
    <VoyageVoyageCard key={game.id} game={game} />
  ) : (
    <ActiveGameCard key={game.id} game={game} />
  )
)}
```

- [ ] **Step 3: Vérifier le build**

```bash
cd D:/NasaCode/GeoGame && npm run build
```

Expected: build sans erreur.

- [ ] **Step 4: Lancer le dev server et tester manuellement**

```bash
npm run dev
```

Vérifier :
- La page d'accueil affiche la carte "Voyage Voyage" avec les onglets Journalier/Infini
- Naviguer vers `/voyage-voyage` — deux pays s'affichent sur la carte
- Taper un pays voisin valide → il apparaît en vert dans la chaîne et sur la carte
- Taper un pays non-voisin → il apparaît en rouge sur la carte
- Atteindre le pays cible → écran de résultat avec score

- [ ] **Step 5: Lancer tous les tests**

```bash
npx vitest run
```

Expected: tous les tests existants + les nouveaux passent.

- [ ] **Step 6: Commit final**

```bash
git add src/App.jsx src/pages/HomePage.jsx
git commit -m "feat(voyage-voyage): wire route and homepage card"
```

---

## Résumé des commits

1. `feat(voyage-voyage): add VOYAGE_VOYAGE game type constant`
2. `feat(voyage-voyage): add country border adjacency data`
3. `feat(voyage-voyage): add BFS utilities with tests`
4. `feat(voyage-voyage): add game state hook`
5. `feat(voyage-voyage): add Leaflet map component`
6. `feat(voyage-voyage): add page component and styles`
7. `feat(voyage-voyage): wire route and homepage card`

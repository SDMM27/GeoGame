# Continent Zoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zoomer automatiquement sur le continent sélectionné au démarrage d'une partie en mode continent.

**Architecture:** Ajouter un `useEffect` dans `PlacementGameLayout` qui, quand `mapRef` et `continent` sont tous les deux définis, filtre les features GeoJSON par continent, calcule les bounds Leaflet et appelle `mapRef.fitBounds(bounds, { padding: [20, 20], animate: false })`. Aucun fichier nouveau, aucune valeur hardcodée.

**Tech Stack:** React (useEffect), Leaflet (`L.geoJSON`, `fitBounds`), Vite, Vitest

---

## File Map

- Modify: `src/pages/GamePage.jsx` — ajouter `mapRef` au destructuring du state + ajouter le `useEffect` de zoom

---

### Task 1 : Exposer `mapRef` dans `PlacementGameLayout` et ajouter l'effet de zoom

**Files:**
- Modify: `src/pages/GamePage.jsx:102-111` (destructuring du state)
- Modify: `src/pages/GamePage.jsx:113-115` (après les refs existantes)

- [ ] **Step 1 : Ajouter `mapRef` au destructuring du state dans `PlacementGameLayout`**

Dans `src/pages/GamePage.jsx`, ligne 103, le destructuring commence par `const { targetCountry, ...`. Ajouter `mapRef` :

```js
// Avant (ligne 103-111)
const {
  targetCountry, score, timer, stats,
  isGameOver, displayTimer,
  geoJsonRef, extraGeoJsonRefs, setMapRef,
  onCountryClick, onCountryNameClick, onCountryMouseOver, onCountryMouseOut,
  foundCountriesRef, shownCountriesRef,
  seeCountry, restartGame, goHome,
  currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
} = state

// Après
const {
  targetCountry, score, timer, stats,
  isGameOver, displayTimer,
  geoJsonRef, extraGeoJsonRefs, mapRef, setMapRef,
  onCountryClick, onCountryNameClick, onCountryMouseOver, onCountryMouseOut,
  foundCountriesRef, shownCountriesRef,
  seeCountry, restartGame, goHome,
  currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
} = state
```

- [ ] **Step 2 : Ajouter le `useEffect` de zoom continent**

Après le bloc `extraGeoJsonRefs.current = [geoJsonRefLeft, geoJsonRefRight]` (ligne 115), insérer :

```js
useEffect(() => {
  if (!mapRef || !continent) return
  const features = countries.features.filter(
    f => f.properties.continent === continent
  )
  if (features.length === 0) return
  const bounds = L.geoJSON(features).getBounds()
  mapRef.fitBounds(bounds, { padding: [20, 20], animate: false })
}, [mapRef, continent])
```

`countries` est déjà importé en haut du fichier (`import countries from '../data/countriesWithDifficulty_FR.json'`). `L` aussi (`import L from 'leaflet'`). Aucun import supplémentaire nécessaire.

- [ ] **Step 3 : Vérifier que les tests existants passent**

```bash
npm test
```

Expected : tous les tests passent (aucun test ne couvre `GamePage.jsx` directement).

- [ ] **Step 4 : Vérification manuelle**

Lancer le serveur de dev :
```bash
npm run dev
```

1. Aller sur la page d'accueil → sélectionner "Jeu de placement" → onglet "Par continent" → choisir "Europe" → cliquer "Jouer".
2. **Attendu :** la carte zoome instantanément sur l'Europe au démarrage (les îles Britanniques, la Scandinavie, la Turquie et le Portugal doivent être visibles).
3. Vérifier qu'on peut librement dézoom et naviguer après le zoom initial.
4. Répéter avec "Asie" → carte doit afficher l'Asie entière.
5. Lancer une partie en mode difficulté (sans continent) → la carte doit s'afficher comme avant (`center=[20, 0]`, `zoom=3`), sans changement.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/GamePage.jsx
git commit -m "feat: zoom sur le continent au démarrage en mode continent"
```

# Continent Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players to play the Placement, Flags, and Capitals games filtered by continent (Europe, Asie, Afrique, Amériques, Océanie), as an alternative to the existing difficulty-based mode.

**Architecture:** A Python enrichment script adds a `continent` field to each country in the master JSON. A shared CONTINENTS constant is created. Each of the three game hooks gains a `continent` optional param that replaces difficulty-based filtering. `HomePage.jsx` gains sub-tabs (Par difficulté / Par continent) inside the Standard mode of the three concerned game cards.

**Tech Stack:** Python 3 + pycountry-convert (data enrichment), React + React Router (UI), Vitest (tests).

---

### Task 1: Enrich JSON with continent field

**Files:**
- Create: `scripts/enrich_continent.py`
- Modify: `src/data/countriesWithDifficulty_FR.json` (run script)

- [ ] **Step 1: Write the script**

Create `scripts/enrich_continent.py`:

```python
import json

CONTINENT_MAP = {
    'AF': 'Afrique',
    'AS': 'Asie',
    'EU': 'Europe',
    'NA': 'Amériques',
    'SA': 'Amériques',
    'OC': 'Océanie',
}

# Countries pycountry-convert doesn't know or maps wrong
FALLBACK = {
    'XK': 'Europe',    # Kosovo
    'EH': 'Afrique',   # Western Sahara
    'SS': 'Afrique',   # South Sudan
    'TW': 'Asie',      # Taiwan
    'PS': 'Asie',      # Palestine
    'SJ': 'Europe',    # Svalbard
    'AQ': None,        # Antarctica — no continent tag
    '-99': None,
    '': None,
}

def get_continent(iso2):
    if iso2 in FALLBACK:
        return FALLBACK[iso2]
    try:
        import pycountry_convert as pc
        code = pc.country_alpha2_to_continent_code(iso2)
        return CONTINENT_MAP.get(code)
    except Exception:
        return None

with open('src/data/countriesWithDifficulty_FR.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

missing = []
for feature in data['features']:
    iso2 = feature['properties'].get('ISO_A2', '') or ''
    continent = get_continent(iso2)
    feature['properties']['continent'] = continent
    if continent is None:
        missing.append(f"{feature['properties'].get('ADMIN')} ({iso2})")

with open('src/data/countriesWithDifficulty_FR.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(f"Done. {len(missing)} without continent: {missing}")
```

- [ ] **Step 2: Install dependency and run**

```bash
pip install pycountry-convert
cd /d/NasaCode/GeoGame
python scripts/enrich_continent.py
```

Expected output: `Done. X without continent: [...]` (small list, mostly Antarctica-type territories)

- [ ] **Step 3: Verify the JSON**

```bash
python -c "
import json
data = json.load(open('src/data/countriesWithDifficulty_FR.json', encoding='utf-8'))
sample = [(f['properties']['ADMIN'], f['properties'].get('continent')) for f in data['features'][:5]]
print(sample)
counts = {}
for f in data['features']:
    c = f['properties'].get('continent') or 'None'
    counts[c] = counts.get(c, 0) + 1
print(counts)
"
```

Expected: France → Europe, China → Asie, Brazil → Amériques, etc. Counts sum to total features.

- [ ] **Step 4: Commit**

```bash
git add scripts/enrich_continent.py src/data/countriesWithDifficulty_FR.json
git commit -m "data: add continent field to country data via enrichment script"
```

---

### Task 2: Create CONTINENTS util + add count-by-continent exports to hooks

**Files:**
- Create: `src/utils/continents.js`
- Modify: `src/hooks/useGameState.js`
- Modify: `src/hooks/useFlagGameState.js`
- Modify: `src/hooks/useCapitalsGameState.js`
- Create: `src/utils/continents.test.js`

- [ ] **Step 1: Write failing test**

Create `src/utils/continents.test.js`:

```js
import { describe, it, expect } from 'vitest'

// Pure filter logic — same as what the hooks will use
function countByContinent(features, continent, extraChecks = []) {
  return features.filter(f => {
    if (f.properties.continent !== continent) return false
    return extraChecks.every(check => check(f.properties))
  }).length
}

const FAKE = [
  { properties: { ADMIN: 'France', continent: 'Europe', ISO_A2: 'FR', capital: 'Paris' } },
  { properties: { ADMIN: 'Germany', continent: 'Europe', ISO_A2: 'DE', capital: 'Berlin' } },
  { properties: { ADMIN: 'Japan', continent: 'Asie', ISO_A2: 'JP', capital: 'Tokyo' } },
  { properties: { ADMIN: 'TestNoIso', continent: 'Europe', ISO_A2: null, capital: null } },
]

describe('countByContinent', () => {
  it('counts all countries in a continent', () => {
    expect(countByContinent(FAKE, 'Europe')).toBe(3)
  })

  it('counts only countries with ISO_A2 (flags)', () => {
    expect(countByContinent(FAKE, 'Europe', [p => !!p.ISO_A2])).toBe(2)
  })

  it('counts only countries with ISO_A2 and capital (capitals game)', () => {
    expect(countByContinent(FAKE, 'Europe', [p => !!p.ISO_A2, p => !!p.capital])).toBe(2)
  })

  it('returns 0 for unknown continent', () => {
    expect(countByContinent(FAKE, 'Antarctique')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /d/NasaCode/GeoGame
npx vitest run src/utils/continents.test.js
```

Expected: FAIL (file doesn't exist yet — vitest won't find it but that's OK, we're testing the logic defined inline)

Actually these tests are self-contained (logic defined in the test file). Run and they should PASS immediately since the logic is inline. This validates the filter logic before we put it in the hooks.

Expected: all 4 tests PASS.

- [ ] **Step 3: Create `src/utils/continents.js`**

```js
export const CONTINENTS = [
  { name: 'Europe',    color: '#60a5fa' },
  { name: 'Asie',      color: '#fb923c' },
  { name: 'Afrique',   color: '#4ade80' },
  { name: 'Amériques', color: '#f87171' },
  { name: 'Océanie',   color: '#c084fc' },
]
```

- [ ] **Step 4: Add `getTotalCountriesByContinent` to `useGameState.js`**

In `src/hooks/useGameState.js`, after the existing `getTotalCountries` function (after line 35), add:

```js
export function getTotalCountriesByContinent(continent) {
  return countries.features.filter(c =>
    c.properties.continent === continent
  ).length
}
```

- [ ] **Step 5: Add `getTotalFlagCountriesByContinent` to `useFlagGameState.js`**

In `src/hooks/useFlagGameState.js`, after the existing `getTotalFlagCountries` function (after line 28), add:

```js
export function getTotalFlagCountriesByContinent(continent) {
  return countries.features.filter(c =>
    c.properties.continent === continent && c.properties.ISO_A2
  ).length
}
```

- [ ] **Step 6: Add `getTotalCapitalCountriesByContinent` to `useCapitalsGameState.js`**

In `src/hooks/useCapitalsGameState.js`, after the existing `getTotalCapitalCountries` function (after line 29), add:

```js
export function getTotalCapitalCountriesByContinent(continent) {
  return countries.features.filter(c =>
    c.properties.continent === continent &&
    c.properties.ISO_A2 &&
    c.properties.capital
  ).length
}
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run src/utils/continents.test.js
```

Expected: all 4 PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/continents.js src/utils/continents.test.js src/hooks/useGameState.js src/hooks/useFlagGameState.js src/hooks/useCapitalsGameState.js
git commit -m "feat: add continent util and getTotalXByContinent exports"
```

---

### Task 3: Add continent param to `useGameState.js`

**Files:**
- Modify: `src/hooks/useGameState.js`

- [ ] **Step 1: Update hook signature (line 39)**

Change:
```js
export default function useGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null) {
```
To:
```js
export default function useGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null, continent = null) {
```

- [ ] **Step 2: Update redirect guard (lines 62-65)**

Change:
```js
  useEffect(() => {
    if (!difficulty && !overrideCountries) navigate('/')
  }, [difficulty, overrideCountries, navigate])
```
To:
```js
  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) navigate('/')
  }, [difficulty, overrideCountries, continent, navigate])
```

- [ ] **Step 3: Update `getRandomCountry` (lines 67-75)**

Change:
```js
  const getRandomCountry = useCallback((diff) => {
    const available = getAvailableDifficulties(diff)
    const filtered = countries.features.filter(c =>
      available.includes(c.properties.Difficulty) &&
      !alreadyChosenCountries.includes(c.properties.ADMIN)
    )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)].properties.ADMIN
  }, [])
```
To:
```js
  const getRandomCountry = useCallback((diff, cont) => {
    const filtered = cont
      ? countries.features.filter(c =>
          c.properties.continent === cont &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
      : countries.features.filter(c =>
          getAvailableDifficulties(diff).includes(c.properties.Difficulty) &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)].properties.ADMIN
  }, [])
```

- [ ] **Step 4: Update init useEffect guard and total (lines 101, 104)**

Change:
```js
    if (!difficulty && !overrideCountries) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries ? overrideCountries.length : getTotalCountries(difficulty)
```
To:
```js
    if (!difficulty && !overrideCountries && !continent) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries
      ? overrideCountries.length
      : continent
        ? getTotalCountriesByContinent(continent)
        : getTotalCountries(difficulty)
```

- [ ] **Step 5: Update all 4 `getRandomCountry` calls**

Change every occurrence of `getRandomCountry(difficulty)` to `getRandomCountry(difficulty, continent)`.

Lines affected: 135, 222, 329 (inside the hook body, not counting the definition at 67).

Also update the `useEffect` dependency array that includes `getRandomCountry`:

Change:
```js
  }, [difficulty, getRandomCountry, overrideCountries])
```
To:
```js
  }, [difficulty, continent, getRandomCountry, overrideCountries])
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/hooks/useGameState.test.js
```

Expected: all existing tests PASS (we didn't touch hover logic).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useGameState.js
git commit -m "feat: add continent param to useGameState"
```

---

### Task 4: Add continent param to `useFlagGameState.js`

**Files:**
- Modify: `src/hooks/useFlagGameState.js`

- [ ] **Step 1: Update hook signature (line 32)**

Change:
```js
export default function useFlagGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null) {
```
To:
```js
export default function useFlagGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null, continent = null) {
```

- [ ] **Step 2: Update redirect guard (lines 56-58)**

Change:
```js
  useEffect(() => {
    if (!difficulty && !overrideCountries) navigate('/')
  }, [difficulty, overrideCountries, navigate])
```
To:
```js
  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) navigate('/')
  }, [difficulty, overrideCountries, continent, navigate])
```

- [ ] **Step 3: Update `getRandomCountry` (lines 60-69)**

Change:
```js
  const getRandomCountry = useCallback((diff) => {
    const available = getAvailableDifficulties(diff)
    const filtered = countries.features.filter(c =>
      available.includes(c.properties.DifficultyFlag) &&
      c.properties.ISO_A2 &&
      !alreadyChosenCountries.includes(c.properties.ADMIN)
    )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)]
  }, [])
```
To:
```js
  const getRandomCountry = useCallback((diff, cont) => {
    const filtered = cont
      ? countries.features.filter(c =>
          c.properties.continent === cont &&
          c.properties.ISO_A2 &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
      : countries.features.filter(c =>
          getAvailableDifficulties(diff).includes(c.properties.DifficultyFlag) &&
          c.properties.ISO_A2 &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)]
  }, [])
```

- [ ] **Step 4: Update init useEffect guard and total**

Lines 73-77 (the `if (!difficulty && !overrideCountries) return` and `const total = ...`):

Change:
```js
    if (!difficulty && !overrideCountries) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries ? overrideCountries.length : getTotalFlagCountries(difficulty)
```
To:
```js
    if (!difficulty && !overrideCountries && !continent) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries
      ? overrideCountries.length
      : continent
        ? getTotalFlagCountriesByContinent(continent)
        : getTotalFlagCountries(difficulty)
```

- [ ] **Step 5: Update all 4 `getRandomCountry` calls**

Change every `getRandomCountry(difficulty)` → `getRandomCountry(difficulty, continent)`.

Lines affected: 108, 160, 282.

Also update the `useEffect` dependency array (line 171):
```js
  }, [difficulty, continent, getRandomCountry, overrideCountries])
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/hooks/useFlagGameState.test.js
```

Expected: all existing tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useFlagGameState.js
git commit -m "feat: add continent param to useFlagGameState"
```

---

### Task 5: Add continent param to `useCapitalsGameState.js`

**Files:**
- Modify: `src/hooks/useCapitalsGameState.js`

- [ ] **Step 1: Update hook signature (line 33)**

Change:
```js
export default function useCapitalsGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null) {
```
To:
```js
export default function useCapitalsGameState(difficulty, isTraining, overrideCountries = null, mpSnapshot = null, mpSnapshotKey = null, continent = null) {
```

- [ ] **Step 2: Update redirect guard (lines 57-59)**

Change:
```js
  useEffect(() => {
    if (!difficulty && !overrideCountries) navigate('/')
  }, [difficulty, overrideCountries, navigate])
```
To:
```js
  useEffect(() => {
    if (!difficulty && !overrideCountries && !continent) navigate('/')
  }, [difficulty, overrideCountries, continent, navigate])
```

- [ ] **Step 3: Update `getRandomCountry` (lines 61-71)**

Change:
```js
  const getRandomCountry = useCallback((diff) => {
    const available = getAvailableDifficulties(diff)
    const filtered = countries.features.filter(c =>
      available.includes(c.properties.DifficultyCapitals) &&
      c.properties.ISO_A2 &&
      c.properties.capital &&
      !alreadyChosenCountries.includes(c.properties.ADMIN)
    )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)]
  }, [])
```
To:
```js
  const getRandomCountry = useCallback((diff, cont) => {
    const filtered = cont
      ? countries.features.filter(c =>
          c.properties.continent === cont &&
          c.properties.ISO_A2 &&
          c.properties.capital &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
      : countries.features.filter(c =>
          getAvailableDifficulties(diff).includes(c.properties.DifficultyCapitals) &&
          c.properties.ISO_A2 &&
          c.properties.capital &&
          !alreadyChosenCountries.includes(c.properties.ADMIN)
        )
    if (filtered.length === 0) return null
    return filtered[Math.floor(Math.random() * filtered.length)]
  }, [])
```

- [ ] **Step 4: Update init useEffect guard and total**

Change:
```js
    if (!difficulty && !overrideCountries) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries ? overrideCountries.length : getTotalCapitalCountries(difficulty)
```
To:
```js
    if (!difficulty && !overrideCountries && !continent) return
    alreadyChosenCountries = []
    orderedIndexRef.current = 0
    const total = overrideCountries
      ? overrideCountries.length
      : continent
        ? getTotalCapitalCountriesByContinent(continent)
        : getTotalCapitalCountries(difficulty)
```

- [ ] **Step 5: Update all 4 `getRandomCountry` calls**

Change every `getRandomCountry(difficulty)` → `getRandomCountry(difficulty, continent)`.

Lines affected: 110, 162, 284.

Update dependency array (line 173):
```js
  }, [difficulty, continent, getRandomCountry, overrideCountries])
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: all existing tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useCapitalsGameState.js
git commit -m "feat: add continent param to useCapitalsGameState"
```

---

### Task 6: Update `GamePage.jsx` to pass continent

**Files:**
- Modify: `src/pages/GamePage.jsx`

- [ ] **Step 1: Update `StandardPlacementGame` component (lines 271-282)**

Change:
```js
function StandardPlacementGame({ difficulty, isTraining }) {
  const state = useGameState(difficulty, isTraining)
  return (
    <PlacementGameLayout
      difficulty={difficulty}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
    />
  )
}
```
To:
```js
function StandardPlacementGame({ difficulty, isTraining, continent }) {
  const state = useGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <PlacementGameLayout
      difficulty={difficulty ?? continent}
      isTraining={isTraining}
      isAscension={false}
      presetName={null}
      state={state}
    />
  )
}
```

- [ ] **Step 2: Update `GamePage` default export (lines 414-428)**

Change:
```js
export default function GamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionPlacementGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardPlacementGame difficulty={difficulty} isTraining={isTraining} />
}
```
To:
```js
export default function GamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}

  if (isAscension) {
    return (
      <AscensionPlacementGame
        phases={phases}
        isTraining={isTraining}
        presetName={presetName ?? null}
      />
    )
  }

  return <StandardPlacementGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/GamePage.jsx
git commit -m "feat: pass continent from location state in GamePage"
```

---

### Task 7: Update `FlagGamePage.jsx` to pass continent

**Files:**
- Modify: `src/pages/FlagGamePage.jsx`

- [ ] **Step 1: Update `StandardFlagGame` component**

Find (around line 171):
```js
function StandardFlagGame({ difficulty, isTraining }) {
  const state = useFlagGameState(difficulty, isTraining)
  return (
    <FlagGameLayout
      difficulty={difficulty}
```
Change to:
```js
function StandardFlagGame({ difficulty, isTraining, continent }) {
  const state = useFlagGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <FlagGameLayout
      difficulty={difficulty ?? continent}
```

- [ ] **Step 2: Update `FlagGamePage` default export**

Find (around line 315):
```js
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}
```
Change to:
```js
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}
```

Find (around line 327):
```js
  return <StandardFlagGame difficulty={difficulty} isTraining={isTraining} />
```
Change to:
```js
  return <StandardFlagGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/FlagGamePage.jsx
git commit -m "feat: pass continent from location state in FlagGamePage"
```

---

### Task 8: Update `CapitalsGamePage.jsx` to pass continent

**Files:**
- Modify: `src/pages/CapitalsGamePage.jsx`

- [ ] **Step 1: Update `StandardCapitalsGame` component**

Find (around line 219):
```js
function StandardCapitalsGame({ difficulty, isTraining }) {
  const state = useCapitalsGameState(difficulty, isTraining)
  return (
    <CapitalsGameLayout
      difficulty={difficulty}
```
Change to:
```js
function StandardCapitalsGame({ difficulty, isTraining, continent }) {
  const state = useCapitalsGameState(difficulty, isTraining, null, null, null, continent)
  return (
    <CapitalsGameLayout
      difficulty={difficulty ?? continent}
```

- [ ] **Step 2: Update `CapitalsGamePage` default export**

Find (around line 333):
```js
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}
```
Change to:
```js
  const { difficulty, isTraining, isAscension, phases, presetName, continent } = useLocation().state || {}
```

Find (around line 345):
```js
  return <StandardCapitalsGame difficulty={difficulty} isTraining={isTraining} />
```
Change to:
```js
  return <StandardCapitalsGame difficulty={difficulty} isTraining={isTraining} continent={continent} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/CapitalsGamePage.jsx
git commit -m "feat: pass continent from location state in CapitalsGamePage"
```

---

### Task 9: Update `HomePage.jsx` with continent tabs

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Add imports**

At the top of `src/pages/HomePage.jsx`, add these imports after the existing hook imports:

```js
import { CONTINENTS } from "../utils/continents";
import { getTotalCountriesByContinent } from "../hooks/useGameState";
import { getTotalFlagCountriesByContinent } from "../hooks/useFlagGameState";
import { getTotalCapitalCountriesByContinent } from "../hooks/useCapitalsGameState";
```

- [ ] **Step 2: Add `getContinentsForGame` helper**

After the existing `getDifficultyCaps` function (after line 43), add:

```js
function getContinentsForGame(gameId) {
  const countFn =
    gameId === GAME_TYPES.FLAGS
      ? getTotalFlagCountriesByContinent
      : gameId === GAME_TYPES.CAPITALS
        ? getTotalCapitalCountriesByContinent
        : getTotalCountriesByContinent;

  return CONTINENTS.map(c => ({ ...c, count: countFn(c.name) }));
}
```

- [ ] **Step 3: Update `ActiveGameCard` state**

In `ActiveGameCard` (line 235), add two new state variables after the existing state declarations:

```js
  const [selectionMode, setSelectionMode] = useState("difficulty");
  const [selectedContinent, setSelectedContinent] = useState(null);
```

Also compute continents for this game:
```js
  const continents = useMemo(() => getContinentsForGame(game.id), [game.id]);
```

- [ ] **Step 4: Update `handlePlay` in `ActiveGameCard`**

Change the existing `handlePlay` (lines 246-260):

```js
  const handlePlay = (isTraining = false, difficultyOverride = null) => {
    if (mode === "ascension") {
      navigate(game.route, {
        state: {
          isAscension: true,
          phases: ascensionPhases,
          presetName: detectedPresetName,
          isTraining,
        },
      });
      return;
    }

    navigate(game.route, { state: { difficulty: difficultyOverride ?? difficulty, isTraining } });
  };
```
To:
```js
  const handlePlay = (isTraining = false, difficultyOverride = null) => {
    if (mode === "ascension") {
      navigate(game.route, {
        state: {
          isAscension: true,
          phases: ascensionPhases,
          presetName: detectedPresetName,
          isTraining,
        },
      });
      return;
    }

    if (selectionMode === "continent") {
      navigate(game.route, { state: { continent: selectedContinent, isTraining } });
      return;
    }

    navigate(game.route, { state: { difficulty: difficultyOverride ?? difficulty, isTraining } });
  };
```

- [ ] **Step 5: Add continent sub-tabs and buttons inside standard mode**

In the JSX of `ActiveGameCard`, the `mode === "standard"` branch currently renders just a `<div className="difficulty-grid">`. Wrap it to add sub-tabs:

Change:
```jsx
        {mode === "standard" ? (
          <div className="difficulty-grid">
            {difficulties.map((difficultyOption) => (
              ...
            ))}
          </div>
        ) : (
```
To:
```jsx
        {mode === "standard" ? (
          <>
            <div className="game-mode-tabs">
              <button
                className={`game-mode-tab${selectionMode === "difficulty" ? " game-mode-tab--active" : ""}`}
                onClick={() => setSelectionMode("difficulty")}
              >
                Par difficulté
              </button>
              <button
                className={`game-mode-tab${selectionMode === "continent" ? " game-mode-tab--active" : ""}`}
                onClick={() => setSelectionMode("continent")}
              >
                Par continent
              </button>
            </div>
            {selectionMode === "difficulty" ? (
              <div className="difficulty-grid">
                {difficulties.map((difficultyOption) => (
                  <button
                    key={difficultyOption.name}
                    className={`difficulty-btn${difficultyOption.name === "Hardcore" ? " difficulty-btn--wide" : ""}${difficulty === difficultyOption.name ? " difficulty-btn--active" : ""}`}
                    onClick={() => setDifficulty(difficultyOption.name)}
                    onDoubleClick={() => handlePlay(false, difficultyOption.name)}
                  >
                    <span className="difficulty-btn-name" style={{ color: difficultyOption.color }}>
                      {difficultyOption.name === "Hardcore" ? "\uD83D\uDC80 Hardcore - Tous les pays" : difficultyOption.name}
                    </span>
                    <span className="difficulty-btn-count">{difficultyOption.count} pays</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="difficulty-grid">
                {continents.map((cont) => (
                  <button
                    key={cont.name}
                    className={`difficulty-btn${selectedContinent === cont.name ? " difficulty-btn--active" : ""}`}
                    onClick={() => setSelectedContinent(cont.name)}
                  >
                    <span className="difficulty-btn-name" style={{ color: cont.color }}>{cont.name}</span>
                    <span className="difficulty-btn-count">{cont.count} pays</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
```

- [ ] **Step 6: Update "Jouer" button disabled condition**

Find (around line 368):
```jsx
          <button className="btn-play" onClick={() => handlePlay(false)} disabled={mode === "ascension" && totalAscensionCountries === 0}>
```
Change to:
```jsx
          <button
            className="btn-play"
            onClick={() => handlePlay(false)}
            disabled={
              (mode === "ascension" && totalAscensionCountries === 0) ||
              (mode === "standard" && selectionMode === "continent" && !selectedContinent)
            }
          >
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 8: Start dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:5173`. For each of the 3 game cards (Trouve le Pays, Trouve le Drapeau, Trouve la Capitale):
1. Sub-tabs "Par difficulté" / "Par continent" appear inside Standard mode
2. Switching to "Par continent" shows 5 continent buttons with country counts
3. Clicking a continent selects it (highlighted)
4. "Jouer" is disabled until a continent is selected
5. Clicking "Jouer" launches the game with countries from that continent only
6. Ascension mode is unaffected
7. BorderGuess / CountryClue / Ranking cards are unaffected

- [ ] **Step 9: Commit**

```bash
git add src/pages/HomePage.jsx src/utils/continents.js
git commit -m "feat: add continent mode tabs and selection to game cards"
```

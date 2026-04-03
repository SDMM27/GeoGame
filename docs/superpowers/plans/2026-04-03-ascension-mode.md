# Ascension Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progressive "Ascension" game mode to all 3 games, with configurable per-difficulty country counts, 4 predefined presets, a fluid phase transition, and a dedicated leaderboard.

**Architecture:** A single `useAscensionState(gameType, phases, isTraining)` hook handles phase management, the global timer, per-phase stats, and game-type-specific country selection. Game pages detect `isAscension` from React Router location state and swap their regular hook for this one. A new `AscensionForm` handles end-of-game display and score saving to a dedicated `ascensionScores` Firestore collection.

**Tech Stack:** React 18, React Router v6, Vitest, Firebase Firestore, react-toastify

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/ascensionPresets.js` | Create | Preset constants + `matchPreset(phases)` detection |
| `src/utils/ascensionPresets.test.js` | Create | Tests for preset detection |
| `src/hooks/useAscensionState.js` | Create | Shared hook: phases, timer, stats, game-type adapters |
| `src/pages/AscensionForm.jsx` | Create | End-of-game summary + Firestore save for Ascension |
| `src/pages/AscensionScoreboard.jsx` | Create | Leaderboard: filter by game + preset, sort by time |
| `src/pages/HomePage.jsx` | Modify | Add Standard/Ascension tabs, sliders, preset buttons |
| `src/pages/HomePage.css` | Modify | Styles for tabs, sliders, preset buttons |
| `src/pages/GamePage.jsx` | Modify | Detect `isAscension`, use hook, show phase indicator |
| `src/pages/FlagGamePage.jsx` | Modify | Same |
| `src/pages/CapitalsGamePage.jsx` | Modify | Same |
| `src/pages/Scoreboard.jsx` | Modify | Add 🚀 Ascension tab |
| `src/pages/scoreboard.css` | Modify | Style for Ascension tab |

---

## Task 1 — Preset constants & detection utility

**Files:**
- Create: `src/utils/ascensionPresets.js`
- Create: `src/utils/ascensionPresets.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/utils/ascensionPresets.test.js
import { describe, it, expect } from 'vitest'
import { ASCENSION_PRESETS, matchPreset, buildPhaseSequence } from './ascensionPresets'

describe('ASCENSION_PRESETS', () => {
  it('has 4 presets', () => {
    expect(ASCENSION_PRESETS).toHaveLength(4)
  })
  it('Découverte totals 16 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Découverte')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(16)
  })
  it('Progressif totals 31 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Progressif')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(31)
  })
  it('Challenge totals 23 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Challenge')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(23)
  })
  it('Hardcore totals 35 countries', () => {
    const p = ASCENSION_PRESETS.find(p => p.name === 'Hardcore')
    const total = Object.values(p.phases).reduce((s, n) => s + n, 0)
    expect(total).toBe(35)
  })
})

describe('matchPreset', () => {
  it('returns preset name when phases exactly match a preset', () => {
    expect(matchPreset({ Facile: 10, Moyen: 5, Difficile: 1, Impossible: 0 })).toBe('Découverte')
  })
  it('returns null for custom config', () => {
    expect(matchPreset({ Facile: 3, Moyen: 3, Difficile: 3, Impossible: 3 })).toBeNull()
  })
  it('returns preset name via sliders matching Challenge', () => {
    expect(matchPreset({ Facile: 7, Moyen: 7, Difficile: 7, Impossible: 2 })).toBe('Challenge')
  })
})

describe('buildPhaseSequence', () => {
  it('skips difficulties with count 0', () => {
    const seq = buildPhaseSequence({ Facile: 10, Moyen: 5, Difficile: 1, Impossible: 0 })
    expect(seq).toHaveLength(3)
    expect(seq.map(p => p.difficulty)).toEqual(['Facile', 'Moyen', 'Difficile'])
  })
  it('respects Facile→Moyen→Difficile→Impossible order', () => {
    const seq = buildPhaseSequence({ Facile: 5, Moyen: 5, Difficile: 5, Impossible: 5 })
    expect(seq.map(p => p.difficulty)).toEqual(['Facile', 'Moyen', 'Difficile', 'Impossible'])
  })
  it('returns correct counts', () => {
    const seq = buildPhaseSequence({ Facile: 7, Moyen: 3, Difficile: 0, Impossible: 2 })
    expect(seq).toEqual([
      { difficulty: 'Facile', count: 7 },
      { difficulty: 'Moyen', count: 3 },
      { difficulty: 'Impossible', count: 2 },
    ])
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/utils/ascensionPresets.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement the utility**

```js
// src/utils/ascensionPresets.js
const PHASE_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible']

export const ASCENSION_PRESETS = [
  { name: 'Découverte', icon: '🌱', phases: { Facile: 10, Moyen: 5, Difficile: 1, Impossible: 0 } },
  { name: 'Progressif', icon: '📈', phases: { Facile: 15, Moyen: 10, Difficile: 5, Impossible: 1 } },
  { name: 'Challenge',  icon: '⚡', phases: { Facile: 7,  Moyen: 7,  Difficile: 7, Impossible: 2 } },
  { name: 'Hardcore',   icon: '💀', phases: { Facile: 5,  Moyen: 10, Difficile: 15, Impossible: 5 } },
]

/**
 * Returns the preset name if `phases` exactly matches one, otherwise null.
 * @param {{ Facile: number, Moyen: number, Difficile: number, Impossible: number }} phases
 * @returns {string|null}
 */
export function matchPreset(phases) {
  const preset = ASCENSION_PRESETS.find(p =>
    PHASE_ORDER.every(d => (p.phases[d] ?? 0) === (phases[d] ?? 0))
  )
  return preset?.name ?? null
}

/**
 * Builds the ordered list of active phases (count > 0).
 * @param {{ Facile: number, Moyen: number, Difficile: number, Impossible: number }} phases
 * @returns {{ difficulty: string, count: number }[]}
 */
export function buildPhaseSequence(phases) {
  return PHASE_ORDER
    .filter(d => (phases[d] ?? 0) > 0)
    .map(d => ({ difficulty: d, count: phases[d] }))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/utils/ascensionPresets.test.js
```
Expected: all 11 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/ascensionPresets.js src/utils/ascensionPresets.test.js
git commit -m "feat: add ascension preset constants and detection utility"
```

---

## Task 2 — `useAscensionState` hook

**Files:**
- Create: `src/hooks/useAscensionState.js`

This hook is the core of the feature. It handles phase management, timer, per-phase stats, and game-type-specific country selection and answer logic.

- [ ] **Step 1: Create the file**

```js
// src/hooks/useAscensionState.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'
import { GAME_TYPES } from '../utils/gameTypes'
import { checkAnswer } from '../utils/normalizeAnswer'
import { buildPhaseSequence } from '../utils/ascensionPresets'

// Which country property name holds the difficulty for each game type
const DIFFICULTY_PROP = {
  [GAME_TYPES.PLACEMENT]: 'Difficulty',
  [GAME_TYPES.FLAGS]:     'DifficultyFlag',
  [GAME_TYPES.CAPITALS]:  'DifficultyCapitals',
}

// Extra per-game country filter (beyond the difficulty match)
const COUNTRY_FILTER = {
  [GAME_TYPES.PLACEMENT]: () => true,
  [GAME_TYPES.FLAGS]:     c => !!c.properties.ISO_A2,
  [GAME_TYPES.CAPITALS]:  c => !!c.properties.ISO_A2 && !!c.properties.capital,
}

const SCORE_TABLE = {
  Facile:     [3, 2, 1],
  Moyen:      [5, 3, 2],
  Difficile:  [7, 5, 3],
  Impossible: [9, 7, 5],
}

const COUNTRY_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }

// Module-level pool avoids stale closures (same pattern as existing hooks)
let alreadyChosenCountries = []

function getPool(difficulty, gameType, alreadyChosen) {
  const diffProp = DIFFICULTY_PROP[gameType]
  const extraFilter = COUNTRY_FILTER[gameType]
  return countries.features.filter(c =>
    c.properties[diffProp] === difficulty &&
    extraFilter(c) &&
    !alreadyChosen.includes(c.properties.ADMIN)
  )
}

export default function useAscensionState(gameType, phases, isTraining) {
  const navigate = useNavigate()
  // Static: computed once from props — do not recompute during game
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const phaseSequence = useRef(buildPhaseSequence(phases)).current

  // ── Phase state ──────────────────────────────────────────────
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const currentPhaseIndexRef = useRef(0)
  const [phaseCountRemaining, setPhaseCountRemaining] = useState(phaseSequence[0]?.count ?? 0)
  const phaseCountRemainingRef = useRef(phaseSequence[0]?.count ?? 0)
  const phaseFoundRef = useRef(0)   // found count in current phase
  const phaseSkippedRef = useRef(0) // skipped count in current phase
  const phaseStatsRef = useRef([])  // completed phase records
  const phaseStartTimeRef = useRef(null)

  // ── Common game state ────────────────────────────────────────
  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const statsRef = useRef({ found: 0, skipped: 0, total: 0 })
  const [isGameOver, setIsGameOver] = useState(false)

  // ── Timer ────────────────────────────────────────────────────
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(0)
  const startTimeRef = useRef(null)

  // ── PLACEMENT-only state ─────────────────────────────────────
  const geoJsonRef = useRef(null)
  const [mapRef, setMapRef] = useState(null)
  const mapRefRef = useRef(null)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const foundCountriesRef = useRef(new Set())
  const shownCountriesRef = useRef(new Set())

  // ── FLAGS / CAPITALS state ───────────────────────────────────
  const [inputValue, setInputValue] = useState('')
  const [revealedName, setRevealedName] = useState(null)

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  useEffect(() => { if (!phaseSequence.length) navigate('/') }, []) // eslint-disable-line
  useEffect(() => { targetCountryRef.current = targetCountry }, [targetCountry])
  useEffect(() => { consecutiveErrorsRef.current = consecutiveErrors }, [consecutiveErrors])
  useEffect(() => { clickOnSeeCountryRef.current = clickOnSeeCountry }, [clickOnSeeCountry])
  useEffect(() => { mapRefRef.current = mapRef }, [mapRef])

  const setTargetFromFeature = useCallback((feature) => {
    setTargetCountry(gameType === GAME_TYPES.PLACEMENT ? feature.properties.ADMIN : feature)
  }, [gameType])

  const getRandomCountry = useCallback((difficulty) => {
    const pool = getPool(difficulty, gameType, alreadyChosenCountries)
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }, [gameType])

  const incrementScore = useCallback((difficulty, errorCount) => {
    const row = SCORE_TABLE[difficulty]
    if (!row) return
    setScore(prev => prev + row[Math.min(errorCount, 2)])
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!phaseSequence.length) return
    alreadyChosenCountries = []
    phaseStatsRef.current = []
    phaseFoundRef.current = 0
    phaseSkippedRef.current = 0
    const total = phaseSequence.reduce((s, p) => s + p.count, 0)
    const initialStats = { found: 0, skipped: 0, total }
    setStats(initialStats)
    statsRef.current = initialStats
    phaseStartTimeRef.current = performance.now()
    const first = getRandomCountry(phaseSequence[0].difficulty)
    if (first) {
      alreadyChosenCountries.push(first.properties.ADMIN)
      setTargetFromFeature(first)
      gameStartedRef.current = true
      setGameStarted(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────
  // Global timer (continuous across phases)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted || isGameOver) {
      if (isGameOver && startTimeRef.current) {
        timerRef.current = performance.now() - startTimeRef.current
      }
      return
    }
    startTimeRef.current = performance.now() - (timerRef.current || 0)
    const id = setInterval(() => {
      const t = performance.now() - startTimeRef.current
      setTimer(t)
      timerRef.current = t
    }, 100)
    return () => clearInterval(id)
  }, [gameStarted, isGameOver])

  // ─────────────────────────────────────────────────────────────
  // Core: advance game after a country is resolved
  // ─────────────────────────────────────────────────────────────
  const advanceGame = useCallback((wasFound) => {
    // Update global stats
    const newStats = wasFound
      ? { ...statsRef.current, found: statsRef.current.found + 1 }
      : { ...statsRef.current, skipped: statsRef.current.skipped + 1 }
    setStats(newStats)
    statsRef.current = newStats

    // Update phase counters
    if (wasFound) phaseFoundRef.current += 1
    else phaseSkippedRef.current += 1

    const newRemaining = phaseCountRemainingRef.current - 1
    setPhaseCountRemaining(newRemaining)
    phaseCountRemainingRef.current = newRemaining

    // Reset per-country state
    setConsecutiveErrors(0)
    consecutiveErrorsRef.current = 0
    if (gameType !== GAME_TYPES.PLACEMENT) {
      setInputValue('')
      setRevealedName(null)
      setClickOnSeeCountry(false)
      clickOnSeeCountryRef.current = false
    }

    if (newRemaining <= 0) {
      // Record completed phase stats
      const phaseDurationMs = performance.now() - phaseStartTimeRef.current
      const phaseIdx = currentPhaseIndexRef.current
      phaseStatsRef.current.push({
        difficulty: phaseSequence[phaseIdx].difficulty,
        count: phaseSequence[phaseIdx].count,
        found: phaseFoundRef.current,
        skipped: phaseSkippedRef.current,
        timeMs: phaseDurationMs,
      })

      const nextIdx = phaseIdx + 1
      if (nextIdx < phaseSequence.length) {
        // Advance to next phase
        const nextPhase = phaseSequence[nextIdx]
        currentPhaseIndexRef.current = nextIdx
        setCurrentPhaseIndex(nextIdx)
        phaseCountRemainingRef.current = nextPhase.count
        setPhaseCountRemaining(nextPhase.count)
        phaseFoundRef.current = 0
        phaseSkippedRef.current = 0
        phaseStartTimeRef.current = performance.now()
        toast.info(`🚀 Phase ${nextPhase.difficulty} commencée !`, { containerId: 'topRightToast', autoClose: 2000 })
        const next = getRandomCountry(nextPhase.difficulty)
        if (next) {
          alreadyChosenCountries.push(next.properties.ADMIN)
          setTargetFromFeature(next)
        }
      } else {
        // All phases done
        setIsGameOver(true)
      }
    } else {
      // Same phase, next country
      const next = getRandomCountry(phaseSequence[currentPhaseIndexRef.current].difficulty)
      if (next) {
        alreadyChosenCountries.push(next.properties.ADMIN)
        setTargetFromFeature(next)
      }
    }
  }, [gameType, phaseSequence, getRandomCountry, setTargetFromFeature])

  // ─────────────────────────────────────────────────────────────
  // PLACEMENT-specific: map interaction
  // ─────────────────────────────────────────────────────────────
  const zoomCountryMap = useCallback((lat, lng, diff) => {
    const map = mapRefRef.current
    if (!map) return
    if (targetCountryRef.current === 'Vatican') map.setView([lat, lng], 20)
    else if (diff === 'Difficile') map.setView([lat, lng], 7)
    else if (diff === 'Impossible') map.setView([lat, lng], 9)
    else map.setView([lat, lng], 4)
  }, [])

  // 3 consecutive errors → show country on map
  useEffect(() => {
    if (gameType !== GAME_TYPES.PLACEMENT || consecutiveErrors < 3) return
    toast.error('Dommage ! C\'est ici : ' + targetCountryRef.current, { containerId: 'topRightToast' })
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === targetCountryRef.current
    )
    if (!layer) return
    layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(targetCountryRef.current)
    const center = layer.getBounds().getCenter()
    const feat = countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
    zoomCountryMap(center.lat, center.lng, feat?.properties.Difficulty)
  }, [consecutiveErrors, gameType, zoomCountryMap])

  const onCountryMouseOver = useCallback((event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name) || shownCountriesRef.current.has(name)) return
    layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
  }, [])

  const onCountryMouseOut = useCallback((event) => {
    const layer = event.target
    const name = layer.feature.properties.ADMIN
    if (foundCountriesRef.current.has(name) || shownCountriesRef.current.has(name)) return
    layer.setStyle(COUNTRY_STYLE)
  }, [])

  const onCountryClick = useCallback((event) => {
    if (!gameStartedRef.current) return
    const clickedName = event.target.feature.properties.ADMIN
    const feat = countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
    const diff = feat?.properties.Difficulty

    if (clickedName === targetCountryRef.current) {
      const wasSkipped = consecutiveErrorsRef.current >= 3 || clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + targetCountryRef.current + ' !', { containerId: 'topRightToast' })
        incrementScore(diff, consecutiveErrorsRef.current)
      }
      event.target.setStyle({ fillColor: '#4ade80', weight: 2, fillOpacity: 0.5 })
      shownCountriesRef.current.delete(clickedName)
      foundCountriesRef.current.add(clickedName)
      advanceGame(!wasSkipped)
    } else {
      toast.error('Dommage !', { containerId: 'topRightToast' })
      setConsecutiveErrors(prev => prev + 1)
    }
  }, [advanceGame, incrementScore])

  const seeCountry = useCallback(() => {
    if (gameType !== GAME_TYPES.PLACEMENT) {
      // FLAGS / CAPITALS
      if (revealedName) return
      setClickOnSeeCountry(true)
      clickOnSeeCountryRef.current = true
      const props = targetCountryRef.current?.properties
      setRevealedName(gameType === GAME_TYPES.FLAGS ? props?.ADMIN : props?.capital)
      return
    }
    // PLACEMENT
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === targetCountryRef.current
    )
    if (!layer) return
    layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    shownCountriesRef.current.add(targetCountryRef.current)
    const center = layer.getBounds().getCenter()
    const feat = countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
    zoomCountryMap(center.lat, center.lng, feat?.properties.Difficulty)
  }, [gameType, revealedName, zoomCountryMap])

  // ─────────────────────────────────────────────────────────────
  // FLAGS / CAPITALS: auto-advance after reveal + submit handler
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameType === GAME_TYPES.PLACEMENT || !revealedName) return
    const id = setTimeout(() => advanceGame(false), 2000)
    return () => clearTimeout(id)
  }, [revealedName, gameType, advanceGame])

  const handleSubmit = useCallback(() => {
    if (!gameStartedRef.current || !targetCountryRef.current || revealedName) return
    const props = targetCountryRef.current.properties
    const isFlags = gameType === GAME_TYPES.FLAGS
    const answer    = isFlags ? props.ADMIN    : props.capital
    const aliases   = isFlags ? (props.aliases ?? []) : (props.capitalAliases ?? [])
    const diffProp  = isFlags ? props.DifficultyFlag  : props.DifficultyCapitals
    const revLabel  = answer

    if (checkAnswer(inputValue, answer, aliases)) {
      const wasSkipped = clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + revLabel + ' !', { containerId: 'topRightToast' })
        incrementScore(diffProp, consecutiveErrorsRef.current)
      }
      advanceGame(!wasSkipped)
    } else {
      const n = consecutiveErrorsRef.current + 1
      setConsecutiveErrors(n)
      consecutiveErrorsRef.current = n
      if (n >= 3) {
        toast.error('Dommage ! C\'est ' + revLabel, { containerId: 'topRightToast' })
        setRevealedName(revLabel)
      } else {
        toast.error('Dommage !', { containerId: 'topRightToast' })
      }
      setInputValue('')
    }
  }, [gameType, inputValue, revealedName, advanceGame, incrementScore])

  // ─────────────────────────────────────────────────────────────
  // Restart / Go home
  // ─────────────────────────────────────────────────────────────
  const restartGame = useCallback(() => {
    setGameStarted(false)
    gameStartedRef.current = false
    setIsGameOver(false)
    alreadyChosenCountries = []
    phaseStatsRef.current = []
    phaseFoundRef.current = 0
    phaseSkippedRef.current = 0
    setScore(0)
    setConsecutiveErrors(0)
    consecutiveErrorsRef.current = 0
    setClickOnSeeCountry(false)
    clickOnSeeCountryRef.current = false
    setInputValue('')
    setRevealedName(null)
    foundCountriesRef.current.clear()
    shownCountriesRef.current.clear()
    if (geoJsonRef.current) {
      geoJsonRef.current.getLayers().forEach(l => l.setStyle(COUNTRY_STYLE))
    }
    startTimeRef.current = null
    timerRef.current = 0
    setTimer(0)
    currentPhaseIndexRef.current = 0
    setCurrentPhaseIndex(0)
    phaseCountRemainingRef.current = phaseSequence[0]?.count ?? 0
    setPhaseCountRemaining(phaseSequence[0]?.count ?? 0)

    setTimeout(() => {
      const total = phaseSequence.reduce((s, p) => s + p.count, 0)
      const initialStats = { found: 0, skipped: 0, total }
      setStats(initialStats)
      statsRef.current = initialStats
      phaseStartTimeRef.current = performance.now()
      const first = getRandomCountry(phaseSequence[0].difficulty)
      if (first) {
        alreadyChosenCountries.push(first.properties.ADMIN)
        setTargetFromFeature(first)
        setGameStarted(true)
        gameStartedRef.current = true
      }
    }, 0)
  }, [phaseSequence, getRandomCountry, setTargetFromFeature])

  const goHome = useCallback(() => {
    alreadyChosenCountries = []
    foundCountriesRef.current.clear()
    shownCountriesRef.current.clear()
    navigate('/')
  }, [navigate])

  // ─────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────
  const currentPhase = phaseSequence[currentPhaseIndex]
  const displayTimer = isTraining ? '∞' : formatTime(timer)

  return {
    // Common (compatible with existing hooks)
    targetCountry,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    seeCountry,
    restartGame,
    goHome,
    // Ascension-specific
    currentPhase: currentPhase?.difficulty ?? null,
    phaseCountRemaining,
    totalPhaseCount: currentPhase?.count ?? 0,
    phaseStats: phaseStatsRef.current,
    // PLACEMENT-specific
    geoJsonRef,
    mapRef,
    setMapRef,
    onCountryClick,
    onCountryMouseOver,
    onCountryMouseOut,
    // FLAGS / CAPITALS-specific
    inputValue,
    setInputValue,
    handleSubmit,
    revealedName,
  }
}
```

- [ ] **Step 2: Run existing tests to ensure nothing is broken**

```bash
npx vitest run
```
Expected: all existing tests pass (new hook has no test file yet — that's fine, it's tested via integration)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAscensionState.js
git commit -m "feat: add useAscensionState shared hook"
```

---

## Task 3 — `AscensionForm` component

**Files:**
- Create: `src/pages/AscensionForm.jsx`

This component replaces `Form` on the game-over screen when `isAscension` is true. It shows global stats, the phase breakdown table, and saves to the `ascensionScores` Firestore collection.

- [ ] **Step 1: Create `AscensionForm.jsx`**

```jsx
// src/pages/AscensionForm.jsx
import React, { useRef, useState } from 'react'
import { firestore } from '../Firebase'
import { addDoc, collection, getDocs, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { formatTime } from '../utils/formatTime'

function isBetter(newTimeMs, existingTimeMs) {
  return newTimeMs < existingTimeMs
}

/**
 * @param {{
 *   score: number,
 *   timer: number,
 *   stats: { found: number, skipped: number, total: number },
 *   phaseStats: { difficulty: string, count: number, found: number, skipped: number, timeMs: number }[],
 *   gameType: string,
 *   presetName: string|null,
 *   isTraining: boolean,
 * }} props
 */
export default function AscensionForm({ score, timer, stats, phaseStats, gameType, presetName, isTraining }) {
  const nameRef = useRef()
  const [saved, setSaved] = useState(false)
  const [blockedByBetter, setBlockedByBetter] = useState(null)

  const canSave = !isTraining && presetName !== null

  const handleSave = async (e) => {
    e.preventDefault()
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error('Veuillez rentrer un pseudo', { containerId: 'topRightToast' })
      return
    }

    const ref = collection(firestore, 'ascensionScores')
    const existing = await getDocs(
      query(ref, where('name', '==', name), where('gameType', '==', gameType), where('presetName', '==', presetName))
    )

    if (!existing.empty) {
      const prev = existing.docs[0].data()
      if (!isBetter(timer, prev.globalTimeMs)) {
        setBlockedByBetter({ timeMs: prev.globalTimeMs, score: prev.globalScore })
        return
      }
      await deleteDoc(existing.docs[0].ref)
    }

    try {
      await addDoc(ref, {
        name,
        gameType,
        presetName,
        globalTimeMs: timer,
        globalScore: score,
        totalFound: stats.found,
        totalSkipped: stats.skipped,
        phaseStats,
        date: serverTimestamp(),
      })
      toast.success('Score Ascension sauvegardé !', { containerId: 'topRightToast' })
      setSaved(true)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { containerId: 'topRightToast' })
      console.error(err)
    }
  }

  const DIFFICULTY_COLORS = {
    Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24', Impossible: '#f97316',
  }

  return (
    <div className="form-container">
      <h2 className="form-title">🚀 Ascension terminée !</h2>
      {presetName && <p className="form-score-display">Preset : <strong>{presetName}</strong></p>}

      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '1.4em', fontWeight: 'bold' }}>
            {formatTime(timer)}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Temps total</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fbbf24', fontSize: '1.4em', fontWeight: 'bold' }}>{score}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Score</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#4ade80', fontSize: '1.4em', fontWeight: 'bold' }}>
            {stats.found}/{stats.total}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Trouvés</div>
        </div>
      </div>

      {phaseStats.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82em', marginBottom: '12px' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '3px 0' }}>Phase</th>
              <th style={{ textAlign: 'center' }}>Trouvés</th>
              <th style={{ textAlign: 'center' }}>Passés</th>
              <th style={{ textAlign: 'right' }}>Temps</th>
            </tr>
          </thead>
          <tbody>
            {phaseStats.map(ps => (
              <tr key={ps.difficulty} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ color: DIFFICULTY_COLORS[ps.difficulty] ?? '#e2e8f0', padding: '4px 0' }}>
                  {ps.difficulty}
                </td>
                <td style={{ textAlign: 'center', color: '#e2e8f0' }}>{ps.found}/{ps.count}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{ps.skipped}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{formatTime(ps.timeMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canSave && !saved && (
        <>
          {blockedByBetter && (
            <div className="form-blocked">
              <p className="form-blocked-message">⚠️ Ce pseudo a déjà un meilleur temps :</p>
              <p className="form-blocked-score">
                <strong>{formatTime(blockedByBetter.timeMs)}</strong> — {blockedByBetter.score} pts
              </p>
              <p className="form-blocked-hint">Enregistrez sous un autre nom.</p>
            </div>
          )}
          <form onSubmit={handleSave}>
            <label htmlFor="ascension-name" className="form-label">Pseudo</label>
            <input
              type="text"
              id="ascension-name"
              ref={nameRef}
              className="form-input"
              placeholder="Ton pseudo..."
              maxLength={20}
            />
            <button type="submit" className="form-submit">Sauvegarder le score</button>
          </form>
        </>
      )}
      {saved && <p style={{ color: '#4ade80', textAlign: 'center' }}>Score sauvegardé ✓</p>}
      {!canSave && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center' }}>
          {isTraining ? 'Mode entraînement — score non enregistré' : 'Config custom — score non enregistré'}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run existing tests**

```bash
npx vitest run
```
Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/AscensionForm.jsx
git commit -m "feat: add AscensionForm end-of-game component"
```

---

## Task 4 — Phase indicator component (shared across 3 game pages)

**Files:**
- Create: `src/components/PhaseIndicator.jsx`
- Create: `src/components/PhaseIndicator.css`

- [ ] **Step 1: Create `PhaseIndicator.jsx`**

```jsx
// src/components/PhaseIndicator.jsx
import React from 'react'
import './PhaseIndicator.css'

const DIFFICULTY_COLORS = {
  Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24', Impossible: '#f97316',
}

/**
 * @param {{ currentPhase: string, phaseCountRemaining: number, totalPhaseCount: number }} props
 */
export default function PhaseIndicator({ currentPhase, phaseCountRemaining, totalPhaseCount }) {
  if (!currentPhase) return null
  const done = totalPhaseCount - phaseCountRemaining
  const pct = totalPhaseCount > 0 ? (done / totalPhaseCount) * 100 : 0
  const color = DIFFICULTY_COLORS[currentPhase] ?? '#e2e8f0'

  return (
    <div className="phase-indicator">
      <div className="phase-indicator-row">
        <span className="phase-indicator-label" style={{ color }}>Phase : {currentPhase}</span>
        <span className="phase-indicator-count">{phaseCountRemaining} restants</span>
      </div>
      <div className="phase-indicator-track">
        <div className="phase-indicator-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `PhaseIndicator.css`**

```css
/* src/components/PhaseIndicator.css */
.phase-indicator {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  padding: 6px 14px;
  z-index: 900;
  min-width: 200px;
  max-width: 280px;
}

.phase-indicator-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82em;
  margin-bottom: 4px;
}

.phase-indicator-label {
  font-weight: 600;
}

.phase-indicator-count {
  color: var(--text-muted, #94a3b8);
  font-size: 0.9em;
}

.phase-indicator-track {
  height: 3px;
  background: var(--border, #334155);
  border-radius: 2px;
  overflow: hidden;
}

.phase-indicator-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PhaseIndicator.jsx src/components/PhaseIndicator.css
git commit -m "feat: add PhaseIndicator component for Ascension mode"
```

---

## Task 5 — Update `GamePage` (PLACEMENT) for Ascension

**Files:**
- Modify: `src/pages/GamePage.jsx`

- [ ] **Step 1: Update `GamePage.jsx`**

Replace the first ~10 lines and the game-over overlay section:

```jsx
// src/pages/GamePage.jsx  — full file
import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ToastContainer } from 'react-toastify'
import useGameState from '../hooks/useGameState'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import PhaseIndicator from '../components/PhaseIndicator'
import countries from '../data/countriesWithDifficulty_FR.json'
import Form from './form'
import AscensionForm from './AscensionForm'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

const GEO_STYLE = { fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }

function RightClickDrag() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    let isDragging = false, lastX = 0, lastY = 0
    const onMouseDown = (e) => { if (e.button !== 2) return; isDragging = true; lastX = e.clientX; lastY = e.clientY; container.style.cursor = 'grabbing'; e.preventDefault() }
    const onMouseMove = (e) => { if (!isDragging) return; const dx = lastX - e.clientX; const dy = lastY - e.clientY; lastX = e.clientX; lastY = e.clientY; map._rawPanBy(L.point(dx, dy)) }
    const onMouseUp = (e) => { if (e.button !== 2) return; isDragging = false; container.style.cursor = ''; map.fire('moveend') }
    const onContextMenu = (e) => e.preventDefault()
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    container.addEventListener('contextmenu', onContextMenu)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('contextmenu', onContextMenu)
    }
  }, [map])
  return null
}

export default function GamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}

  const standardState = useGameState(isAscension ? null : difficulty, isTraining)
  const ascensionState = useAscensionState(
    GAME_TYPES.PLACEMENT,
    isAscension ? phases : { Facile: 0, Moyen: 0, Difficile: 0, Impossible: 0 },
    isTraining
  )

  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    geoJsonRef, setMapRef,
    onCountryClick, onCountryMouseOver, onCountryMouseOut,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = isAscension ? ascensionState : standardState

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0

  return (
    <div className="game-page">
      {isAscension && (
        <PhaseIndicator
          currentPhase={currentPhase}
          phaseCountRemaining={phaseCountRemaining}
          totalPhaseCount={totalPhaseCount}
        />
      )}

      <div className="hud-container">
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{score}</span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">PAYS À TROUVER</span>
              <span className="hud-target-name">{targetCountry}</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} pays</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
            <span className="hud-stat-label">✗ PASSÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">◎ RESTANTS</span>
          </div>
        </div>
      </div>

      <div className="controls-hint">
        <div className="controls-hint-row"><span className="controls-key">Clic gauche</span><span className="controls-desc">Sélectionner un pays</span></div>
        <div className="controls-hint-row"><span className="controls-key">Clic droit</span><span className="controls-desc">Déplacer la carte</span></div>
        <div className="controls-hint-row"><span className="controls-key">Molette</span><span className="controls-desc">Zoomer / Dézoomer</span></div>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry}>👁 Voir</button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {isAscension ? (
              <AscensionForm
                score={score}
                timer={timer}
                stats={stats}
                phaseStats={phaseStats}
                gameType={GAME_TYPES.PLACEMENT}
                presetName={presetName ?? null}
                isTraining={isTraining}
              />
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="PLACEMENT" />
            )}
            <div className="game-over-actions">
              <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
              <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />

      <MapContainer
        center={[20, 0]} zoom={2} scrollWheelZoom zoomControl={false}
        dragging={false} doubleClickZoom={false}
        maxBounds={[[90, -180], [-90, 180]]}
        style={{ width: '100%', height: '100vh' }}
        whenReady={({ target }) => {
          setMapRef(target)
          target.getContainer().style.background = 'var(--bg-primary)'
          setTimeout(() => target.invalidateSize(), 100)
        }}
      >
        <TileLayer
          attribution="Stamen Toner"
          url="https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png"
          noWrap minZoom={2} maxZoom={20}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={GEO_STYLE}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({ click: onCountryClick, mouseover: onCountryMouseOver, mouseout: onCountryMouseOut })
          }}
        />
        <RightClickDrag />
      </MapContainer>
    </div>
  )
}
```

> **Note:** Calling both hooks unconditionally (with a null/empty arg for the inactive one) satisfies React's rules of hooks. The null/empty-phases guard in each hook redirects to `/` only when the active hook gets nulled, so pass a valid no-op config to the inactive one — the empty-phases config `{ Facile:0, Moyen:0, Difficile:0, Impossible:0 }` produces an empty `phaseSequence` which the Ascension hook safely handles without navigating away as long as we only call `navigate` when `!phaseSequence.length && isAscension` — update the guard in `useAscensionState` to check `isAscension` before redirecting:

In `useAscensionState.js`, change the redirect guard:
```js
// Replace:
useEffect(() => { if (!phaseSequence.length) navigate('/') }, [])
// With:
useEffect(() => { if (!phaseSequence.length && phases && Object.values(phases).some(v => v > 0)) navigate('/') }, []) // eslint-disable-line
```

Actually, a cleaner approach — instead of calling both hooks unconditionally, use a wrapper approach. Replace the dual-hook pattern above with a single conditional call using a helper. Since React hooks can't be called conditionally, the simplest solution is: **don't import the standard hook in GamePage at all; instead, if `!isAscension`, render a StandardGamePage sub-component that uses the standard hook.** But that requires refactoring.

**Simplest correct approach:** Keep both hooks but pass `isAscension` as a prop to `useAscensionState` and only redirect when `isAscension && !phaseSequence.length`:

```js
// In useAscensionState.js — update the guard line:
useEffect(() => {
  if (isAscension && !phaseSequence.length) navigate('/')
}, []) // eslint-disable-line
```

And add `isAscension` parameter to the hook signature:

```js
export default function useAscensionState(gameType, phases, isTraining, isAscension = true) {
```

Then in GamePage, call:
```js
const ascensionState = useAscensionState(
  GAME_TYPES.PLACEMENT,
  isAscension ? phases : { Facile: 1, Moyen: 0, Difficile: 0, Impossible: 0 }, // valid minimal config
  isTraining,
  !!isAscension
)
```

Update `useAscensionState.js` accordingly before implementing the game pages (return to Task 2 and apply this change).

- [ ] **Step 2: Update `useAscensionState.js` — add `isAscension` guard param**

In `src/hooks/useAscensionState.js`, change signature and guard:

```js
// Change function signature:
export default function useAscensionState(gameType, phases, isTraining, isAscensionMode = true) {

// Change redirect guard:
useEffect(() => {
  if (isAscensionMode && !phaseSequence.length) navigate('/')
}, []) // eslint-disable-line
```

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 4: Open the app and navigate to a game with `isAscension: true` in dev tools to smoke-test**

```bash
npm run dev
```
In browser console, confirm no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/GamePage.jsx src/hooks/useAscensionState.js src/components/PhaseIndicator.jsx src/components/PhaseIndicator.css
git commit -m "feat: add Ascension mode to GamePage (PLACEMENT)"
```

---

## Task 6 — Update `FlagGamePage` for Ascension

**Files:**
- Modify: `src/pages/FlagGamePage.jsx`

- [ ] **Step 1: Update `FlagGamePage.jsx`**

```jsx
// src/pages/FlagGamePage.jsx — full file
import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import * as Flags from 'country-flag-icons/react/3x2'
import { ToastContainer } from 'react-toastify'
import useFlagGameState from '../hooks/useFlagGameState'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import PhaseIndicator from '../components/PhaseIndicator'
import Form from './form'
import AscensionForm from './AscensionForm'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'
import './FlagGamePage.css'

export default function FlagGamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}

  const standardState = useFlagGameState(isAscension ? null : difficulty, isTraining)
  const ascensionState = useAscensionState(
    GAME_TYPES.FLAGS,
    isAscension ? phases : { Facile: 1, Moyen: 0, Difficile: 0, Impossible: 0 },
    isTraining,
    !!isAscension
  )

  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    inputValue, setInputValue, handleSubmit,
    revealedName,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = isAscension ? ascensionState : standardState

  const inputRef = useRef(null)
  useEffect(() => {
    if (targetCountry && !revealedName) inputRef.current?.focus()
  }, [targetCountry, revealedName])

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0
  const isoA2 = targetCountry?.properties?.ISO_A2?.toUpperCase()
  const FlagComponent = isoA2 ? Flags[isoA2] : null
  const onKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div className="flag-game-page">
      {isAscension && (
        <PhaseIndicator
          currentPhase={currentPhase}
          phaseCountRemaining={phaseCountRemaining}
          totalPhaseCount={totalPhaseCount}
        />
      )}

      <div className="hud-container">
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{score}</span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">DRAPEAUX</span>
              <span className="hud-target-name">?</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} pays</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
            <span className="hud-stat-label">✗ PASSÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">◎ RESTANTS</span>
          </div>
        </div>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry} disabled={!!revealedName}>👁 Voir</button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
      </div>

      <div className="flag-game-main">
        {FlagComponent
          ? <FlagComponent className="flag-display" title={revealedName ?? '?'} />
          : <div className="flag-placeholder" />
        }
        {revealedName && <div className="flag-revealed-name">{revealedName}</div>}
        <div className="flag-input-row">
          <input
            ref={inputRef}
            className="flag-input"
            type="text"
            placeholder="Tape le nom du pays..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!!revealedName || isGameOver}
          />
          <button
            className="flag-submit-btn"
            onClick={handleSubmit}
            disabled={!!revealedName || isGameOver || !inputValue.trim()}
          >
            <span aria-label="Valider">→</span>
          </button>
        </div>
      </div>

      {isGameOver && targetCountry && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {isAscension ? (
              <AscensionForm
                score={score} timer={timer} stats={stats} phaseStats={phaseStats}
                gameType={GAME_TYPES.FLAGS} presetName={presetName ?? null} isTraining={isTraining}
              />
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="FLAGS" />
            )}
            <div className="game-over-actions">
              <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
              <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}
```

- [ ] **Step 2: Run existing tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/FlagGamePage.jsx
git commit -m "feat: add Ascension mode to FlagGamePage"
```

---

## Task 7 — Update `CapitalsGamePage` for Ascension

**Files:**
- Modify: `src/pages/CapitalsGamePage.jsx`

- [ ] **Step 1: Update `CapitalsGamePage.jsx`**

```jsx
// src/pages/CapitalsGamePage.jsx — full file
import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import * as Flags from 'country-flag-icons/react/3x2'
import { ToastContainer } from 'react-toastify'
import useCapitalsGameState from '../hooks/useCapitalsGameState'
import useAscensionState from '../hooks/useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import PhaseIndicator from '../components/PhaseIndicator'
import Form from './form'
import AscensionForm from './AscensionForm'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'
import './FlagGamePage.css'
import './CapitalsGamePage.css'

export default function CapitalsGamePage() {
  const { difficulty, isTraining, isAscension, phases, presetName } = useLocation().state || {}

  const standardState = useCapitalsGameState(isAscension ? null : difficulty, isTraining)
  const ascensionState = useAscensionState(
    GAME_TYPES.CAPITALS,
    isAscension ? phases : { Facile: 1, Moyen: 0, Difficile: 0, Impossible: 0 },
    isTraining,
    !!isAscension
  )

  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    inputValue, setInputValue, handleSubmit,
    revealedName,
    seeCountry, restartGame, goHome,
    currentPhase, phaseCountRemaining, totalPhaseCount, phaseStats,
  } = isAscension ? ascensionState : standardState

  const inputRef = useRef(null)
  useEffect(() => {
    if (targetCountry && !revealedName) inputRef.current?.focus()
  }, [targetCountry, revealedName])

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0
  const isoA2 = targetCountry?.properties?.ISO_A2?.toUpperCase()
  const FlagComponent = isoA2 ? Flags[isoA2] : null
  const onKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div className="capitals-game-page">
      {isAscension && (
        <PhaseIndicator
          currentPhase={currentPhase}
          phaseCountRemaining={phaseCountRemaining}
          totalPhaseCount={totalPhaseCount}
        />
      )}

      <div className="hud-container">
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{score}</span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">CAPITALES</span>
              <span className="hud-target-name">?</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>{displayTimer}</span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div className="hud-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="hud-progress-text">{stats.found} / {stats.total} pays</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">{stats.found}</span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">{stats.skipped}</span>
            <span className="hud-stat-label">✗ PASSÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--remaining">
              {stats.total - stats.found - stats.skipped}
            </span>
            <span className="hud-stat-label">◎ RESTANTS</span>
          </div>
        </div>
      </div>

      <div className="hud-actions">
        <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry} disabled={!!revealedName}>👁 Voir</button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
      </div>

      <div className="capitals-game-main">
        {FlagComponent
          ? <FlagComponent className="flag-display" title={targetCountry?.properties?.ADMIN ?? '?'} />
          : <div className="flag-placeholder" />
        }
        <div className="capitals-country-name">
          <span className="capitals-country-label">Pays</span>
          <span className="capitals-country-value">{targetCountry?.properties?.ADMIN ?? ''}</span>
        </div>
        {revealedName && <div className="flag-revealed-name">{revealedName}</div>}
        <div className="flag-input-row">
          <input
            ref={inputRef}
            className="flag-input"
            type="text"
            placeholder="Tape la capitale..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!!revealedName || isGameOver}
          />
          <button
            className="flag-submit-btn"
            onClick={handleSubmit}
            disabled={!!revealedName || isGameOver || !inputValue.trim()}
          >
            <span aria-label="Valider">→</span>
          </button>
        </div>
      </div>

      {isGameOver && targetCountry && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            {isAscension ? (
              <AscensionForm
                score={score} timer={timer} stats={stats} phaseStats={phaseStats}
                gameType={GAME_TYPES.CAPITALS} presetName={presetName ?? null} isTraining={isTraining}
              />
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="CAPITALS" />
            )}
            <div className="game-over-actions">
              <button className="hud-btn hud-btn--restart" onClick={restartGame}>↺ Recommencer</button>
              <button className="hud-btn hud-btn--home" onClick={goHome}>← Accueil</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer enableMultiContainer containerId="centerToast" position="bottom-center" autoClose={3000} theme="dark" hideProgressBar />
      <ToastContainer enableMultiContainer containerId="topRightToast" position="top-right" autoClose={1500} theme="dark" hideProgressBar />
    </div>
  )
}
```

- [ ] **Step 2: Run existing tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/CapitalsGamePage.jsx
git commit -m "feat: add Ascension mode to CapitalsGamePage"
```

---

## Task 8 — Update `HomePage` — Ascension tab on game cards

**Files:**
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/HomePage.css`

- [ ] **Step 1: Update `HomePage.jsx`**

Replace the `ActiveGameCard` component (lines 75–117) and its imports. Keep everything else identical.

```jsx
// Add to imports at top of HomePage.jsx:
import { ASCENSION_PRESETS, matchPreset } from '../utils/ascensionPresets'
import { getTotalCountries } from '../hooks/useGameState'
import { getTotalFlagCountries } from '../hooks/useFlagGameState'
import { getTotalCapitalCountries } from '../hooks/useCapitalsGameState'
```

Replace the `ActiveGameCard` function:

```jsx
function ActiveGameCard({ game }) {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState('Moyen')
  const [mode, setMode] = useState('standard') // 'standard' | 'ascension'

  // Ascension state
  const countFn =
    game.id === GAME_TYPES.FLAGS    ? getTotalFlagCountries :
    game.id === GAME_TYPES.CAPITALS ? getTotalCapitalCountries :
                                      getTotalCountries

  const maxPerDiff = {
    Facile:     countFn('Facile'),
    Moyen:      countFn('Moyen'),
    Difficile:  countFn('Difficile'),
    Impossible: countFn('Impossible'),
  }

  const defaultPhases = ASCENSION_PRESETS[0].phases // Découverte
  const [ascPhases, setAscPhases] = useState({ ...defaultPhases })

  const detectedPreset = matchPreset(ascPhases)

  const handleSlider = (diff, value) => {
    const newPhases = { ...ascPhases, [diff]: Number(value) }
    setAscPhases(newPhases)
  }

  const applyPreset = (preset) => {
    setAscPhases({ ...preset.phases })
  }

  const difficulties = getDifficultiesForGame(game.id)

  const handlePlay = (isTraining = false) => {
    if (mode === 'ascension') {
      navigate(game.route, {
        state: {
          isAscension: true,
          phases: ascPhases,
          presetName: detectedPreset,
          isTraining,
        },
      })
    } else {
      navigate(game.route, { state: { difficulty, isTraining } })
    }
  }

  const ascTotal = Object.values(ascPhases).reduce((s, n) => s + n, 0)

  return (
    <div className="game-card game-card--active">
      <div className="game-card-icon">{game.icon}</div>
      <h2 className="game-card-title">{game.title}</h2>
      <p className="game-card-desc">{game.description}</p>

      <div className="game-card-mode-tabs">
        <button
          className={`game-card-mode-tab${mode === 'standard' ? ' game-card-mode-tab--active' : ''}`}
          onClick={() => setMode('standard')}
        >
          Standard
        </button>
        <button
          className={`game-card-mode-tab${mode === 'ascension' ? ' game-card-mode-tab--active' : ''}`}
          onClick={() => setMode('ascension')}
        >
          🚀 Ascension
        </button>
      </div>

      <div className="game-card-controls">
        {mode === 'standard' ? (
          <div className="difficulty-grid">
            {difficulties.map(d => (
              <button
                key={d.name}
                className={`difficulty-btn${d.name === 'Hardcore' ? ' difficulty-btn--wide' : ''}${difficulty === d.name ? ' difficulty-btn--active' : ''}`}
                onClick={() => setDifficulty(d.name)}
              >
                <span className="difficulty-btn-name" style={{ color: d.color }}>
                  {d.name === 'Hardcore' ? '💀 Hardcore — Tous les pays' : d.name}
                </span>
                <span className="difficulty-btn-count">{d.count} pays</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="ascension-config">
            <div className="ascension-presets">
              {ASCENSION_PRESETS.map(p => (
                <button
                  key={p.name}
                  className={`ascension-preset-btn${detectedPreset === p.name ? ' ascension-preset-btn--active' : ''}`}
                  onClick={() => applyPreset(p)}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>

            <div className="ascension-sliders">
              {['Facile', 'Moyen', 'Difficile', 'Impossible'].map(diff => (
                <div key={diff} className="ascension-slider-row">
                  <span
                    className="ascension-slider-label"
                    style={{ color: DIFFICULTY_COLORS[diff] }}
                  >
                    {diff}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={maxPerDiff[diff]}
                    value={ascPhases[diff] ?? 0}
                    onChange={e => handleSlider(diff, e.target.value)}
                    className="ascension-slider"
                    style={{ '--slider-color': DIFFICULTY_COLORS[diff] }}
                  />
                  <span className="ascension-slider-value">{ascPhases[diff] ?? 0}</span>
                </div>
              ))}
            </div>

            <div className="ascension-summary">
              Total : {ascTotal} pays
              {detectedPreset
                ? <span className="ascension-preset-match"> · {ASCENSION_PRESETS.find(p => p.name === detectedPreset)?.icon} {detectedPreset}</span>
                : <span className="ascension-custom"> · Config custom</span>
              }
            </div>
          </div>
        )}

        <button
          className="nav-scores-btn"
          onClick={() => navigate(`/scores?game=${game.id}`)}
        >
          🏆 Scores
        </button>
        <div className="game-card-buttons">
          <button className="btn-play" onClick={() => handlePlay(false)} disabled={mode === 'ascension' && ascTotal === 0}>
            Jouer
          </button>
          <button className="btn-training" onClick={() => handlePlay(true)} disabled={mode === 'ascension' && ascTotal === 0}>
            Entraînement
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS to `HomePage.css`**

Append to `src/pages/HomePage.css`:

```css
/* ── Ascension mode tabs ───────────────────────────────────── */
.game-card-mode-tabs {
  display: flex;
  border-bottom: 1px solid var(--border, #334155);
  margin-bottom: 12px;
}

.game-card-mode-tab {
  flex: 1;
  padding: 6px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted, #94a3b8);
  font-size: 0.85em;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.game-card-mode-tab--active {
  color: var(--accent-purple, #7b2ff7);
  border-bottom-color: var(--accent-purple, #7b2ff7);
  font-weight: 600;
}

/* ── Ascension config ──────────────────────────────────────── */
.ascension-config {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ascension-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ascension-preset-btn {
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid var(--border, #334155);
  background: var(--bg-secondary, #1e293b);
  color: var(--text-secondary, #e2e8f0);
  font-size: 0.78em;
  cursor: pointer;
  transition: border-color 0.15s;
}

.ascension-preset-btn--active {
  border-color: var(--accent-purple, #7b2ff7);
  color: var(--accent-purple, #7b2ff7);
}

.ascension-sliders {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ascension-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ascension-slider-label {
  width: 76px;
  font-size: 0.82em;
  font-weight: 500;
}

.ascension-slider {
  flex: 1;
  accent-color: var(--slider-color, #7b2ff7);
  height: 4px;
  cursor: pointer;
}

.ascension-slider-value {
  width: 24px;
  text-align: right;
  font-size: 0.82em;
  color: var(--text-secondary, #e2e8f0);
}

.ascension-summary {
  font-size: 0.8em;
  color: var(--text-muted, #94a3b8);
}

.ascension-preset-match {
  color: var(--accent-purple, #7b2ff7);
}

.ascension-custom {
  color: var(--text-muted, #94a3b8);
  font-style: italic;
}
```

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 4: Smoke-test in browser**

```bash
npm run dev
```
- Open a game card, click "🚀 Ascension" tab
- Verify sliders appear, preset buttons work, slider auto-detects preset
- Click "Jouer" — should navigate to game with `isAscension: true` in location state

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.jsx src/pages/HomePage.css
git commit -m "feat: add Ascension tab with sliders and preset buttons to HomePage"
```

---

## Task 9 — `AscensionScoreboard` component

**Files:**
- Create: `src/pages/AscensionScoreboard.jsx`

- [ ] **Step 1: Create `AscensionScoreboard.jsx`**

```jsx
// src/pages/AscensionScoreboard.jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import { GAME_TYPES } from '../utils/gameTypes'
import { ASCENSION_PRESETS } from '../utils/ascensionPresets'

const ACTIVE_GAMES = [
  { id: GAME_TYPES.PLACEMENT, label: 'Trouve le Pays' },
  { id: GAME_TYPES.FLAGS,     label: 'Trouve le Drapeau' },
  { id: GAME_TYPES.CAPITALS,  label: 'Trouve la Capitale' },
]

const MEDAL = ['🥇', '🥈', '🥉']

export default function AscensionScoreboard() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState(GAME_TYPES.PLACEMENT)
  const [selectedPreset, setSelectedPreset] = useState(ASCENSION_PRESETS[0].name)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const ref = collection(firestore, 'ascensionScores')
        const q = query(
          ref,
          where('gameType', '==', selectedGame),
          where('presetName', '==', selectedPreset)
        )
        const snap = await getDocs(q)
        const data = snap.docs.map(d => d.data())
        // Sort by globalTimeMs asc, then globalScore desc
        data.sort((a, b) => {
          if (a.globalTimeMs !== b.globalTimeMs) return a.globalTimeMs - b.globalTimeMs
          return b.globalScore - a.globalScore
        })
        setScores(data)
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [selectedGame, selectedPreset])

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">🚀 Classement Ascension</h1>

      <div className="scoreboard-filters">
        <select
          className="scoreboard-select"
          value={selectedGame}
          onChange={e => setSelectedGame(e.target.value)}
        >
          {ACTIVE_GAMES.map(g => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>

        <select
          className="scoreboard-select"
          value={selectedPreset}
          onChange={e => setSelectedPreset(e.target.value)}
        >
          {ASCENSION_PRESETS.map(p => (
            <option key={p.name} value={p.name}>{p.icon} {p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">Aucun score pour ce preset.</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header" style={{ gridTemplateColumns: '40px 1fr 80px 80px 60px' }}>
            <span>#</span>
            <span>Joueur</span>
            <span>Temps</span>
            <span>Score</span>
            <span>Trouvés</span>
          </div>
          {scores.map((s, i) => (
            <div key={i} className={`scoreboard-row ${i < 3 ? 'scoreboard-row--top' : ''}`}
              style={{ gridTemplateColumns: '40px 1fr 80px 80px 60px' }}>
              <span className="scoreboard-rank">{i < 3 ? MEDAL[i] : `#${i + 1}`}</span>
              <span className="scoreboard-name">{s.name}</span>
              <span className="scoreboard-time">{formatTime(s.globalTimeMs)}</span>
              <span className="scoreboard-score">{s.globalScore} pts</span>
              <span className="scoreboard-difficulty">{s.totalFound}/{s.totalFound + s.totalSkipped}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AscensionScoreboard.jsx
git commit -m "feat: add AscensionScoreboard component"
```

---

## Task 10 — Update `Scoreboard` with Ascension tab

**Files:**
- Modify: `src/pages/Scoreboard.jsx`
- Modify: `src/pages/scoreboard.css`

- [ ] **Step 1: Add Ascension tab to `Scoreboard.jsx`**

Add import at top:
```js
import AscensionScoreboard from './AscensionScoreboard'
```

Add state after existing state declarations:
```js
const [scoreboardMode, setScoreboardMode] = useState('standard') // 'standard' | 'ascension'
```

Wrap the existing return in a new structure. Replace the existing `<div className="scoreboard">` content with:

```jsx
return (
  <div className="scoreboard">
    <h1 className="scoreboard-title">Tableau des scores</h1>

    <div className="scoreboard-mode-tabs">
      <button
        className={`scoreboard-mode-tab${scoreboardMode === 'standard' ? ' scoreboard-mode-tab--active' : ''}`}
        onClick={() => setScoreboardMode('standard')}
      >
        Standard
      </button>
      <button
        className={`scoreboard-mode-tab${scoreboardMode === 'ascension' ? ' scoreboard-mode-tab--active' : ''}`}
        onClick={() => setScoreboardMode('ascension')}
      >
        🚀 Ascension
      </button>
    </div>

    {scoreboardMode === 'ascension' ? (
      <AscensionScoreboard />
    ) : (
      <>
        <div className="scoreboard-era-tabs">
          <button
            className={`scoreboard-era-tab ${!isLegacy ? 'scoreboard-era-tab--active' : ''}`}
            onClick={() => setIsLegacy(false)}
          >
            Classement actuel <br />(nouvelles difficultés)
          </button>
          <button
            className={`scoreboard-era-tab ${isLegacy ? 'scoreboard-era-tab--active' : ''}`}
            onClick={() => setIsLegacy(true)}
          >
            Ancien classement
          </button>
        </div>

        <div className="scoreboard-filters">
          <select className="scoreboard-select" value={selectedGame} onChange={e => setSelectedGame(e.target.value)}>
            {ACTIVE_GAMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            <option value="AllGames">Tous les jeux</option>
          </select>
          <select className="scoreboard-select" value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)}>
            {DIFFICULTY_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
            <option value="AllScores">Toutes les difficultés</option>
          </select>
        </div>

        {loading ? (
          <p className="scoreboard-loading">Chargement...</p>
        ) : scores.length === 0 ? (
          <p className="scoreboard-empty">Aucun score pour cette difficulté.</p>
        ) : (
          <div className="scoreboard-table">
            <div className="scoreboard-header">
              <span>#</span><span>Joueur</span><span>Score</span><span>Temps</span><span>Difficulté</span>
            </div>
            {scores.map((s, index) => (
              <div key={index} className={`scoreboard-row ${index < 3 ? 'scoreboard-row--top' : ''}`}>
                <span className="scoreboard-rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
                <span className="scoreboard-name">{s.name}</span>
                <span className="scoreboard-score">{s.score} pts</span>
                <span className="scoreboard-time">{s.elapsedTime != null ? formatTime(s.elapsedTime) : '—'}</span>
                <span className="scoreboard-difficulty">{s.difficulty}</span>
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </div>
)
```

- [ ] **Step 2: Add CSS to `scoreboard.css`**

Append:
```css
/* ── Scoreboard mode tabs (Standard / Ascension) ─────────── */
.scoreboard-mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.scoreboard-mode-tab {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border, #334155);
  background: var(--bg-secondary, #1e293b);
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  font-size: 0.9em;
  transition: border-color 0.15s, color 0.15s;
}

.scoreboard-mode-tab--active {
  border-color: var(--accent-purple, #7b2ff7);
  color: var(--accent-purple, #7b2ff7);
  font-weight: 600;
}
```

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run
```
Expected: all pass

- [ ] **Step 4: Smoke-test end-to-end in browser**

```bash
npm run dev
```
- Go to Scores page → click "🚀 Ascension" tab
- Select game + preset — should load (empty or with data)
- Play a full Ascension game on any mode → game over screen shows phase table
- Save score → check Firebase console for `ascensionScores` collection entry

- [ ] **Step 5: Commit**

```bash
git add src/pages/Scoreboard.jsx src/pages/scoreboard.css src/pages/AscensionScoreboard.jsx
git commit -m "feat: add Ascension tab to Scoreboard page"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Fluid phase transition (toast only) — `advanceGame` in `useAscensionState`
- ✅ Sliders per difficulty, bounded by available count — `maxPerDiff` in `ActiveGameCard`
- ✅ 4 presets (Découverte 16, Progressif 31, Challenge 23, Hardcore 35) — `ASCENSION_PRESETS`
- ✅ Auto-detect preset from sliders — `matchPreset` called on every slider change
- ✅ Phase 0 = skipped — `buildPhaseSequence` filters zeros
- ✅ Global timer continuous — single timer in `useAscensionState`
- ✅ Per-phase stats — `phaseStatsRef` pushed on phase completion
- ✅ Separate `ascensionScores` Firestore collection — `AscensionForm`
- ✅ Only preset configs saved — `canSave = !isTraining && presetName !== null`
- ✅ Scoreboard filter by game + preset — `AscensionScoreboard`
- ✅ Sort by time asc, score desc — sort in `AscensionScoreboard`
- ✅ Phase indicator in-game — `PhaseIndicator` component
- ✅ Training mode: timer shows ∞, not saved — `displayTimer` + `canSave`
- ✅ "Hardcore" meta-difficulty not used in Ascension — Ascension uses individual levels only

**Type consistency:** `phaseStats` array uses `{ difficulty, count, found, skipped, timeMs }` consistently across `useAscensionState`, `AscensionForm`, and `AscensionScoreboard`.

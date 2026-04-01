# Game Refonte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the game from countdown-timer to find-all-countries mode, with a rising timer, live stats HUD, difficulty grid with country counts, and elapsed time saved in scores.

**Architecture:** Extract all game logic into `src/hooks/useGameState.js`; `GamePage.jsx` becomes pure JSX consuming the hook. Stats (found/skipped/remaining) are tracked in hook state. The timer counts up and stops when all countries are processed.

**Tech Stack:** React 18, react-leaflet, Firebase Firestore, Vitest, react-toastify

**Branch:** `refonte` — work in `D:/NasaCode/GeoGame/.claude/worktrees/dazzling-mendel` which tracks `claude/dazzling-mendel`. The `refonte` branch should be checked out or cherry-picked after.

---

## File Map

| File | Action | Responsibility |
|------|---------|----------------|
| `src/utils/formatTime.js` | **Create** | Pure fn: seconds → "MM:SS" |
| `src/utils/formatTime.test.js` | **Create** | Unit tests for formatTime |
| `src/hooks/useGameState.js` | **Create** | All game logic (timer, score, stats, countries, actions) |
| `src/pages/GamePage.jsx` | **Rewrite** | JSX only — consumes useGameState |
| `src/pages/GamePage.css` | **Rewrite** | New HUD layout (container, main block, stats block) |
| `src/pages/HomePage.jsx` | **Modify** | Replace `<select>` with difficulty grid |
| `src/pages/HomePage.css` | **Modify** | Add difficulty grid styles |
| `src/pages/form.jsx` | **Modify** | Accept + display + save `elapsedTime` |
| `src/pages/Scoreboard.jsx` | **Modify** | Add Temps column, fix sort tiebreaker |
| `src/pages/Scoreboard.test.js` | **Modify** | Add sortScores tiebreaker tests |
| `src/pages/scoreboard.css` | **Modify** | Add 5th grid column for Temps |

---

## Task 1: `formatTime` utility

**Files:**
- Create: `src/utils/formatTime.js`
- Create: `src/utils/formatTime.test.js`

- [ ] **Step 1.1 — Write the failing test**

```js
// src/utils/formatTime.test.js
import { describe, it, expect } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('formats 0 as 00:00', () => expect(formatTime(0)).toBe('00:00'))
  it('formats 65 as 01:05', () => expect(formatTime(65)).toBe('01:05'))
  it('formats 90 as 01:30', () => expect(formatTime(90)).toBe('01:30'))
  it('formats 3600 as 60:00', () => expect(formatTime(3600)).toBe('60:00'))
})
```

- [ ] **Step 1.2 — Run to verify failure**

```
npm test
```
Expected: `Cannot find module './formatTime'`

- [ ] **Step 1.3 — Implement**

```js
// src/utils/formatTime.js
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 1.4 — Run to verify pass**

```
npm test
```
Expected: 4 tests pass.

- [ ] **Step 1.5 — Commit**

```bash
git add src/utils/formatTime.js src/utils/formatTime.test.js
git commit -m "feat: add formatTime utility (seconds → MM:SS)"
```

---

## Task 2: `useGameState` hook

**Files:**
- Create: `src/hooks/useGameState.js`

- [ ] **Step 2.1 — Create the file with all imports, constants, and helpers**

```js
// src/hooks/useGameState.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import countries from '../data/countriesWithDifficulty_FR.json'
import { formatTime } from '../utils/formatTime'

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']

const COUNTRY_STYLE = {
  fillColor: 'transparent',
  color: '#334155',
  fillOpacity: 1,
  weight: 0.85,
}

function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Impossible']
  return DIFFICULTIES.slice(0, DIFFICULTIES.indexOf(difficulty) + 1)
}

export function getTotalCountries(difficulty) {
  const available = getAvailableDifficulties(difficulty)
  return countries.features.filter(c =>
    available.includes(c.properties.Difficulty)
  ).length
}

let alreadyChosenCountries = []
```

- [ ] **Step 2.2 — Add all state and refs inside the hook**

```js
// src/hooks/useGameState.js  (continued — add after the module-level code)
export default function useGameState(difficulty, isTraining) {
  const navigate = useNavigate()

  const [targetCountry, setTargetCountry] = useState(null)
  const targetCountryRef = useRef(null)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const gameStartedRef = useRef(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const consecutiveErrorsRef = useRef(0)
  const geoJsonRef = useRef(null)
  const [mapRef, setMapRef] = useState(null)
  const [timer, setTimer] = useState(0)
  const timerRef = useRef(0)
  const [clickOnSeeCountry, setClickOnSeeCountry] = useState(false)
  const clickOnSeeCountryRef = useRef(false)
  const [stats, setStats] = useState({ found: 0, skipped: 0, total: 0 })
  const gameOverToastShownRef = useRef(false)
```

- [ ] **Step 2.3 — Add redirect effect and getRandomCountry**

```js
  // Redirect if no difficulty
  useEffect(() => {
    if (!difficulty) navigate('/')
  }, [difficulty, navigate])

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

- [ ] **Step 2.4 — Add zoomCountryMap and game start effect**

```js
  const zoomCountryMap = useCallback((lat, lng) => {
    if (!mapRef) return
    const targetDiff = countries.features.find(
      c => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty
    if (targetCountryRef.current === 'Vatican') {
      mapRef.setView([lat, lng], 20)
    } else if (targetDiff === 'Difficile') {
      mapRef.setView([lat, lng], 7)
    } else if (targetDiff === 'Impossible') {
      mapRef.setView([lat, lng], 9)
    } else {
      mapRef.setView([lat, lng], 4)
    }
  }, [mapRef])

  // Start game on mount
  useEffect(() => {
    if (!difficulty) return
    alreadyChosenCountries = []
    const total = getTotalCountries(difficulty)
    setStats({ found: 0, skipped: 0, total })
    const firstCountry = getRandomCountry(difficulty)
    if (firstCountry) {
      alreadyChosenCountries.push(firstCountry)
      setTargetCountry(firstCountry)
      gameStartedRef.current = true
      setGameStarted(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2.5 — Add ref sync effects, 3-errors handler, timer**

```js
  useEffect(() => { targetCountryRef.current = targetCountry }, [targetCountry])
  useEffect(() => { consecutiveErrorsRef.current = consecutiveErrors }, [consecutiveErrors])
  useEffect(() => { clickOnSeeCountryRef.current = clickOnSeeCountry }, [clickOnSeeCountry])

  // 3 consecutive errors: highlight country, decrement score
  useEffect(() => {
    if (consecutiveErrors < 3) return
    toast.error('Dommage ! C\'est ici que se trouvait ' + targetCountryRef.current, {
      containerId: 'topRightToast',
    })
    if (geoJsonRef.current) {
      const layer = geoJsonRef.current.getLayers().find(
        l => l.feature.properties.ADMIN === targetCountryRef.current
      )
      if (layer) {
        layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
        const center = layer.getBounds().getCenter()
        zoomCountryMap(center.lat, center.lng)
      }
    }
    decrementScore(
      countries.features.find(c => c.properties.ADMIN === targetCountryRef.current)
        ?.properties.Difficulty || 'Difficile'
    )
  }, [consecutiveErrors, zoomCountryMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer counts UP; stops when all processed
  const allProcessed = stats.total > 0 && (stats.found + stats.skipped >= stats.total)

  useEffect(() => {
    if (!gameStarted || allProcessed) return
    const id = setInterval(() => {
      setTimer(t => { timerRef.current = t + 1; return t + 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [gameStarted, timer, allProcessed]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toast when training mode finishes all countries
  useEffect(() => {
    if (!allProcessed || !gameStarted || gameOverToastShownRef.current) return
    gameOverToastShownRef.current = true
    if (isTraining) {
      toast.success('Bravo ! Vous avez trouvé tous les pays !', {
        containerId: 'centerToast',
      })
    }
  }, [allProcessed, gameStarted, isTraining])
```

- [ ] **Step 2.6 — Add score helpers, changeCountry, mouse handlers**

```js
  const decrementScore = (diff) => {
    const amounts = { Facile: 3, Moyen: 2, Difficile: 1, Impossible: 0.5 }
    setScore(prev => Math.max(0, prev - (amounts[diff] ?? 1)))
  }

  const incrementScore = (diff) => {
    const amounts = { Facile: 1, Moyen: 2, Difficile: 3, Impossible: 4 }
    setScore(prev => prev + (amounts[diff] ?? 1))
  }

  const changeCountry = useCallback(() => {
    const next = getRandomCountry(difficulty)
    if (next) {
      alreadyChosenCountries.push(next)
      setTargetCountry(next)
    }
  }, [difficulty, getRandomCountry])

  const onCountryMouseOver = (event) => {
    const layer = event.target
    if (layer.options.fillColor === '#4ade80') return
    layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
  }

  const onCountryMouseOut = (event) => {
    const layer = event.target
    if (layer.options.fillColor === '#4ade80') return
    layer.setStyle(COUNTRY_STYLE)
  }
```

- [ ] **Step 2.7 — Add onCountryClick with stats tracking**

```js
  const onCountryClick = (event) => {
    if (!gameStartedRef.current) return
    const clickedName = event.target.feature.properties.ADMIN
    const targetDiff = countries.features.find(
      c => c.properties.ADMIN === targetCountryRef.current
    )?.properties.Difficulty

    if (clickedName === targetCountryRef.current) {
      const wasSkipped =
        consecutiveErrorsRef.current >= 3 || clickOnSeeCountryRef.current
      if (!wasSkipped) {
        toast.success('Bravo ! ' + targetCountryRef.current + ' !', {
          containerId: 'topRightToast',
        })
        incrementScore(targetDiff)
      }
      event.target.setStyle({ fillColor: '#4ade80', weight: 2, fillOpacity: 0.5 })
      setStats(prev =>
        wasSkipped
          ? { ...prev, skipped: prev.skipped + 1 }
          : { ...prev, found: prev.found + 1 }
      )
      changeCountry()
      setConsecutiveErrors(0)
      setClickOnSeeCountry(false)
      clickOnSeeCountryRef.current = false
    } else {
      toast.error('Dommage !', { containerId: 'topRightToast' })
      setConsecutiveErrors(prev => prev + 1)
    }
  }
```

- [ ] **Step 2.8 — Add seeCountry, restartGame, goHome and return**

```js
  const seeCountry = () => {
    setClickOnSeeCountry(true)
    clickOnSeeCountryRef.current = true
    if (!geoJsonRef.current) return
    const layer = geoJsonRef.current.getLayers().find(
      l => l.feature.properties.ADMIN === targetCountryRef.current
    )
    if (!layer) return
    layer.setStyle({ fillColor: '#ff4d4d', weight: 2, fillOpacity: 0.5 })
    const center = layer.getBounds().getCenter()
    zoomCountryMap(center.lat, center.lng)
    decrementScore('Difficile')
  }

  const restartGame = () => {
    alreadyChosenCountries = []
    setScore(0)
    setConsecutiveErrors(0)
    setClickOnSeeCountry(false)
    clickOnSeeCountryRef.current = false
    gameOverToastShownRef.current = false
    if (geoJsonRef.current) {
      geoJsonRef.current.getLayers().forEach(l => l.setStyle(COUNTRY_STYLE))
    }
    setTimer(0)
    timerRef.current = 0
    const total = getTotalCountries(difficulty)
    setStats({ found: 0, skipped: 0, total })
    changeCountry()
  }

  const goHome = () => {
    alreadyChosenCountries = []
    navigate('/')
  }

  const isGameOver = allProcessed && !isTraining
  const displayTimer = isTraining ? '∞' : formatTime(timer)

  return {
    targetCountry,
    score,
    timer,
    stats,
    isGameOver,
    displayTimer,
    geoJsonRef,
    mapRef,
    setMapRef,
    onCountryClick,
    onCountryMouseOver,
    onCountryMouseOut,
    seeCountry,
    restartGame,
    goHome,
  }
}
```

- [ ] **Step 2.9 — Commit**

```bash
git add src/hooks/useGameState.js
git commit -m "feat: extract game logic into useGameState hook (timer up, stats tracking)"
```

---

## Task 3: Refactor `GamePage.jsx`

**Files:**
- Modify: `src/pages/GamePage.jsx` (full rewrite)

- [ ] **Step 3.1 — Rewrite GamePage.jsx**

```jsx
// src/pages/GamePage.jsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { ToastContainer } from 'react-toastify'
import useGameState from '../hooks/useGameState'
import countries from '../data/countriesWithDifficulty_FR.json'
import Form from './form'
import 'leaflet/dist/leaflet.css'
import 'react-toastify/dist/ReactToastify.css'
import './GamePage.css'

export default function GamePage() {
  const { difficulty, isTraining } = useLocation().state || {}
  const {
    targetCountry, score, timer, stats,
    isGameOver, displayTimer,
    geoJsonRef, setMapRef,
    onCountryClick, onCountryMouseOver, onCountryMouseOut,
    seeCountry, restartGame, goHome,
  } = useGameState(difficulty, isTraining)

  const progressPct = stats.total ? (stats.found / stats.total) * 100 : 0

  return (
    <div className="game-page">
      <div className="hud-container">
        <div className="hud-main">
          <div className="hud-row">
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>
                {score}
              </span>
              <span className="hud-label">SCORE</span>
            </div>
            <div className="hud-cell hud-cell--target">
              <span className="hud-target-label">PAYS À TROUVER</span>
              <span className="hud-target-name">{targetCountry}</span>
            </div>
            <div className="hud-cell">
              <span className="hud-value" style={{ color: 'var(--accent-cyan)' }}>
                {displayTimer}
              </span>
              <span className="hud-label">TEMPS</span>
            </div>
          </div>
          <div className="hud-progress-wrap">
            <div className="hud-progress-track">
              <div
                className="hud-progress-bar"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="hud-progress-text">
              {stats.found} / {stats.total} pays
            </span>
          </div>
        </div>

        <div className="hud-stats">
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--found">
              {stats.found}
            </span>
            <span className="hud-stat-label">✓ TROUVÉS</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-value hud-stat-value--skipped">
              {stats.skipped}
            </span>
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
        <button className="hud-btn hud-btn--home" onClick={goHome}>
          ← Accueil
        </button>
        <button className="hud-btn hud-btn--see" onClick={seeCountry}>
          👁 Voir
        </button>
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>
          ↺ Recommencer
        </button>
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} />
        </div>
      )}

      <ToastContainer
        enableMultiContainer
        containerId="centerToast"
        position="bottom-center"
        autoClose={3000}
        theme="dark"
        hideProgressBar
      />
      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
        zoomControl={false}
        dragging
        doubleClickZoom={false}
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
          noWrap
          minZoom={2}
          maxZoom={20}
        />
        <GeoJSON
          ref={geoJsonRef}
          style={{ fillColor: 'transparent', color: '#334155', fillOpacity: 1, weight: 0.85 }}
          data={countries.features}
          onEachFeature={(feature, layer) => {
            layer.on({
              click: onCountryClick,
              mouseover: onCountryMouseOver,
              mouseout: onCountryMouseOut,
            })
          }}
        />
      </MapContainer>
    </div>
  )
}
```

- [ ] **Step 3.2 — Commit**

```bash
git add src/pages/GamePage.jsx
git commit -m "refactor: GamePage is now JSX-only, consumes useGameState hook"
```

---

## Task 4: Update `GamePage.css`

**Files:**
- Modify: `src/pages/GamePage.css` (full rewrite)

- [ ] **Step 4.1 — Rewrite GamePage.css**

```css
/* src/pages/GamePage.css */
.game-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

/* ── HUD container (top-left, stacks main + stats) ── */
.hud-container {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 320px;
}

/* ── HUD Main block ── */
.hud-main {
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 16px 10px;
}

.hud-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.hud-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
}

.hud-cell--target {
  flex: 1;
  align-items: center;
  padding: 0 10px;
}

.hud-target-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.hud-target-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.hud-value {
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1;
}

.hud-label {
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 2px;
  margin-top: 2px;
}

/* ── Progress bar ── */
.hud-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-progress-track {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
}

.hud-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #00d4ff);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.hud-progress-text {
  font-size: 0.6rem;
  color: var(--text-muted);
  white-space: nowrap;
  letter-spacing: 0.5px;
}

/* ── HUD Stats block ── */
.hud-stats {
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  display: flex;
  justify-content: space-around;
}

.hud-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud-stat-value {
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1;
}

.hud-stat-value--found     { color: #4ade80; }
.hud-stat-value--skipped   { color: #f87171; }
.hud-stat-value--remaining { color: #fbbf24; }

.hud-stat-label {
  font-size: 0.6rem;
  color: var(--text-muted);
  letter-spacing: 1.5px;
  margin-top: 2px;
}

/* ── HUD Actions (bottom-center) ── */
.hud-actions {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 10px;
}

.hud-btn {
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-family: var(--font-main);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  transition: background 0.2s, transform 0.1s;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.hud-btn--home    { color: var(--accent-cyan);  border-color: var(--accent-cyan-border); }
.hud-btn--see     { color: var(--warning);       border-color: rgba(251, 191, 36, 0.3); }
.hud-btn--restart { color: var(--danger);        border-color: rgba(255, 77, 77, 0.3); }

/* ── Game over overlay ── */
.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
  background: rgba(15, 15, 26, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 4.2 — Commit**

```bash
git add src/pages/GamePage.css
git commit -m "style: new HUD layout (container, main block, stats block, progress bar)"
```

---

## Task 5: Update `HomePage.jsx`

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 5.1 — Replace the `<select>` with a difficulty grid**

Replace the entire `DIFFICULTIES` const and `game-card-controls` section. The new HomePage.jsx:

```jsx
// src/pages/HomePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Scoreboard from './Scoreboard'
import './HomePage.css'

const DIFFICULTIES = [
  { name: 'Facile',     count: 29,  color: '#4ade80' },
  { name: 'Moyen',      count: 83,  color: '#00d4ff' },
  { name: 'Difficile',  count: 191, color: '#fbbf24' },
  { name: 'Impossible', count: 244, color: '#f97316' },
  { name: 'Hardcore',   count: 53,  color: '#f87171' },
]

const GAMES = [
  {
    id: 'country',
    icon: '🌍',
    title: 'Trouve le Pays',
    description: 'Trouve tous les pays de la difficulté choisie.',
    active: true,
  },
  {
    id: 'flags',
    icon: '🚩',
    title: 'Trouve le Drapeau',
    description: 'Identifie le pays à partir de son drapeau',
    active: false,
  },
  {
    id: 'placement',
    icon: '📍',
    title: 'Placement Pays',
    description: 'Place le pays au bon endroit sur la carte',
    active: false,
  },
  {
    id: 'lives',
    icon: '⚡',
    title: 'Mode Vies',
    description: 'Trouve un maximum de pays sans te tromper',
    active: false,
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState('Moyen')
  const [showScoreboard, setShowScoreboard] = useState(false)

  const handlePlay = (isTraining = false) => {
    navigate('/game', { state: { difficulty, isTraining } })
  }

  return (
    <div className="home-page">
      <nav className="home-nav">
        <span className="home-logo">
          GEO<span className="home-logo-accent">GAME</span>
        </span>
        <button
          className="nav-scores-btn"
          onClick={() => setShowScoreboard(v => !v)}
        >
          🏆 Scores
        </button>
      </nav>

      <main className="home-main">
        <div className="home-hero">
          <h1 className="home-title">Choisissez votre jeu</h1>
          <p className="home-subtitle">Explore • Découvre • Compète</p>
        </div>

        <div className="games-grid">
          {GAMES.map(game =>
            game.active ? (
              <div key={game.id} className="game-card game-card--active">
                <div className="game-card-icon">{game.icon}</div>
                <h2 className="game-card-title">{game.title}</h2>
                <p className="game-card-desc">{game.description}</p>

                <div className="game-card-controls">
                  <div className="difficulty-grid">
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d.name}
                        className={`difficulty-btn${d.name === 'Hardcore' ? ' difficulty-btn--wide' : ''}${difficulty === d.name ? ' difficulty-btn--active' : ''}`}
                        onClick={() => setDifficulty(d.name)}
                      >
                        <span
                          className="difficulty-btn-name"
                          style={{ color: d.color }}
                        >
                          {d.name === 'Hardcore' ? '💀 Hardcore' : d.name}
                        </span>
                        <span className="difficulty-btn-count">
                          {d.count} pays
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="game-card-buttons">
                    <button className="btn-play" onClick={() => handlePlay(false)}>
                      Jouer
                    </button>
                    <button className="btn-training" onClick={() => handlePlay(true)}>
                      Entraînement
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={game.id} className="game-card game-card--soon">
                <div className="game-card-icon game-card-icon--dim">{game.icon}</div>
                <h2 className="game-card-title game-card-title--dim">{game.title}</h2>
                <p className="game-card-desc game-card-desc--dim">{game.description}</p>
                <span className="badge-soon">BIENTÔT</span>
              </div>
            )
          )}
        </div>

        {showScoreboard && (
          <div className="scoreboard-section">
            <Scoreboard />
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 5.2 — Commit**

```bash
git add src/pages/HomePage.jsx
git commit -m "feat: replace difficulty select with button grid showing country counts"
```

---

## Task 6: Update `HomePage.css`

**Files:**
- Modify: `src/pages/HomePage.css`

- [ ] **Step 6.1 — Add difficulty grid styles** (append to end of existing file)

```css
/* ── Difficulty Grid ── */
.difficulty-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.difficulty-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  transition: border-color 0.15s, background 0.15s;
  font-family: var(--font-main);
  text-align: left;
}

.difficulty-btn:hover {
  background: var(--bg-card);
}

.difficulty-btn--active {
  border-color: var(--accent-purple);
  background: rgba(123, 47, 247, 0.12);
}

.difficulty-btn--wide {
  grid-column: 1 / -1;
  align-items: center;
}

.difficulty-btn-name {
  font-size: 0.82rem;
  font-weight: 700;
}

.difficulty-btn-count {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 2px;
}
```

- [ ] **Step 6.2 — Commit**

```bash
git add src/pages/HomePage.css
git commit -m "style: add difficulty grid button styles"
```

---

## Task 7: Update `form.jsx`

**Files:**
- Modify: `src/pages/form.jsx`

- [ ] **Step 7.1 — Update form.jsx to accept, display, and save elapsedTime**

```jsx
// src/pages/form.jsx
import React, { useRef } from 'react'
import './form.css'
import 'react-toastify/dist/ReactToastify.css'
import { firestore } from '../Firebase'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { formatTime } from '../utils/formatTime'

export default function Form({ finalScore, difficulty, elapsedTime }) {
  const nameRef = useRef()
  const ref = collection(firestore, 'scores')

  const handleSave = async (e) => {
    e.preventDefault()
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error('Veuillez rentrer un pseudo', { containerId: 'topRightToast' })
      return
    }

    const data = { name, score: finalScore, difficulty, elapsedTime }

    const existingSnapshot = await getDocs(
      query(ref, where('name', '==', name), where('difficulty', '==', difficulty))
    )

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data()
      if (!window.confirm(`Remplacer votre score de ${existing.score} pts par ${finalScore} pts ?`)) {
        return
      }
      await deleteDoc(existingSnapshot.docs[0].ref)
    }

    try {
      await addDoc(ref, data)
      toast.success(`Score de ${name} sauvegardé !`, { containerId: 'topRightToast' })
      const submitBtn = document.getElementById('submitBtn')
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = 'Score sauvegardé ✓'
      }
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { containerId: 'topRightToast' })
      console.error(err)
    }
  }

  return (
    <div className="form-container">
      <h2 className="form-title">Partie terminée !</h2>
      <p className="form-score-display">
        Score : <strong>{finalScore} pts</strong> — {difficulty}
      </p>
      <p className="form-score-display">
        Temps : <strong>{formatTime(elapsedTime)}</strong>
      </p>
      <form onSubmit={handleSave}>
        <label htmlFor="name" className="form-label">Pseudo</label>
        <input
          type="text"
          id="name"
          ref={nameRef}
          className="form-input"
          placeholder="Ton pseudo..."
          maxLength={20}
        />
        <button id="submitBtn" type="submit" className="form-submit">
          Sauvegarder le score
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 7.2 — Commit**

```bash
git add src/pages/form.jsx
git commit -m "feat: form displays and saves elapsedTime (MM:SS)"
```

---

## Task 8: Update `Scoreboard.jsx`, CSS, and tests

**Files:**
- Modify: `src/pages/Scoreboard.jsx`
- Modify: `src/pages/scoreboard.css`
- Modify: `src/pages/Scoreboard.test.js`

- [ ] **Step 8.1 — Add sortScores tests to Scoreboard.test.js**

Append to `src/pages/Scoreboard.test.js`:

```js
// append to src/pages/Scoreboard.test.js

const sortScores = (scores) =>
  [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const tA = a.elapsedTime ?? Infinity
    const tB = b.elapsedTime ?? Infinity
    return tA - tB
  })

describe('sortScores', () => {
  it('trie par score décroissant', () => {
    const input = [
      { name: 'A', score: 5,  difficulty: 'Facile', elapsedTime: 120 },
      { name: 'B', score: 10, difficulty: 'Facile', elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('B')
  })

  it('à score égal, trie par temps croissant', () => {
    const input = [
      { name: 'Slow', score: 10, difficulty: 'Facile', elapsedTime: 180 },
      { name: 'Fast', score: 10, difficulty: 'Facile', elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('Fast')
  })

  it('place les scores sans elapsedTime en dernier à score égal', () => {
    const input = [
      { name: 'NoTime',  score: 10, difficulty: 'Facile' },
      { name: 'HasTime', score: 10, difficulty: 'Facile', elapsedTime: 90 },
    ]
    expect(sortScores(input)[0].name).toBe('HasTime')
  })
})
```

- [ ] **Step 8.2 — Run tests to verify the new tests fail**

```
npm test
```
Expected: 3 new tests fail (sortScores not yet defined in component).

- [ ] **Step 8.3 — Rewrite Scoreboard.jsx**

```jsx
// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import './scoreboard.css'

const DIFFICULTY_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const MEDAL = ['🥇', '🥈', '🥉']

const sortScores = (scores) =>
  [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const tA = a.elapsedTime ?? Infinity
    const tB = b.elapsedTime ?? Infinity
    return tA - tB
  })

export default function Scoreboard() {
  const [allScores, setAllScores] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'scores'))
        const list = sortScores(snap.docs.map(d => d.data()))
        setAllScores(list)
        setScores(list)
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [])

  const changeDifficultyDisplayed = (difficulty) => {
    if (difficulty === 'AllScores') {
      setScores([...allScores])
      return
    }
    setScores(sortScores(allScores.filter(s => s.difficulty === difficulty)))
  }

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <select
        className="scoreboard-select"
        onChange={e => changeDifficultyDisplayed(e.target.value)}
        defaultValue=""
      >
        <option value="" disabled>Filtrer par difficulté</option>
        {DIFFICULTY_ORDER.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
        <option value="AllScores">Tous les scores</option>
      </select>

      {loading ? (
        <p className="scoreboard-loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="scoreboard-empty">Aucun score pour cette difficulté.</p>
      ) : (
        <div className="scoreboard-table">
          <div className="scoreboard-header">
            <span>#</span>
            <span>Joueur</span>
            <span>Score</span>
            <span>Temps</span>
            <span>Difficulté</span>
          </div>
          {scores.map((s, index) => (
            <div
              key={index}
              className={`scoreboard-row ${index < 3 ? 'scoreboard-row--top' : ''}`}
            >
              <span className="scoreboard-rank">
                {index < 3 ? MEDAL[index] : `#${index + 1}`}
              </span>
              <span className="scoreboard-name">{s.name}</span>
              <span className="scoreboard-score">{s.score} pts</span>
              <span className="scoreboard-time">
                {s.elapsedTime != null ? formatTime(s.elapsedTime) : '—'}
              </span>
              <span className="scoreboard-difficulty">{s.difficulty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8.4 — Update scoreboard.css** — change the 2 grid-template-columns lines from 4 to 5 columns and add `.scoreboard-time`

In `src/pages/scoreboard.css`, replace both occurrences of:
```css
grid-template-columns: 48px 1fr 100px 120px;
```
with:
```css
grid-template-columns: 48px 1fr 100px 80px 120px;
```

Then append:
```css
.scoreboard-time {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 8.5 — Run tests to verify all pass**

```
npm test
```
Expected: all tests pass (including the 3 new sortScores tests).

- [ ] **Step 8.6 — Commit**

```bash
git add src/pages/Scoreboard.jsx src/pages/Scoreboard.test.js src/pages/scoreboard.css
git commit -m "feat: scoreboard adds Temps column, sorts by score then time"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Timer counts up from 0 | Task 2 (useGameState timer effect) |
| Game ends when all countries processed | Task 2 (allProcessed + isGameOver) |
| Stats: found / skipped / remaining | Task 2 (stats state + onCountryClick) |
| Progress bar | Task 3 + 4 (HUD JSX + CSS) |
| Difficulty grid with country counts | Task 5 + 6 |
| elapsedTime in form + Firebase | Task 7 |
| Scoreboard time column + sort tiebreaker | Task 8 |
| Training: toast when all done, no form | Task 2 (gameOverToastShownRef + isGameOver excludes training) |
| formatTime utility | Task 1 |

**No placeholders found.** All steps have complete code.

**Type consistency:** `formatTime` exported as named export in Task 1, imported as `{ formatTime }` in Tasks 2, 7, 8. `useGameState` returns `{ timer, stats, isGameOver, displayTimer, ... }` in Task 2, destructured identically in Task 3. `stats` shape `{ found, skipped, total }` consistent across Tasks 2 and 3.

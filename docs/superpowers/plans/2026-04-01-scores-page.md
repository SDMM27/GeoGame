# Scores Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the scoreboard from an inline toggle on HomePage to a dedicated `/scores` page, accessible via a per-game button, with a shared NavBar component.

**Architecture:** Add a `NavBar` shared component used by both `HomePage` and `ScoresPage`. `Scoreboard` gains a `defaultGame` prop, a `filterByGame` pure function, and a game filter select. `ScoresPage` reads `?game=` from the URL and passes it to `Scoreboard`. `HomePage` removes the toggle logic and navigates to `/scores?game=<id>` instead.

**Tech Stack:** React, React Router v6 (`useSearchParams`, `useNavigate`), Vitest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/pages/Scoreboard.jsx` | Add `filterByGame` export, `defaultGame` prop, game filter select, derived scores |
| Modify | `src/pages/Scoreboard.test.js` | Add `filterByGame` tests |
| Modify | `src/pages/scoreboard.css` | Add `.scoreboard-filters` layout |
| Create | `src/components/NavBar.jsx` | Shared logo navbar |
| Create | `src/components/NavBar.css` | Navbar styles (extracted from HomePage) |
| Create | `src/pages/ScoresPage.jsx` | `/scores` page — reads `?game=`, renders NavBar + Scoreboard |
| Modify | `src/App.jsx` | Add `/scores` route |
| Modify | `src/pages/HomePage.jsx` | Use `<NavBar>`, remove toggle + Scoreboard import, Scores button navigates |
| Modify | `src/pages/HomePage.css` | Remove `.home-nav`, `.home-logo`, `.scoreboard-section` dead CSS |

---

### Task 1: Add `filterByGame` to Scoreboard (TDD)

**Files:**
- Modify: `src/pages/Scoreboard.jsx`
- Modify: `src/pages/Scoreboard.test.js`

- [ ] **Step 1: Add failing tests for `filterByGame`**

In `src/pages/Scoreboard.test.js`, update the import line at the top:

```js
import { sortScores, filterByGame } from './Scoreboard'
```

Add at the bottom of the file:

```js
describe('filterByGame', () => {
  it('returns all scores when game is AllGames', () => {
    const scores = [{ gameId: 'country' }, { gameId: 'flags' }]
    expect(filterByGame(scores, 'AllGames')).toHaveLength(2)
  })

  it('treats missing gameId as country', () => {
    const scores = [
      { name: 'A' },
      { name: 'B', gameId: 'country' },
      { name: 'C', gameId: 'flags' },
    ]
    expect(filterByGame(scores, 'country')).toHaveLength(2)
  })

  it('filters by gameId when specified', () => {
    const scores = [{ gameId: 'country' }, { gameId: 'flags' }, { gameId: 'country' }]
    expect(filterByGame(scores, 'flags')).toHaveLength(1)
  })

  it('returns all scores when game is falsy', () => {
    const scores = [{ gameId: 'country' }, { gameId: 'flags' }]
    expect(filterByGame(scores, null)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/pages/Scoreboard.test.js
```

Expected: FAIL — `filterByGame is not a function`

- [ ] **Step 3: Implement `filterByGame` in `src/pages/Scoreboard.jsx`**

Add after the `sortScores` export (line 17):

```js
export const filterByGame = (scores, game) => {
  if (!game || game === 'AllGames') return scores
  return scores.filter(s => (s.gameId ?? 'country') === game)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/pages/Scoreboard.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Scoreboard.jsx src/pages/Scoreboard.test.js
git commit -m "feat: export filterByGame from Scoreboard"
```

---

### Task 2: Refactor Scoreboard to use `defaultGame` + game filter select

**Files:**
- Modify: `src/pages/Scoreboard.jsx`
- Modify: `src/pages/scoreboard.css`

- [ ] **Step 1: Replace `src/pages/Scoreboard.jsx` with the updated version**

```jsx
// src/pages/Scoreboard.jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { formatTime } from '../utils/formatTime'
import './scoreboard.css'

const DIFFICULTY_ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const MEDAL = ['🥇', '🥈', '🥉']
const ACTIVE_GAMES = [
  { id: 'country', label: 'Trouve le Pays' },
]

export const sortScores = (scores) =>
  [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const tA = a.elapsedTime ?? Infinity
    const tB = b.elapsedTime ?? Infinity
    return tA - tB
  })

export const filterByGame = (scores, game) => {
  if (!game || game === 'AllGames') return scores
  return scores.filter(s => (s.gameId ?? 'country') === game)
}

export default function Scoreboard({ defaultGame = 'country' }) {
  const [allScores, setAllScores] = useState([])
  const [selectedGame, setSelectedGame] = useState(defaultGame)
  const [selectedDifficulty, setSelectedDifficulty] = useState('AllScores')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const snap = await getDocs(collection(firestore, 'scores'))
        setAllScores(snap.docs.map(d => d.data()))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [])

  const scores = sortScores(
    filterByGame(allScores, selectedGame).filter(
      s => selectedDifficulty === 'AllScores' || s.difficulty === selectedDifficulty
    )
  )

  return (
    <div className="scoreboard">
      <h1 className="scoreboard-title">Tableau des scores</h1>

      <div className="scoreboard-filters">
        <select
          className="scoreboard-select"
          value={selectedGame}
          onChange={e => setSelectedGame(e.target.value)}
        >
          {ACTIVE_GAMES.map(g => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
          <option value="AllGames">Tous les jeux</option>
        </select>

        <select
          className="scoreboard-select"
          value={selectedDifficulty}
          onChange={e => setSelectedDifficulty(e.target.value)}
        >
          {DIFFICULTY_ORDER.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
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

- [ ] **Step 2: Add `.scoreboard-filters` to `src/pages/scoreboard.css`**

Add after the `.scoreboard-title` block (after line 18):

```css
.scoreboard-filters {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.scoreboard-filters .scoreboard-select {
  margin: 0;
}
```

- [ ] **Step 3: Run tests to confirm no regressions**

```bash
npx vitest run src/pages/Scoreboard.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Scoreboard.jsx src/pages/scoreboard.css
git commit -m "feat: add defaultGame prop and game filter to Scoreboard"
```

---

### Task 3: Create NavBar component

**Files:**
- Create: `src/components/NavBar.css`
- Create: `src/components/NavBar.jsx`

- [ ] **Step 1: Create `src/components/NavBar.css`**

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  border-bottom: 1px solid var(--border-color);
}

.navbar-logo {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 4px;
  color: var(--accent-cyan);
  cursor: pointer;
  user-select: none;
}

.navbar-logo-accent {
  color: var(--accent-purple);
}

@media (max-width: 600px) {
  .navbar {
    padding: 16px 20px;
  }
}
```

- [ ] **Step 2: Create `src/components/NavBar.jsx`**

```jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import './NavBar.css'

export default function NavBar() {
  const navigate = useNavigate()
  return (
    <nav className="navbar">
      <span className="navbar-logo" onClick={() => navigate('/')}>
        GEO<span className="navbar-logo-accent">GAME</span>
      </span>
    </nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NavBar.jsx src/components/NavBar.css
git commit -m "feat: add shared NavBar component"
```

---

### Task 4: Add `/scores` route and create ScoresPage

**Files:**
- Create: `src/pages/ScoresPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/pages/ScoresPage.jsx`**

```jsx
import React from 'react'
import { useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Scoreboard from './Scoreboard'

export default function ScoresPage() {
  const [searchParams] = useSearchParams()
  const game = searchParams.get('game') ?? 'country'
  return (
    <div className="scores-page">
      <NavBar />
      <Scoreboard defaultGame={game} />
    </div>
  )
}
```

- [ ] **Step 2: Update `src/App.jsx`**

```jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import ScoresPage from "./pages/ScoresPage";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/scores" element={<ScoresPage />} />
      </Routes>
    </Router>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ScoresPage.jsx src/App.jsx
git commit -m "feat: add /scores route and ScoresPage"
```

---

### Task 5: Update HomePage

**Files:**
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/HomePage.css`

- [ ] **Step 1: Replace `src/pages/HomePage.jsx`**

```jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import "./HomePage.css";

const DIFFICULTIES = [
  { name: 'Facile', count: 29, color: '#4ade80' },
  { name: 'Moyen', count: 83, color: '#00d4ff' },
  { name: 'Difficile', count: 191, color: '#fbbf24' },
  { name: 'Impossible', count: 244, color: '#f97316' },
  { name: 'Hardcore', count: 53, color: '#f87171' },
];

const GAMES = [
  {
    id: "country",
    icon: "🌍",
    title: "Trouve le Pays",
    description: "Trouve tous les pays de la difficulté choisie.",
    active: true,
  },
  {
    id: "flags",
    icon: "🚩",
    title: "Trouve le Drapeau",
    description: "Identifie le pays à partir de son drapeau",
    active: false,
  },
  {
    id: "placement",
    icon: "📍",
    title: "Placement Pays",
    description: "Place le pays au bon endroit sur la carte",
    active: false,
  },
  {
    id: "lives",
    icon: "⚡",
    title: "Mode Vies",
    description: "Trouve un maximum de pays sans te tromper",
    active: false,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("Moyen");

  const handlePlay = (isTraining = false) => {
    navigate("/game", { state: { difficulty, isTraining } });
  };

  return (
    <div className="home-page">
      <NavBar />

      <main className="home-main">
        <div className="home-hero">
          <h1 className="home-title">Choisissez votre jeu</h1>
          <p className="home-subtitle">Explore • Découvre • Compète</p>
        </div>

        <div className="games-grid">
          {GAMES.map((game) =>
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
                  <button
                    className="nav-scores-btn"
                    onClick={() => navigate(`/scores?game=${game.id}`)}
                  >
                    🏆 Scores
                  </button>
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
                <div className="game-card-icon game-card-icon--dim">
                  {game.icon}
                </div>
                <h2 className="game-card-title game-card-title--dim">
                  {game.title}
                </h2>
                <p className="game-card-desc game-card-desc--dim">
                  {game.description}
                </p>
                <span className="badge-soon">BIENTÔT</span>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Remove dead CSS from `src/pages/HomePage.css`**

Delete the `/* ── Navbar ── */` block (lines 8–27):

```css
/* ── Navbar ── */
.home-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  border-bottom: 1px solid var(--border-color);
}

.home-logo {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 4px;
  color: var(--accent-cyan);
}

.home-logo-accent {
  color: var(--accent-purple);
}
```

Delete the `/* ── Scoreboard Section ── */` block (lines 231–237):

```css
/* ── Scoreboard Section ── */
.scoreboard-section {
  width: 100%;
  max-width: 800px;
  margin-top: 40px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 32px;
}
```

Delete only the `.home-nav` rule inside the `@media (max-width: 600px)` block:

```css
  .home-nav {
    padding: 16px 20px;
  }
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.jsx src/pages/HomePage.css
git commit -m "feat: use NavBar in HomePage, replace score toggle with /scores navigation"
```

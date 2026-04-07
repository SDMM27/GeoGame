# Daily Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Start button (with timer), a pseudo form, and a historical leaderboard with accordion to the daily modes of BorderGuess and CountryClue.

**Architecture:** Pure sort/compare logic extracted to `src/utils/dailyScores.js` (testable). Timer state lives in each hook (`useBorderGuessState`, `useCountryClueState`). Two new shared components (`DailyForm`, `DailyLeaderboard`) rendered inline in the result section of each game page, visible only after a win in daily mode.

**Tech Stack:** React 18, Vitest, Firebase Firestore v9, react-toastify, CSS custom properties (var(--...))

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/utils/dailyScores.js` | Pure sort + compare functions |
| Create | `src/utils/dailyScores.test.js` | Unit tests for those functions |
| Modify | `src/hooks/useBorderGuessState.js` | Add `hasStarted`, `startedAt`, `elapsedTime`, `startGame` |
| Modify | `src/hooks/useCountryClueState.js` | Same additions |
| Create | `src/pages/DailyForm.jsx` | Pseudo form for daily games |
| Create | `src/pages/DailyLeaderboard.jsx` | Inline leaderboard with accordion |
| Create | `src/pages/DailyLeaderboard.css` | Styles for DailyForm and DailyLeaderboard |
| Modify | `src/pages/BorderGuessPage.jsx` | Start button, hide map, integrate DailyForm + DailyLeaderboard |
| Modify | `src/pages/CountryCluePage.jsx` | Start button, disable input, integrate DailyForm + DailyLeaderboard |

---

## Task 1: Daily score utility + tests

**Files:**
- Create: `src/utils/dailyScores.js`
- Create: `src/utils/dailyScores.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/dailyScores.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { sortDailyScores, isBetterDailyScore } from './dailyScores'

describe('sortDailyScores', () => {
  it('trie par attempts croissant', () => {
    const scores = [
      { name: 'B', attempts: 5, elapsedTime: 1000 },
      { name: 'A', attempts: 3, elapsedTime: 2000 },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('à égalité d\'attempts, trie par elapsedTime croissant', () => {
    const scores = [
      { name: 'B', attempts: 3, elapsedTime: 5000 },
      { name: 'A', attempts: 3, elapsedTime: 2000 },
    ]
    expect(sortDailyScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('ne mute pas le tableau original', () => {
    const scores = [
      { name: 'B', attempts: 5, elapsedTime: 1000 },
      { name: 'A', attempts: 3, elapsedTime: 2000 },
    ]
    const original = [...scores]
    sortDailyScores(scores)
    expect(scores).toEqual(original)
  })
})

describe('isBetterDailyScore', () => {
  it('moins d\'attempts = meilleur', () => {
    expect(isBetterDailyScore({ attempts: 2, elapsedTime: 9999 }, { attempts: 3, elapsedTime: 100 })).toBe(true)
  })

  it('plus d\'attempts = pas meilleur', () => {
    expect(isBetterDailyScore({ attempts: 4, elapsedTime: 100 }, { attempts: 3, elapsedTime: 9999 })).toBe(false)
  })

  it('même attempts, moins de temps = meilleur', () => {
    expect(isBetterDailyScore({ attempts: 3, elapsedTime: 1000 }, { attempts: 3, elapsedTime: 2000 })).toBe(true)
  })

  it('même attempts, plus de temps = pas meilleur', () => {
    expect(isBetterDailyScore({ attempts: 3, elapsedTime: 3000 }, { attempts: 3, elapsedTime: 2000 })).toBe(false)
  })

  it('même attempts, même temps = pas meilleur', () => {
    expect(isBetterDailyScore({ attempts: 3, elapsedTime: 2000 }, { attempts: 3, elapsedTime: 2000 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/NasaCode/GeoGame && npm test -- dailyScores
```

Expected: FAIL — `Cannot find module './dailyScores'`

- [ ] **Step 3: Implement `src/utils/dailyScores.js`**

```js
export function sortDailyScores(scores) {
  return [...scores].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })
}

export function isBetterDailyScore(newScore, existing) {
  if (newScore.attempts < existing.attempts) return true
  if (newScore.attempts === existing.attempts && newScore.elapsedTime < existing.elapsedTime) return true
  return false
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:/NasaCode/GeoGame && npm test -- dailyScores
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/utils/dailyScores.js src/utils/dailyScores.test.js && git commit -m "feat: add daily score sort and compare utilities"
```

---

## Task 2: Timer + Start logic in `useBorderGuessState`

**Files:**
- Modify: `src/hooks/useBorderGuessState.js`

- [ ] **Step 1: Add state and refs at the top of the hook**

In `useBorderGuessState`, after the existing `useState` declarations (around line 224), add:

```js
const [hasStarted, setHasStarted] = useState(false)
const [startedAt, setStartedAt] = useState(null)
const [elapsedTime, setElapsedTime] = useState(null)
```

- [ ] **Step 2: Restore timer state from localStorage on daily load**

In the `useEffect` for mode (lines 236–257), inside the `if (mode === 'daily')` block, after the existing `setStatus`/`setInputValue` calls, add:

```js
const alreadyPlaying =
  savedProgress?.startedAt != null ||
  (savedProgress?.status != null && savedProgress.status !== 'playing') ||
  (Array.isArray(savedProgress?.guesses) && savedProgress.guesses.length > 0)
setHasStarted(alreadyPlaying)
setStartedAt(savedProgress?.startedAt ?? null)
setElapsedTime(savedProgress?.elapsedTime ?? null)
```

In the `else` (infinite) branch, add after the existing `setInputValue('')`:

```js
setHasStarted(false)
setStartedAt(null)
setElapsedTime(null)
```

- [ ] **Step 3: Persist timer in daily localStorage**

In the `useEffect` that calls `writeDailyProgress` (lines 259–267), update the call to:

```js
writeDailyProgress(dailyKey, {
  targetName: currentCountry.properties.ADMIN,
  guesses,
  status,
  startedAt,
  elapsedTime,
})
```

And add `startedAt` and `elapsedTime` to the dependency array:

```js
}, [currentCountry, dailyKey, guesses, mode, status, startedAt, elapsedTime])
```

- [ ] **Step 4: Add `startGame` function**

After the `filteredCountrySuggestions` memo (around line 290), add:

```js
const startGame = () => {
  if (hasStarted) return
  const now = Date.now()
  setStartedAt(now)
  setHasStarted(true)
}
```

- [ ] **Step 5: Capture elapsedTime on victory**

In `handleSubmit`, inside the `if (isCorrect)` block (around line 331), before `setStatus('won')`, add:

```js
const finalElapsed = startedAt != null ? Date.now() - startedAt : null
setElapsedTime(finalElapsed)
```

- [ ] **Step 6: Add new values to the hook's return object**

In the `return` statement at the bottom of the hook, add:

```js
hasStarted,
startGame,
elapsedTime,
```

- [ ] **Step 7: Run existing tests to verify nothing is broken**

```bash
cd D:/NasaCode/GeoGame && npm test
```

Expected: all existing tests PASS

- [ ] **Step 8: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/hooks/useBorderGuessState.js && git commit -m "feat: add timer and start logic to useBorderGuessState"
```

---

## Task 3: Timer + Start logic in `useCountryClueState`

**Files:**
- Modify: `src/hooks/useCountryClueState.js`

- [ ] **Step 1: Add state at the top of the hook**

In `useCountryClueState`, after the existing `useState` declarations (around line 349), add:

```js
const [hasStarted, setHasStarted] = useState(false)
const [startedAt, setStartedAt] = useState(null)
const [elapsedTime, setElapsedTime] = useState(null)
```

- [ ] **Step 2: Restore timer state from localStorage on daily load**

In the `useEffect` for mode (lines 354–386), inside the `if (mode === 'daily')` block, after `setInputValue('')`, add:

```js
const alreadyPlaying =
  savedProgress?.startedAt != null ||
  (savedProgress?.status != null && savedProgress.status !== 'playing') ||
  (Array.isArray(savedProgress?.guesses) && savedProgress.guesses.length > 0)
setHasStarted(alreadyPlaying)
setStartedAt(savedProgress?.startedAt ?? null)
setElapsedTime(savedProgress?.elapsedTime ?? null)
```

In the infinite branch, after `setInputValue('')`:

```js
setHasStarted(false)
setStartedAt(null)
setElapsedTime(null)
```

- [ ] **Step 3: Persist timer in daily localStorage**

In the `useEffect` that calls `writeDailyProgress` (lines 388–396), update to:

```js
writeDailyProgress(dailyKey, {
  targetName: currentCountry.properties.ADMIN,
  guesses,
  status,
  startedAt,
  elapsedTime,
})
```

Dependency array:

```js
}, [currentCountry, dailyKey, guesses, mode, status, startedAt, elapsedTime])
```

- [ ] **Step 4: Add `startGame` function**

After `filteredCountrySuggestions` memo (around line 416), add:

```js
const startGame = () => {
  if (hasStarted) return
  const now = Date.now()
  setStartedAt(now)
  setHasStarted(true)
}
```

- [ ] **Step 5: Capture elapsedTime on victory**

In `handleSubmit`, inside the `if (isCorrect)` block (around line 459), before `setStatus('won')`, add:

```js
const finalElapsed = startedAt != null ? Date.now() - startedAt : null
setElapsedTime(finalElapsed)
```

- [ ] **Step 6: Add new values to the return object**

```js
hasStarted,
startGame,
elapsedTime,
```

- [ ] **Step 7: Run tests**

```bash
cd D:/NasaCode/GeoGame && npm test
```

Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/hooks/useCountryClueState.js && git commit -m "feat: add timer and start logic to useCountryClueState"
```

---

## Task 4: `DailyForm` component

**Files:**
- Create: `src/pages/DailyForm.jsx`
- Create: `src/pages/DailyLeaderboard.css` (initial — also used by DailyLeaderboard)

- [ ] **Step 1: Create `src/pages/DailyForm.jsx`**

```jsx
import React, { useRef, useState } from 'react'
import { addDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { toast } from 'react-toastify'
import { firestore } from '../Firebase'
import { isBetterDailyScore } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

export default function DailyForm({ attempts, elapsedTime, guesses, gameType, dailyKey }) {
  const nameRef = useRef()
  const [saved, setSaved] = useState(false)
  const [blockedByBetter, setBlockedByBetter] = useState(null)
  const ref = collection(firestore, 'daily_scores')

  const handleSave = async (e) => {
    e.preventDefault()
    const name = nameRef.current.value.trim()
    if (!name) {
      toast.error('Veuillez rentrer un pseudo', { containerId: 'topRightToast' })
      return
    }

    const newScore = { name, gameType, dailyKey, attempts, elapsedTime, guesses }

    const existingSnapshot = await getDocs(
      query(ref, where('name', '==', name), where('gameType', '==', gameType), where('dailyKey', '==', dailyKey))
    )

    if (!existingSnapshot.empty) {
      const existing = existingSnapshot.docs[0].data()
      if (!isBetterDailyScore(newScore, existing)) {
        setBlockedByBetter({ attempts: existing.attempts, elapsedTime: existing.elapsedTime })
        return
      }
      await deleteDoc(existingSnapshot.docs[0].ref)
    }

    try {
      await addDoc(ref, newScore)
      const wasReplaced = !existingSnapshot.empty
      toast.success(wasReplaced ? 'Score mis à jour !' : `Score de ${name} sauvegardé !`, { containerId: 'topRightToast' })
      setSaved(true)
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde', { containerId: 'topRightToast' })
      console.error(err)
    }
  }

  return (
    <div className="daily-form">
      <h2 className="daily-form__title">Partie terminée !</h2>
      <p className="daily-form__stat">{attempts} essai{attempts > 1 ? 's' : ''} — {elapsedTime != null ? formatTime(elapsedTime) : '—'}</p>

      {blockedByBetter && (
        <div className="daily-form__blocked">
          <p>Ce pseudo a déjà un meilleur score pour ce puzzle : <strong>{blockedByBetter.attempts} essais — {formatTime(blockedByBetter.elapsedTime)}</strong>.</p>
          <p className="daily-form__blocked-hint">Enregistrez sous un autre nom.</p>
        </div>
      )}

      <form onSubmit={handleSave}>
        <label htmlFor="daily-pseudo" className="daily-form__label">Pseudo</label>
        <input
          id="daily-pseudo"
          ref={nameRef}
          className="daily-form__input"
          type="text"
          placeholder="Ton pseudo..."
          maxLength={20}
          disabled={saved}
        />
        <button type="submit" className="daily-form__submit" disabled={saved}>
          {saved ? 'Score sauvegardé ✓' : 'Sauvegarder le score'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create initial `src/pages/DailyLeaderboard.css`**

```css
/* ── DailyForm ── */
.daily-form {
  margin-top: 24px;
  padding: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.daily-form__title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.daily-form__stat {
  margin: 0 0 16px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.daily-form__blocked {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-md, 8px);
  font-size: 0.85rem;
  color: var(--text-primary);
}

.daily-form__blocked-hint {
  margin: 4px 0 0;
  color: var(--text-muted);
}

.daily-form__label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.daily-form__input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  background: var(--bg-secondary, #0d1b2a);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 8px);
  color: var(--text-primary);
  font-size: 0.95rem;
  margin-bottom: 12px;
}

.daily-form__submit {
  width: 100%;
  padding: 10px;
  background: var(--accent-cyan, #00d4ff);
  color: #000;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
}

.daily-form__submit:disabled {
  opacity: 0.55;
  cursor: default;
}

/* ── DailyLeaderboard ── */
.daily-lb {
  margin-top: 20px;
  padding: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

.daily-lb__title {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.daily-lb__header {
  display: grid;
  grid-template-columns: 40px 1fr 80px 90px;
  padding: 6px 12px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.daily-lb__row {
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  margin-bottom: 4px;
}

.daily-lb__row-main {
  display: grid;
  grid-template-columns: 40px 1fr 80px 90px;
  padding: 10px 12px;
  background: var(--bg-secondary, #0d1b2a);
  cursor: pointer;
  user-select: none;
  align-items: center;
  transition: background 0.15s;
}

.daily-lb__row-main:hover {
  background: rgba(255,255,255,0.04);
}

.daily-lb__row--top .daily-lb__row-main {
  background: rgba(0, 212, 255, 0.07);
  border: 1px solid rgba(0, 212, 255, 0.15);
}

.daily-lb__rank {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-muted);
}

.daily-lb__name {
  font-weight: 700;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.daily-lb__attempts,
.daily-lb__time {
  font-size: 0.9rem;
  color: var(--text-primary);
  text-align: right;
}

.daily-lb__accordion {
  padding: 10px 12px 12px 52px;
  background: rgba(0,0,0,0.2);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.daily-lb__accordion-title {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.daily-lb__guess-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.daily-lb__guess-item {
  color: var(--text-muted);
}

.daily-lb__guess-item--correct {
  color: #4ade80;
  font-weight: 700;
}

.daily-lb__loading,
.daily-lb__empty {
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  padding: 12px 0;
}

/* ── Start button ── */
.daily-start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 16px;
  margin-top: 8px;
  background: var(--accent-cyan, #00d4ff);
  color: #000;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: opacity 0.2s;
}

.daily-start-btn:hover {
  opacity: 0.88;
}

.daily-map-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 280px;
  background: rgba(0,0,0,0.25);
  border-radius: var(--radius-lg);
  color: var(--text-muted);
  font-size: 0.95rem;
}
```

- [ ] **Step 3: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/pages/DailyForm.jsx src/pages/DailyLeaderboard.css && git commit -m "feat: add DailyForm component and shared daily CSS"
```

---

## Task 5: `DailyLeaderboard` component

**Files:**
- Create: `src/pages/DailyLeaderboard.jsx`

- [ ] **Step 1: Create `src/pages/DailyLeaderboard.jsx`**

```jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { sortDailyScores } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function AccordionRow({ score, index }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}`}>
      <div className="daily-lb__row-main" onClick={() => setOpen((prev) => !prev)}>
        <span className="daily-lb__rank">{index < 3 ? MEDAL[index] : `#${index + 1}`}</span>
        <span className="daily-lb__name">{score.name}</span>
        <span className="daily-lb__attempts">{score.attempts} essai{score.attempts > 1 ? 's' : ''}</span>
        <span className="daily-lb__time">{score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}</span>
      </div>
      {open && Array.isArray(score.guesses) && score.guesses.length > 0 && (
        <div className="daily-lb__accordion">
          <p className="daily-lb__accordion-title">Pays tentés</p>
          <ol className="daily-lb__guess-list">
            {score.guesses.map((country, i) => (
              <li
                key={`${country}-${i}`}
                className={`daily-lb__guess-item${i === score.guesses.length - 1 ? ' daily-lb__guess-item--correct' : ''}`}
              >
                {i + 1}. {country}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function DailyLeaderboard({ gameType }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(
          query(collection(firestore, 'daily_scores'), where('gameType', '==', gameType))
        )
        setScores(sortDailyScores(snapshot.docs.map((doc) => doc.data())))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [gameType])

  return (
    <div className="daily-lb">
      <h2 className="daily-lb__title">Classement journalier</h2>

      {loading ? (
        <p className="daily-lb__loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="daily-lb__empty">Aucun score pour l'instant.</p>
      ) : (
        <>
          <div className="daily-lb__header">
            <span>#</span>
            <span>Joueur</span>
            <span>Essais</span>
            <span>Temps</span>
          </div>
          {scores.map((score, index) => (
            <AccordionRow key={`${score.name}-${score.dailyKey}-${index}`} score={score} index={index} />
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/pages/DailyLeaderboard.jsx && git commit -m "feat: add DailyLeaderboard component with accordion"
```

---

## Task 6: Integrate into `BorderGuessPage`

**Files:**
- Modify: `src/pages/BorderGuessPage.jsx`

- [ ] **Step 1: Add imports at the top**

After the existing imports in `BorderGuessPage.jsx`, add:

```js
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
```

- [ ] **Step 2: Destructure new hook values**

In the `useBorderGuessState(mode)` destructuring (around line 63), add `hasStarted`, `startGame`, `elapsedTime`:

```js
const {
  currentCountry,
  inputValue,
  setInputValue,
  guesses,
  isSolved,
  isLost,
  isComplete,
  answerName,
  filteredCountrySuggestions,
  dailyKey,
  handleSubmit,
  startNextInfiniteRound,
  revealCountry,
  goHome,
  hasStarted,
  startGame,
  elapsedTime,
} = useBorderGuessState(mode)
```

- [ ] **Step 3: Replace the map block with a conditional**

The current map block (inside `border-guess-panel--map`) renders `<MapContainer>` directly. Replace the entire `<div className="border-guess-map-frame">` content with:

```jsx
<div className="border-guess-map-frame">
  {!hasStarted ? (
    <div className="daily-map-placeholder">
      Lance le chrono pour révéler les frontières.
    </div>
  ) : currentCountry ? (
    <MapContainer
      key={currentCountry.properties.ADMIN}
      className="border-guess-map"
      center={[20, 0]}
      zoom={2}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      boxZoom={false}
      keyboard={false}
      touchZoom={false}
    >
      <GeoJSON data={displayCountry} style={() => getCountryStyle(currentCountry)} />
      <FitCountryBounds country={currentCountry} />
    </MapContainer>
  ) : null}
</div>
```

- [ ] **Step 4: Add Start button above the input**

In `border-guess-panel--side`, replace the `<div className="border-guess-input-wrap">` block with:

```jsx
<div className="border-guess-input-wrap">
  {!hasStarted && !isComplete && (
    <button className="daily-start-btn" onClick={startGame}>
      Démarrer le chrono
    </button>
  )}
  <label htmlFor="border-guess-input" className="border-guess-label">
    Ton pays
  </label>
  <div className="border-guess-input-overlay">
    <input
      id="border-guess-input"
      className="border-guess-input"
      type="text"
      placeholder="Ex : Japon, Brésil, Maroc..."
      value={inputValue}
      onChange={(event) => setInputValue(event.target.value)}
      onKeyDown={onKeyDown}
      disabled={isComplete || !hasStarted}
    />
    {shouldShowSuggestions && (
      <div className="border-guess-suggestions">
        {filteredCountrySuggestions.map((countryName) => (
          <button
            key={countryName}
            type="button"
            className="border-guess-suggestion"
            onClick={() => setInputValue(countryName)}
          >
            {countryName}
          </button>
        ))}
      </div>
    )}
  </div>
  <button
    className="border-guess-submit"
    onClick={handleSubmit}
    disabled={!inputValue.trim() || isComplete || !hasStarted}
  >
    Valider
  </button>
</div>
```

- [ ] **Step 5: Add DailyForm and DailyLeaderboard after the result section**

In the `border-guess-panel--side`, after the `<div className="border-guess-result ...">` block and before `<div className="border-guess-actions">`, add:

```jsx
{isSolved && mode === 'daily' && (
  <>
    <DailyForm
      attempts={guesses.length}
      elapsedTime={elapsedTime}
      guesses={guesses.map((g) => g.value)}
      gameType={GAME_TYPES.BORDER_GUESS}
      dailyKey={dailyKey}
    />
    <DailyLeaderboard gameType={GAME_TYPES.BORDER_GUESS} />
  </>
)}
```

- [ ] **Step 6: Run the app and manually verify**

```bash
cd D:/NasaCode/GeoGame && npm run dev
```

Verify in browser:
- Page loads with map placeholder and Start button
- Clicking Start reveals the map and enables input
- After a correct guess: DailyForm and DailyLeaderboard appear
- Entering pseudo and saving shows success toast, button disabled

- [ ] **Step 7: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/pages/BorderGuessPage.jsx && git commit -m "feat: integrate start button, DailyForm and DailyLeaderboard into BorderGuessPage"
```

---

## Task 7: Integrate into `CountryCluePage`

**Files:**
- Modify: `src/pages/CountryCluePage.jsx`

- [ ] **Step 1: Add imports at the top**

```js
import DailyForm from './DailyForm'
import DailyLeaderboard from './DailyLeaderboard'
import { GAME_TYPES } from '../utils/gameTypes'
```

- [ ] **Step 2: Destructure new hook values**

Add to the `useCountryClueState(mode)` destructuring:

```js
const {
  inputValue,
  setInputValue,
  guesses,
  isSolved,
  isLost,
  isComplete,
  answerName,
  answerFlag,
  answerCapital,
  filteredCountrySuggestions,
  dailyKey,
  handleSubmit,
  startNextInfiniteRound,
  revealCountry,
  goHome,
  hasStarted,
  startGame,
  elapsedTime,
} = useCountryClueState(mode)
```

- [ ] **Step 3: Add Start button above the input block**

In `country-clue-input-block`, before the `<label>`, add:

```jsx
{!hasStarted && !isComplete && (
  <button className="daily-start-btn" onClick={startGame}>
    Démarrer le chrono
  </button>
)}
```

- [ ] **Step 4: Disable input until started**

In the `<input>` tag, change `disabled={isComplete}` to:

```jsx
disabled={isComplete || !hasStarted}
```

In the `<button className="country-clue-submit">`, change `disabled={!inputValue.trim() || isComplete}` to:

```jsx
disabled={!inputValue.trim() || isComplete || !hasStarted}
```

- [ ] **Step 5: Add DailyForm and DailyLeaderboard in the aside**

In `country-clue-panel--side`, after the `<div className="country-clue-result ...">` block and before `<div className="country-clue-actions">`, add:

```jsx
{isSolved && mode === 'daily' && (
  <>
    <DailyForm
      attempts={guesses.length}
      elapsedTime={elapsedTime}
      guesses={guesses.map((g) => g.value)}
      gameType={GAME_TYPES.COUNTRY_CLUE}
      dailyKey={dailyKey}
    />
    <DailyLeaderboard gameType={GAME_TYPES.COUNTRY_CLUE} />
  </>
)}
```

- [ ] **Step 6: Run tests and manual verification**

```bash
cd D:/NasaCode/GeoGame && npm test
```

Expected: all tests PASS

Verify in browser:
- CountryClue loads with input disabled and Start button
- Clicking Start enables input
- After a correct guess: DailyForm and DailyLeaderboard appear in the aside

- [ ] **Step 7: Commit**

```bash
cd D:/NasaCode/GeoGame && git add src/pages/CountryCluePage.jsx && git commit -m "feat: integrate start button, DailyForm and DailyLeaderboard into CountryCluePage"
```

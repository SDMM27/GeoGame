# Daily Leaderboard Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix daily leaderboard queries to filter by date, show leaderboard after loss (not just win), and add 7-day quick-access buttons + full history date picker.

**Architecture:** Three files modified — `DailyLeaderboard.jsx` receives a `dailyKey` prop, manages `selectedDate` state, and adds `where('dailyKey', '==', selectedDate)` to the Firestore query. Both page components widen their display condition from `isSolved` to `isComplete`, pass `dailyKey` to `DailyLeaderboard`, and keep `DailyForm` conditioned to win only.

**Tech Stack:** React, Firebase Firestore, CSS custom properties (existing design system)

---

## File Map

| File | Change |
|------|--------|
| `src/pages/DailyLeaderboard.jsx` | Rewrite: add `dailyKey` prop, `selectedDate` state, fix Firestore query, add date-nav UI |
| `src/pages/DailyLeaderboard.css` | Append: CSS for `.daily-lb__date-nav`, `.daily-lb__day-btn`, `.daily-lb__history-toggle`, `.daily-lb__history-link`, `.daily-lb__date-picker` |
| `src/pages/CountryCluePage.jsx` | Change condition `isSolved` → `isComplete`, pass `dailyKey` prop to `DailyLeaderboard`, wrap `DailyForm` in `isSolved` guard |
| `src/pages/BorderGuessPage.jsx` | Same pattern as `CountryCluePage.jsx` |

---

## Task 1: Rewrite DailyLeaderboard.jsx

**Files:**
- Modify: `src/pages/DailyLeaderboard.jsx` (full rewrite, 83 lines → ~100 lines)

- [ ] **Step 1: Replace the entire file content**

Replace `src/pages/DailyLeaderboard.jsx` with:

```jsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { sortDailyScores } from '../utils/dailyScores'
import { formatTime } from '../utils/formatTime'
import './DailyLeaderboard.css'

const MEDAL = ['🥇', '🥈', '🥉']

function getLast7Days(todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number)
  const baseDate = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const label =
      i === 0 ? "Aujourd'hui" :
      i === 1 ? 'Hier' :
      date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return { key, label }
  })
}

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

export default function DailyLeaderboard({ gameType, dailyKey }) {
  const [selectedDate, setSelectedDate] = useState(dailyKey)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = getLast7Days(dailyKey)

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'daily_scores'),
            where('gameType', '==', gameType),
            where('dailyKey', '==', selectedDate)
          )
        )
        setScores(sortDailyScores(snapshot.docs.map((doc) => doc.data())))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [gameType, selectedDate])

  return (
    <div className="daily-lb">
      <h2 className="daily-lb__title">Classement journalier</h2>

      <div className="daily-lb__date-nav">
        {days.map(({ key, label }) => (
          <button
            key={key}
            className={`daily-lb__day-btn${selectedDate === key ? ' daily-lb__day-btn--active' : ''}`}
            onClick={() => { setSelectedDate(key); setShowPicker(false) }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="daily-lb__history-toggle">
        <button
          className="daily-lb__history-link"
          onClick={() => setShowPicker((prev) => !prev)}
        >
          {showPicker ? "Masquer l'historique" : "Voir tout l'historique"}
        </button>
        {showPicker && (
          <input
            type="date"
            className="daily-lb__date-picker"
            value={selectedDate}
            max={dailyKey}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <p className="daily-lb__loading">Chargement...</p>
      ) : scores.length === 0 ? (
        <p className="daily-lb__empty">Aucun score pour ce jour.</p>
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
git add src/pages/DailyLeaderboard.jsx
git commit -m "feat: fix leaderboard query by dailyKey + add date navigation"
```

---

## Task 2: Add CSS for date navigation

**Files:**
- Modify: `src/pages/DailyLeaderboard.css` (append at end of file)

- [ ] **Step 1: Append new CSS classes at the end of the file**

Add after the last rule in `src/pages/DailyLeaderboard.css` (after line 222):

```css
/* ── Date navigation ── */
.daily-lb__date-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.daily-lb__day-btn {
  padding: 5px 12px;
  background: var(--bg-secondary, #0d1b2a);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 8px);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.daily-lb__day-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.daily-lb__day-btn--active {
  background: rgba(0, 212, 255, 0.12);
  border-color: rgba(0, 212, 255, 0.4);
  color: var(--accent-cyan, #00d4ff);
}

.daily-lb__history-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.daily-lb__history-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s;
}

.daily-lb__history-link:hover {
  color: var(--text-primary);
}

.daily-lb__date-picker {
  padding: 5px 10px;
  background: var(--bg-secondary, #0d1b2a);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 8px);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DailyLeaderboard.css
git commit -m "style: add date navigation styles to DailyLeaderboard"
```

---

## Task 3: Update CountryCluePage.jsx

**Files:**
- Modify: `src/pages/CountryCluePage.jsx` lines 195–206

The current block at lines 195–206 is:

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

- [ ] **Step 1: Replace that block**

```jsx
            {isComplete && mode === 'daily' && (
              <>
                {isSolved && (
                  <DailyForm
                    attempts={guesses.length}
                    elapsedTime={elapsedTime}
                    guesses={guesses.map((g) => g.value)}
                    gameType={GAME_TYPES.COUNTRY_CLUE}
                    dailyKey={dailyKey}
                  />
                )}
                <DailyLeaderboard gameType={GAME_TYPES.COUNTRY_CLUE} dailyKey={dailyKey} />
              </>
            )}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/CountryCluePage.jsx
git commit -m "feat: show leaderboard after loss in CountryCluePage"
```

---

## Task 4: Update BorderGuessPage.jsx

**Files:**
- Modify: `src/pages/BorderGuessPage.jsx` lines 212–222

The current block at lines 212–222 is:

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

- [ ] **Step 1: Replace that block**

```jsx
            {isComplete && mode === 'daily' && (
              <>
                {isSolved && (
                  <DailyForm
                    attempts={guesses.length}
                    elapsedTime={elapsedTime}
                    guesses={guesses.map((g) => g.value)}
                    gameType={GAME_TYPES.BORDER_GUESS}
                    dailyKey={dailyKey}
                  />
                )}
                <DailyLeaderboard gameType={GAME_TYPES.BORDER_GUESS} dailyKey={dailyKey} />
              </>
            )}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BorderGuessPage.jsx
git commit -m "feat: show leaderboard after loss in BorderGuessPage"
```

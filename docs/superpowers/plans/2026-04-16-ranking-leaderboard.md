# Ranking Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer `DailyLeaderboard` par `RankingLeaderboard` dans le jeu classement, avec colonnes # / Joueur / Score / Erreur triées par score décroissant.

**Architecture:** Nouveau composant `RankingLeaderboard` dédié avec sa propre logique de tri (`sortRankingScores` dans `src/utils/rankingScores.js`). `DailyLeaderboard` et `dailyScores.js` restent inchangés. `RankingGamePage` remplace son import.

**Tech Stack:** React, Firestore (`firebase/firestore`), Vitest

---

## File Map

| Fichier | Action |
|---------|--------|
| `src/utils/rankingScores.js` | Créer — fonction `sortRankingScores` |
| `src/utils/rankingScores.test.js` | Créer — tests unitaires |
| `src/pages/RankingLeaderboard.jsx` | Créer — composant leaderboard |
| `src/pages/RankingLeaderboard.css` | Créer — styles grille colonnes |
| `src/pages/RankingGamePage.jsx` | Modifier — remplacer `DailyLeaderboard` |

---

### Task 1 : Fonction `sortRankingScores` + tests

**Files:**
- Create: `src/utils/rankingScores.js`
- Create: `src/utils/rankingScores.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/utils/rankingScores.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { sortRankingScores } from './rankingScores'

describe('sortRankingScores', () => {
  it('trie par score décroissant', () => {
    const scores = [
      { name: 'B', score: 50, totalError: 1 },
      { name: 'A', score: 85, totalError: 3 },
    ]
    expect(sortRankingScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('à égalité de score, trie par totalError croissant', () => {
    const scores = [
      { name: 'B', score: 85, totalError: 5 },
      { name: 'A', score: 85, totalError: 2 },
    ]
    expect(sortRankingScores(scores).map(s => s.name)).toEqual(['A', 'B'])
  })

  it('ne mute pas le tableau original', () => {
    const scores = [
      { name: 'B', score: 50, totalError: 1 },
      { name: 'A', score: 85, totalError: 3 },
    ]
    const original = [...scores]
    sortRankingScores(scores)
    expect(scores).toEqual(original)
  })
})
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd D:/NasaCode/GeoGame && npm test -- rankingScores
```

Attendu : FAIL avec "Cannot find module './rankingScores'"

- [ ] **Step 3 : Implémenter `sortRankingScores`**

Créer `src/utils/rankingScores.js` :

```js
export function sortRankingScores(scores) {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.totalError ?? Infinity) - (b.totalError ?? Infinity)
  })
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd D:/NasaCode/GeoGame && npm test -- rankingScores
```

Attendu : 3 tests PASS

- [ ] **Step 5 : Commit**

```bash
cd D:/NasaCode/GeoGame
git add src/utils/rankingScores.js src/utils/rankingScores.test.js
git commit -m "feat: add sortRankingScores utility"
```

---

### Task 2 : Composant `RankingLeaderboard`

**Files:**
- Create: `src/pages/RankingLeaderboard.jsx`
- Create: `src/pages/RankingLeaderboard.css`

- [ ] **Step 1 : Créer `RankingLeaderboard.css`**

```css
/* src/pages/RankingLeaderboard.css */

/* Override grid pour 4 colonnes : rang / joueur / score / erreur */
.ranking-lb .daily-lb__header,
.ranking-lb .daily-lb__row-main {
  grid-template-columns: 40px 1fr 80px 80px;
}

.ranking-lb__score,
.ranking-lb__error {
  font-size: 0.9rem;
  color: var(--text-primary);
  text-align: right;
}
```

- [ ] **Step 2 : Créer `RankingLeaderboard.jsx`**

```jsx
// src/pages/RankingLeaderboard.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { GAME_TYPES } from '../utils/gameTypes'
import { sortRankingScores } from '../utils/rankingScores'
import './DailyLeaderboard.css'
import './RankingLeaderboard.css'

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

export default function RankingLeaderboard({ dailyKey }) {
  const [selectedDate, setSelectedDate] = useState(dailyKey ?? '')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const days = useMemo(() => (dailyKey ? getLast7Days(dailyKey) : []), [dailyKey])

  if (!dailyKey) return null

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true)
      try {
        const snapshot = await getDocs(
          query(
            collection(firestore, 'daily_scores'),
            where('gameType', '==', GAME_TYPES.RANKING),
            where('dailyKey', '==', selectedDate)
          )
        )
        setScores(sortRankingScores(snapshot.docs.map((doc) => doc.data())))
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [selectedDate])

  return (
    <div className="daily-lb ranking-lb">
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
            <span style={{ textAlign: 'right' }}>Score</span>
            <span style={{ textAlign: 'right' }}>Erreur</span>
          </div>
          {scores.map((score, index) => (
            <div
              key={`${score.name}-${score.dailyKey}-${index}`}
              className={`daily-lb__row${index < 3 ? ' daily-lb__row--top' : ''}`}
            >
              <div className="daily-lb__row-main">
                <span className="daily-lb__rank">
                  {index < 3 ? MEDAL[index] : `#${index + 1}`}
                </span>
                <span className="daily-lb__name">{score.name}</span>
                <span className="ranking-lb__score">{score.score} pts</span>
                <span className="ranking-lb__error">{score.totalError} pos.</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : Vérifier que les tests existants passent toujours**

```bash
cd D:/NasaCode/GeoGame && npm test
```

Attendu : tous les tests PASS (aucun test sur les composants React)

- [ ] **Step 4 : Commit**

```bash
cd D:/NasaCode/GeoGame
git add src/pages/RankingLeaderboard.jsx src/pages/RankingLeaderboard.css
git commit -m "feat: add RankingLeaderboard component"
```

---

### Task 3 : Brancher `RankingLeaderboard` dans `RankingGamePage`

**Files:**
- Modify: `src/pages/RankingGamePage.jsx`

- [ ] **Step 1 : Remplacer l'import dans `RankingGamePage.jsx`**

Dans `src/pages/RankingGamePage.jsx`, remplacer la ligne :

```js
import DailyLeaderboard from './DailyLeaderboard'
```

par :

```js
import RankingLeaderboard from './RankingLeaderboard'
```

- [ ] **Step 2 : Remplacer l'usage du composant**

Dans `src/pages/RankingGamePage.jsx`, remplacer :

```jsx
{mode === 'daily' && (
  <DailyLeaderboard gameType={GAME_TYPES.RANKING} dailyKey={dailyKey} />
)}
```

par :

```jsx
{mode === 'daily' && (
  <RankingLeaderboard dailyKey={dailyKey} />
)}
```

- [ ] **Step 3 : Supprimer l'import `GAME_TYPES` si plus utilisé ailleurs dans le fichier**

Vérifier si `GAME_TYPES` est encore utilisé dans `RankingGamePage.jsx` (il est utilisé dans `submitToLeaderboard` à la ligne ~82 : `gameType: GAME_TYPES.RANKING`). Si oui, **garder** l'import. Ne pas le supprimer.

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
cd D:/NasaCode/GeoGame && npm test
```

Attendu : tous les tests PASS

- [ ] **Step 5 : Commit**

```bash
cd D:/NasaCode/GeoGame
git add src/pages/RankingGamePage.jsx
git commit -m "feat: use RankingLeaderboard in ranking game page"
```

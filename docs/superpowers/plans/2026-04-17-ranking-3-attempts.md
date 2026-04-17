# Ranking 3 Attempts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner 3 essais au joueur dans le Country Ranking avec feedback visuel après chaque essai raté, score basé sur le numéro d'essai (3/2/1 pts si ordre parfait), et affichage des essais utilisés dans le leaderboard.

**Architecture:** On étend `useRankingGameState` avec 3 nouveaux champs de state (`attemptNumber`, `positionFeedback`, `bestTotalError`) et une fonction `retryAttempt`. La soumission branche sur parfait / dernier essai / essai intermédiaire. L'UI masque le drag pendant le feedback et montre un bouton Réessayer.

**Tech Stack:** React hooks, Vitest, Firebase Firestore, @hello-pangea/dnd

---

## File Map

| Fichier | Changement |
|---|---|
| `src/utils/scoringRules.js` | Ajouter `getRankingAttemptScore(attemptNumber)` |
| `src/utils/scoringRules.test.js` | Tests pour `getRankingAttemptScore` |
| `src/hooks/useRankingGameState.js` | Export `computePositionFeedback`, nouveaux champs state, `retryAttempt`, `handleSubmit` réécrit, restore localStorage |
| `src/hooks/useRankingGameState.test.js` | Tests pour `computePositionFeedback` |
| `src/pages/RankingGamePage.jsx` | Compteur d'essais, feedback visuel, bouton Réessayer, `submitToLeaderboard` mis à jour |
| `src/pages/RankingGamePage.css` | Classes `.ranking-country-item--correct` et `--wrong` |
| `src/pages/RankingLeaderboard.jsx` | Colonne `attemptsUsed` |

---

## Task 1 — `getRankingAttemptScore` dans `scoringRules.js`

**Files:**
- Modify: `src/utils/scoringRules.js`
- Modify: `src/utils/scoringRules.test.js`

- [ ] **Step 1: Écrire le test qui fail**

Ajouter à la fin de `src/utils/scoringRules.test.js` :

```js
import { getRankingGamePoints, getRankingAttemptScore } from './scoringRules'

describe('getRankingAttemptScore', () => {
  it('returns 3 for attempt 1', () => {
    expect(getRankingAttemptScore(1)).toBe(3)
  })

  it('returns 2 for attempt 2', () => {
    expect(getRankingAttemptScore(2)).toBe(2)
  })

  it('returns 1 for attempt 3', () => {
    expect(getRankingAttemptScore(3)).toBe(1)
  })
})
```

- [ ] **Step 2: Vérifier que le test fail**

```
npm test
```

Attendu : FAIL — `getRankingAttemptScore is not a function`

- [ ] **Step 3: Ajouter la fonction dans `src/utils/scoringRules.js`**

Ajouter à la fin du fichier (après `getRankingGamePoints`) :

```js
/**
 * Ranking Game — attempt-based scoring.
 * Perfect order (totalError = 0) on attempt N earns (4 - N) points.
 * attemptNumber 1 → 3 pts, 2 → 2 pts, 3 → 1 pt.
 */
export function getRankingAttemptScore(attemptNumber) {
  return 4 - attemptNumber
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```
npm test
```

Attendu : PASS pour tous les tests de `scoringRules.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/utils/scoringRules.js src/utils/scoringRules.test.js
git commit -m "feat: add getRankingAttemptScore for attempt-based ranking scoring"
```

---

## Task 2 — `computePositionFeedback` dans `useRankingGameState.js`

**Files:**
- Modify: `src/hooks/useRankingGameState.js`
- Modify: `src/hooks/useRankingGameState.test.js`

- [ ] **Step 1: Écrire le test qui fail**

Dans `src/hooks/useRankingGameState.test.js`, mettre à jour l'import et ajouter le describe :

```js
import { describe, it, expect } from 'vitest'
import { computeTotalError, computePositionFeedback, pickCriterionKey } from './useRankingGameState'
import { CRITERIA_KEYS } from '../utils/rankingCriteria'

const c = (iso) => ({ properties: { ISO_A3: iso } })

// ... tests existants inchangés ...

describe('computePositionFeedback', () => {
  it('returns all true for a perfect order', () => {
    const order = [c('FRA'), c('DEU'), c('ESP')]
    expect(computePositionFeedback(order, order)).toEqual([true, true, true])
  })

  it('returns false for swapped adjacent countries', () => {
    const correct = [c('FRA'), c('DEU'), c('ESP')]
    const player  = [c('DEU'), c('FRA'), c('ESP')]
    expect(computePositionFeedback(player, correct)).toEqual([false, false, true])
  })

  it('returns false for all positions when completely reversed', () => {
    const correct = [c('A'), c('B'), c('C')]
    const player  = [c('C'), c('B'), c('A')]
    expect(computePositionFeedback(player, correct)).toEqual([false, true, false])
  })
})
```

- [ ] **Step 2: Vérifier que le test fail**

```
npm test
```

Attendu : FAIL — `computePositionFeedback is not a function`

- [ ] **Step 3: Ajouter la fonction dans `src/hooks/useRankingGameState.js`**

Ajouter après `computeTotalError` (ligne ~26), dans la section `// --- Pure helpers (exported for testing) ---` :

```js
export function computePositionFeedback(playerOrder, correctOrder) {
  return playerOrder.map(
    (country, i) => country.properties.ISO_A3 === correctOrder[i].properties.ISO_A3
  )
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```
npm test
```

Attendu : PASS pour `useRankingGameState.test.js`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRankingGameState.js src/hooks/useRankingGameState.test.js
git commit -m "feat: add computePositionFeedback helper to ranking game state"
```

---

## Task 3 — Nouveaux champs de state + `retryAttempt` dans le hook

**Files:**
- Modify: `src/hooks/useRankingGameState.js`

- [ ] **Step 1: Mettre à jour l'import de `scoringRules`**

Ligne 6 de `src/hooks/useRankingGameState.js`, remplacer :

```js
import { getRankingGamePoints } from '../utils/scoringRules'
```

par :

```js
import { getRankingAttemptScore } from '../utils/scoringRules'
```

- [ ] **Step 2: Ajouter les nouveaux `useState` dans le hook**

Dans `useRankingGameState`, après la ligne `const [countryValues, setCountryValues] = useState(new Map())` (ligne ~123), ajouter :

```js
const [attemptNumber, setAttemptNumber] = useState(1)
const [positionFeedback, setPositionFeedback] = useState(null)
const [bestTotalError, setBestTotalError] = useState(null)
```

- [ ] **Step 3: Réinitialiser les nouveaux champs dans `initInfiniteRound`**

Dans `initInfiniteRound`, ajouter après `setCountryValues(new Map())` :

```js
setAttemptNumber(1)
setPositionFeedback(null)
setBestTotalError(null)
```

- [ ] **Step 4: Réinitialiser les nouveaux champs dans `startNextRound`**

Dans `startNextRound`, ajouter après `setCountryValues(new Map())` :

```js
setAttemptNumber(1)
setPositionFeedback(null)
setBestTotalError(null)
```

- [ ] **Step 5: Réinitialiser dans le `useEffect` (mode infinite)**

Dans le `useEffect` (ligne ~126), dans le bloc `else` (mode non-daily), ajouter après `setCountryValues(new Map())` :

```js
setAttemptNumber(1)
setPositionFeedback(null)
setBestTotalError(null)
```

- [ ] **Step 6: Ajouter la fonction `retryAttempt`**

Ajouter après `handleSubmit` :

```js
function retryAttempt() {
  setAttemptNumber((prev) => prev + 1)
  setPositionFeedback(null)
}
```

- [ ] **Step 7: Exposer les nouveaux champs dans le return**

Dans le `return { ... }` du hook, ajouter :

```js
attemptNumber,
positionFeedback,
retryAttempt,
```

- [ ] **Step 8: Vérifier que les tests passent**

```
npm test
```

Attendu : PASS (aucun test cassé)

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useRankingGameState.js
git commit -m "feat: add attempt state fields and retryAttempt to ranking hook"
```

---

## Task 4 — Réécrire `handleSubmit` + mise à jour restore localStorage

**Files:**
- Modify: `src/hooks/useRankingGameState.js`

- [ ] **Step 1: Réécrire `handleSubmit`**

Remplacer la fonction `handleSubmit` existante (lignes ~216-241) par :

```js
function handleSubmit() {
  if (status !== 'playing' || !criterion || positionFeedback !== null) return

  const correct = computeCorrectOrder(countries, criterion, areaMap)
  const error = computeTotalError(countries, correct)
  const feedback = computePositionFeedback(countries, correct)
  const newBestError = bestTotalError === null ? error : Math.min(bestTotalError, error)

  setPositionFeedback(feedback)
  setBestTotalError(newBestError)

  if (error === 0) {
    const pts = getRankingAttemptScore(attemptNumber)
    setCorrectOrder(correct)
    setCountryValues(buildValuesMap(countries, criterion, areaMap))
    setScore(pts)
    setTotalError(0)
    setStatus('submitted')

    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      saveDailyProgress(dateKey, {
        ...(saved ?? {}),
        playerOrder: countries.map((c) => c.properties.ISO_A3),
        status: 'submitted',
        score: pts,
        totalError: 0,
        attemptNumber,
        bestTotalError: 0,
        positionFeedback: feedback,
      })
    }
  } else if (attemptNumber >= 3) {
    setCorrectOrder(correct)
    setCountryValues(buildValuesMap(countries, criterion, areaMap))
    setScore(0)
    setTotalError(newBestError)
    setStatus('submitted')

    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      saveDailyProgress(dateKey, {
        ...(saved ?? {}),
        playerOrder: countries.map((c) => c.properties.ISO_A3),
        status: 'submitted',
        score: 0,
        totalError: newBestError,
        attemptNumber,
        bestTotalError: newBestError,
        positionFeedback: feedback,
      })
    }
  } else {
    if (mode === 'daily') {
      const dateKey = getTodayKey()
      const saved = readDailyProgress(dateKey)
      saveDailyProgress(dateKey, {
        ...(saved ?? {}),
        playerOrder: countries.map((c) => c.properties.ISO_A3),
        status: 'playing',
        score: null,
        totalError: null,
        attemptNumber,
        bestTotalError: newBestError,
        positionFeedback: feedback,
      })
    }
  }
}
```

- [ ] **Step 2: Mettre à jour `initDailyRound` — sauvegarde initiale**

Dans `initDailyRound`, dans le bloc `else` (nouvelle partie), trouver l'appel `saveDailyProgress(dateKey, { ... })` et ajouter les 3 nouveaux champs :

```js
saveDailyProgress(dateKey, {
  criterion: criterionKey,
  initialOrder: shuffled.map((c) => c.properties.ISO_A3),
  playerOrder: shuffled.map((c) => c.properties.ISO_A3),
  status: 'playing',
  score: null,
  totalError: null,
  attemptNumber: 1,
  positionFeedback: null,
  bestTotalError: null,
})
```

- [ ] **Step 3: Mettre à jour `initDailyRound` — restore**

Dans `initDailyRound`, dans le bloc `if (saved)`, ajouter après `setStatus(saved.status)` :

```js
setAttemptNumber(saved.attemptNumber ?? 1)
setPositionFeedback(saved.positionFeedback ?? null)
setBestTotalError(saved.bestTotalError ?? null)
```

- [ ] **Step 4: Vérifier que les tests passent**

```
npm test
```

Attendu : PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRankingGameState.js
git commit -m "feat: rewrite handleSubmit with 3-attempt logic and update daily save/restore"
```

---

## Task 5 — Mise à jour `RankingGamePage` — compteur + feedback UI

**Files:**
- Modify: `src/pages/RankingGamePage.jsx`

- [ ] **Step 1: Destructurer les nouveaux champs du hook**

Dans `RankingGamePage`, mettre à jour le destructuring du hook :

```js
const {
  criterion,
  countries,
  countryValues,
  reorderCountries,
  status,
  score,
  totalError,
  correctOrder,
  handleSubmit,
  startNextRound,
  startInfiniteRound,
  dailyKey,
  attemptNumber,
  positionFeedback,
  retryAttempt,
} = useRankingGameState(mode, { countryCount })
```

- [ ] **Step 2: Ajouter le compteur d'essais au-dessus du drag**

Dans la section `{/* === PLAYING === */}`, après `<div className="ranking-drag-hint">Glisse pour réordonner</div>`, ajouter :

```jsx
<div className="ranking-attempt-counter">
  Essai {attemptNumber} / 3
</div>
```

- [ ] **Step 3: Ajouter les couleurs de feedback sur les items draggables**

Dans le `<Draggable>`, mettre à jour le className du div principal :

```jsx
className={`ranking-country-item${snapshot.isDragging ? ' ranking-country-item--dragging' : ''}${positionFeedback ? (positionFeedback[index] ? ' ranking-country-item--correct' : ' ranking-country-item--wrong') : ''}`}
```

- [ ] **Step 4: Masquer le drag + afficher le bouton Réessayer quand positionFeedback**

Entourer `<DragDropContext>` et le bouton Soumettre dans une condition, et ajouter le bloc feedback.

Remplacer le bloc entier (du `<DragDropContext>` jusqu'au bouton Soumettre inclus) par :

```jsx
{!positionFeedback ? (
  <>
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
                    style={provided.draggableProps.style}
                    className={`ranking-country-item${snapshot.isDragging ? ' ranking-country-item--dragging' : ''}`}
                  >
                    <span className="ranking-drag-handle">⠿</span>
                    <span className="ranking-country-index">{index + 1}</span>
                    {FLAG_URL(country.properties.ISO_A2) && (
                      <img
                        src={FLAG_URL(country.properties.ISO_A2)}
                        alt=""
                        className="ranking-country-flag"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                    <span className="ranking-country-name">{country.properties.ADMIN}</span>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>

    <button className="ranking-submit-btn" onClick={handleSubmit}>
      ✓ Soumettre mon classement
    </button>
  </>
) : (
  <>
    <div>
      {countries.map((country, index) => (
        <div
          key={country.properties.ISO_A3}
          className={`ranking-country-item${positionFeedback[index] ? ' ranking-country-item--correct' : ' ranking-country-item--wrong'}`}
        >
          <span className="ranking-country-index">{index + 1}</span>
          {FLAG_URL(country.properties.ISO_A2) && (
            <img
              src={FLAG_URL(country.properties.ISO_A2)}
              alt=""
              className="ranking-country-flag"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}
          <span className="ranking-country-name">{country.properties.ADMIN}</span>
        </div>
      ))}
    </div>

    <button className="ranking-submit-btn" onClick={retryAttempt}>
      ↺ Réessayer — Essai {attemptNumber + 1} / 3
    </button>
  </>
)}
```

- [ ] **Step 5: Mettre à jour `submitToLeaderboard` — ajouter `attemptsUsed` et améliorer le check**

Remplacer dans `submitToLeaderboard` le bloc `if (!existing.empty)` par :

```js
if (!existing.empty) {
  const prev = existing.docs[0].data()
  const better =
    score > prev.score ||
    (score === prev.score && totalError < (prev.totalError ?? Infinity))
  if (better) {
    await deleteDoc(existing.docs[0].ref)
  } else {
    toast.info('Tu as déjà un meilleur score enregistré.', { containerId: 'topRightToast' })
    setSubmitting(false)
    return
  }
}
```

Et dans `addDoc`, ajouter `attemptsUsed` :

```js
await addDoc(ref, {
  name,
  gameType: GAME_TYPES.RANKING,
  dailyKey,
  score,
  totalError,
  attemptsUsed: attemptNumber,
  playerOrder: countries.map((c) => c.properties.ADMIN),
})
```

- [ ] **Step 6: Vérifier que les tests passent**

```
npm test
```

Attendu : PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/RankingGamePage.jsx
git commit -m "feat: add attempt counter, position feedback UI, and retry button to ranking page"
```

---

## Task 6 — CSS : classes feedback

**Files:**
- Modify: `src/pages/RankingGamePage.css`

- [ ] **Step 1: Ajouter les classes de feedback et le compteur**

Ajouter à la fin de `src/pages/RankingGamePage.css` :

```css
/* ── Attempt counter ── */
.ranking-attempt-counter {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

/* ── Position feedback colors ── */
.ranking-country-item--correct {
  border-left: 4px solid #22c55e;
}

.ranking-country-item--wrong {
  border-left: 4px solid #ef4444;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/RankingGamePage.css
git commit -m "feat: add attempt counter and position feedback CSS classes"
```

---

## Task 7 — Leaderboard : afficher `attemptsUsed`

**Files:**
- Modify: `src/pages/RankingLeaderboard.jsx`

- [ ] **Step 1: Ajouter `attemptsUsed` dans `AccordionRow`**

Dans le `<div className="daily-lb__row-main">`, ajouter après `<span className="ranking-lb__error">` :

```jsx
<span className="ranking-lb__attempts">
  {score.attemptsUsed != null
    ? `${score.attemptsUsed} essai${score.attemptsUsed !== 1 ? 's' : ''}`
    : '—'}
</span>
```

- [ ] **Step 2: Ajouter la colonne dans le header**

Dans `<div className="daily-lb__header">`, ajouter après `<span className="ranking-lb__error">Erreur</span>` :

```jsx
<span className="ranking-lb__attempts">Essais</span>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/RankingLeaderboard.jsx
git commit -m "feat: show attemptsUsed in ranking leaderboard"
```

---

## Task 8 — Vérification finale

- [ ] **Step 1: Lancer tous les tests**

```
npm test
```

Attendu : PASS — tous les tests

- [ ] **Step 2: Vérifier le comportement en mode daily**

Lancer `npm run dev` et vérifier :
1. Essai 1/3 affiché, soumission sans ordre parfait → feedback rouge/vert affiché
2. Bouton "Réessayer — Essai 2/3" visible
3. Clic Réessayer → compteur passe à 2/3, drag réactivé
4. Ordre parfait au 2e essai → 2 pts, jeu terminé, leaderboard montre "2 essais"
5. 3 essais sans ordre parfait → 0 pt, bon ordre révélé
6. Rechargement page entre deux essais → état restauré correctement

- [ ] **Step 3: Commit final si ajustements mineurs**

```bash
git add -p
git commit -m "fix: ranking 3-attempts minor adjustments"
```

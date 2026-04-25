# Multi Chill Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode multijoueur "chill" où tous les joueurs répondent au même pays simultanément dans un compte à rebours commun, avec une revue collective à la fin de chaque manche.

**Architecture:** Variante `mode: 'chill'` dans la structure Firestore existante. L'hôte écrit `chillState` dans le document room ; tous les clients écoutent via le hook `useMultiplayerRoom` existant. `ChillGame.jsx` remplace `MultiplayerGame.jsx` pour les rooms chill. Les routes, lobby, between_games et leaderboard final sont inchangés.

**Tech Stack:** React 18, Firebase Firestore v9, Leaflet + react-leaflet, Vitest, hooks et utils existants (`multiplayerRoom.js`, `scoringRules.js`, `multiplayerSeed.js`, `normalizeAnswer.js`)

---

## Carte des fichiers

### Nouveaux fichiers
| Fichier | Responsabilité |
|---------|---------------|
| `src/utils/chillModeUtils.js` | Durées countdown, évaluation des réponses (fonctions pures) |
| `src/utils/chillModeUtils.test.js` | Tests unitaires des fonctions pures |
| `src/components/multiplayer/chill/ChillCountdown.jsx` | Barre de progression synchronisée sur `countdownEnd` Firestore |
| `src/components/multiplayer/chill/ChillTextInput.jsx` | Input texte sans validation temps réel, auto-soumis à `countdownEnd` |
| `src/components/multiplayer/chill/ChillPlacementInput.jsx` | Carte Leaflet avec marqueur unique, verrouillé à `countdownEnd` |
| `src/components/multiplayer/chill/ChillReview.jsx` | Revue de fin de manche : bons ensemble, mauvais un par un |
| `src/components/multiplayer/chill/ChillGame.jsx` | Orchestrateur principal du mode chill |

### Fichiers modifiés
| Fichier | Lignes concernées | Changement |
|---------|------------------|------------|
| `src/utils/multiplayerRoom.js` | Fin du fichier (après l.151) | +4 fonctions Firestore chill |
| `src/components/multiplayer/RoomConfig.jsx` | l.169 (state), l.198 (submit), l.249 (UI) | Toggle Mode Chill + mancheSize |
| `src/pages/multiplayer/MultiplayerRoomPage.jsx` | l.7 (import), l.56–69 (playing branch) | Brancher vers ChillGame si chill |

---

## Task 1 — chillModeUtils.js + tests unitaires

**Fichiers :**
- Créer : `src/utils/chillModeUtils.js`
- Créer : `src/utils/chillModeUtils.test.js`

- [ ] **Étape 1.1 — Vérifier la config Vitest**

Ouvrir `vite.config.js`. Si la clé `test` est absente, l'ajouter :

```js
// vite.config.js  (ajouter dans defineConfig)
test: {
  environment: 'node',
},
```

Vérifier que `package.json` contient bien `"test": "vitest run"` (c'est déjà le cas).

- [ ] **Étape 1.2 — Écrire les tests qui vont échouer**

```js
// src/utils/chillModeUtils.test.js
import { describe, test, expect } from 'vitest'
import {
  CHILL_COUNTDOWN_MS,
  getCountdownMs,
  evaluateTextAnswer,
  evaluateGuessAnswer,
  evaluatePlacement,
  flattenAscensionCountries,
} from './chillModeUtils'

describe('getCountdownMs', () => {
  test('retourne les durées exactes par difficulté', () => {
    expect(getCountdownMs('Facile')).toBe(6000)
    expect(getCountdownMs('Moyen')).toBe(8000)
    expect(getCountdownMs('Difficile')).toBe(10000)
    expect(getCountdownMs('Impossible')).toBe(15000)
  })
  test('retourne 10000 pour une difficulté inconnue', () => {
    expect(getCountdownMs('Hardcore')).toBe(10000)
    expect(getCountdownMs(undefined)).toBe(10000)
  })
})

describe('evaluateTextAnswer', () => {
  test('correct sur correspondance exacte', () => {
    const r = evaluateTextAnswer('France', 'France', [], 'Facile')
    expect(r.correct).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
  test('correct sur alias', () => {
    const r = evaluateTextAnswer('Francia', 'France', ['Francia'], 'Moyen')
    expect(r.correct).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
  test('correct insensible à la casse et aux accents', () => {
    const r = evaluateTextAnswer('france', 'France', [], 'Facile')
    expect(r.correct).toBe(true)
  })
  test('incorrect sur mauvaise réponse', () => {
    const r = evaluateTextAnswer('Allemagne', 'France', [], 'Facile')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
  test('incorrect sur réponse vide', () => {
    expect(evaluateTextAnswer('', 'France', [], 'Facile').correct).toBe(false)
    expect(evaluateTextAnswer(null, 'France', [], 'Facile').correct).toBe(false)
  })
})

describe('evaluateGuessAnswer', () => {
  test('correct donne 3 pts (getGuessGamePoints(0))', () => {
    const r = evaluateGuessAnswer('France', 'France', [])
    expect(r.correct).toBe(true)
    expect(r.score).toBe(3)
  })
  test('incorrect donne 0 pt', () => {
    const r = evaluateGuessAnswer('Belgique', 'France', [])
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
})

describe('evaluatePlacement', () => {
  test('correct quand les noms correspondent', () => {
    const r = evaluatePlacement('France', 'France', 'Moyen')
    expect(r.correct).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
  test('correct insensible à la casse', () => {
    const r = evaluatePlacement('france', 'France', 'Moyen')
    expect(r.correct).toBe(true)
  })
  test('incorrect quand les noms ne correspondent pas', () => {
    const r = evaluatePlacement('Allemagne', 'France', 'Moyen')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
  test('incorrect si clickedAdmin est null', () => {
    const r = evaluatePlacement(null, 'France', 'Moyen')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
})

describe('flattenAscensionCountries', () => {
  test('aplatit dans l\'ordre Facile→Moyen→Difficile→Impossible', () => {
    const overrides = {
      Facile: [{ ADMIN: 'A' }, { ADMIN: 'B' }],
      Moyen: [{ ADMIN: 'C' }],
      Difficile: [],
      Impossible: [{ ADMIN: 'D' }],
    }
    const result = flattenAscensionCountries(overrides)
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ country: { ADMIN: 'A' }, difficulty: 'Facile' })
    expect(result[2]).toEqual({ country: { ADMIN: 'C' }, difficulty: 'Moyen' })
    expect(result[3]).toEqual({ country: { ADMIN: 'D' }, difficulty: 'Impossible' })
  })
  test('retourne [] pour un objet vide', () => {
    expect(flattenAscensionCountries({})).toEqual([])
  })
})
```

- [ ] **Étape 1.3 — Lancer les tests pour vérifier qu'ils échouent**

```
npm test
```

Attendu : FAIL — "Cannot find module './chillModeUtils'"

- [ ] **Étape 1.4 — Implémenter chillModeUtils.js**

```js
// src/utils/chillModeUtils.js
import { checkAnswer, normalize } from './normalizeAnswer'
import { getPlacementPoints, getWordGamePoints, getGuessGamePoints } from './scoringRules'

export const CHILL_COUNTDOWN_MS = {
  Facile:     6000,
  Moyen:      8000,
  Difficile:  10000,
  Impossible: 15000,
}

/** Retourne la durée du countdown en ms pour une difficulté donnée. */
export function getCountdownMs(difficulty) {
  return CHILL_COUNTDOWN_MS[difficulty] ?? 10000
}

/**
 * Évalue une réponse textuelle (FLAGS, CAPITALS).
 * @param {string|null} submitted
 * @param {string} target  — ADMIN ou capital city name
 * @param {string[]} aliases
 * @param {string} difficulty
 */
export function evaluateTextAnswer(submitted, target, aliases, difficulty) {
  if (!submitted || !submitted.trim()) return { correct: false, score: 0 }
  const correct = checkAnswer(submitted.trim(), target, aliases)
  const score = correct ? getWordGamePoints(difficulty, 0) : 0
  return { correct, score }
}

/**
 * Évalue une réponse textuelle pour les jeux sans difficulté (BORDER_GUESS, COUNTRY_CLUE).
 * @param {string|null} submitted
 * @param {string} target
 * @param {string[]} aliases
 */
export function evaluateGuessAnswer(submitted, target, aliases) {
  if (!submitted || !submitted.trim()) return { correct: false, score: 0 }
  const correct = checkAnswer(submitted.trim(), target, aliases)
  const score = correct ? getGuessGamePoints(0) : 0
  return { correct, score }
}

/**
 * Évalue un placement sur la carte.
 * @param {string|null} clickedAdmin  — ADMIN du pays cliqué (ou null si pas de clic)
 * @param {string} targetName         — nom attendu (string depuis getSeededPlacementCountries)
 * @param {string} difficulty
 */
export function evaluatePlacement(clickedAdmin, targetName, difficulty) {
  if (!clickedAdmin) return { correct: false, score: 0 }
  const correct = normalize(clickedAdmin) === normalize(targetName)
  const score = correct ? getPlacementPoints(difficulty, 0) : 0
  return { correct, score }
}

/**
 * Aplatit le résultat de getSeededAscensionOverrides en tableau séquentiel
 * avec la difficulté associée à chaque pays.
 * @param {{ [difficulty: string]: object[] }} overrides
 * @returns {{ country: object, difficulty: string }[]}
 */
export function flattenAscensionCountries(overrides) {
  const ORDER = ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return ORDER.flatMap(diff =>
    (overrides[diff] ?? []).map(country => ({ country, difficulty: diff }))
  )
}
```

- [ ] **Étape 1.5 — Lancer les tests pour vérifier qu'ils passent**

```
npm test
```

Attendu : toutes les assertions PASS.

- [ ] **Étape 1.6 — Commit**

```bash
git add src/utils/chillModeUtils.js src/utils/chillModeUtils.test.js
git commit -m "feat: add chillModeUtils — countdown durations and answer evaluation"
```

---

## Task 2 — Fonctions Firestore pour l'état chill

**Fichiers :**
- Modifier : `src/utils/multiplayerRoom.js` (ajouter après la ligne 151)

**Structure `chillState` dans le document room :**
```js
chillState: {
  phase: 'playing' | 'review',
  currentCountryIndex: number,      // index du pays en cours dans la liste seeded
  countdownEnd: Timestamp,          // timestamp absolu — base de sync commune
  mancheStartIndex: number,         // index du début de la manche courante
  reviewStep: number,               // 0 = bons résultats, 1..N = mauvais #N
  playerAnswers: {
    [playerId]: {
      [countryIndex]: {             // clé = index (stringifié par Firestore)
        answer?: string,            // pour les jeux textuels
        clickedAdmin?: string,      // pour le placement
        correct: boolean,
        score: number,
      } | null
    }
  }
}
```

- [ ] **Étape 2.1 — Ajouter les 4 fonctions dans multiplayerRoom.js**

Ajouter à la **fin** du fichier `src/utils/multiplayerRoom.js` (après la ligne 151) :

```js
// ─── Chill Mode ─────────────────────────────────────────────────────────────

/**
 * Initialise chillState au démarrage d'un jeu chill.
 * Appelé par le host uniquement.
 */
export async function initChillState(roomId, countdownMs) {
  const countdownEnd = Timestamp.fromDate(new Date(Date.now() + countdownMs))
  await updateDoc(doc(firestore, 'rooms', roomId), {
    chillState: {
      phase: 'playing',
      currentCountryIndex: 0,
      countdownEnd,
      mancheStartIndex: 0,
      reviewStep: 0,
      playerAnswers: {},
    },
  })
}

/**
 * Host : passe au pays suivant ou déclenche la review.
 * @param {string} phase        - 'playing' | 'review'
 * @param {number} nextIndex    - nouveau currentCountryIndex
 * @param {number} mancheStart  - mancheStartIndex inchangé ou mis à jour
 * @param {number|null} countdownMs - si phase='playing', durée du nouveau countdown
 */
export async function advanceChillTurn(roomId, phase, nextIndex, mancheStart, countdownMs) {
  const update = {
    'chillState.phase': phase,
    'chillState.currentCountryIndex': nextIndex,
    'chillState.mancheStartIndex': mancheStart,
    'chillState.reviewStep': 0,
  }
  if (phase === 'playing' && countdownMs != null) {
    update['chillState.countdownEnd'] = Timestamp.fromDate(
      new Date(Date.now() + countdownMs)
    )
  }
  await updateDoc(doc(firestore, 'rooms', roomId), update)
}

/**
 * Un joueur soumet sa réponse pour le pays courant.
 * Chaque joueur écrit sur son propre chemin — pas de conflit.
 */
export async function submitChillAnswer(roomId, playerId, countryIndex, answerData) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    [`chillState.playerAnswers.${playerId}.${countryIndex}`]: answerData,
  })
}

/**
 * Host : avance d'un pas dans la review (ou déclenche onContinue côté client).
 */
export async function setChillReviewStep(roomId, step) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    'chillState.reviewStep': step,
  })
}
```

- [ ] **Étape 2.2 — Vérifier que le fichier compile**

```
npm run build -- --mode development 2>&1 | head -20
```

Attendu : aucune erreur de syntaxe/import.

- [ ] **Étape 2.3 — Commit**

```bash
git add src/utils/multiplayerRoom.js
git commit -m "feat: add Firestore chill state utilities"
```

---

## Task 3 — RoomConfig : toggle Mode Chill + mancheSize

**Fichiers :**
- Modifier : `src/components/multiplayer/RoomConfig.jsx`

- [ ] **Étape 3.1 — Ajouter le state chill dans RoomConfig**

À la ligne 170 (après `const [games, setGames] = useState(…)`) :

```jsx
const [chillMode, setChillMode] = useState(false)
const [mancheSize, setMancheSize] = useState(10)
```

- [ ] **Étape 3.2 — Modifier handleSubmit pour inclure chillConfig**

Remplacer la ligne 198 :

```jsx
// AVANT
onSubmit({ pseudo: pseudo.trim(), config: { games } })

// APRÈS
onSubmit({
  pseudo: pseudo.trim(),
  config: {
    games,
    ...(chillMode ? { chillConfig: { mancheSize } } : {}),
  },
})
```

- [ ] **Étape 3.3 — Ajouter l'UI du Mode Chill**

Ajouter juste **avant** le bouton submit (avant la ligne 251) :

```jsx
<div className="rc-chill-section">
  <label className="rc-checkbox-label">
    <input
      type="checkbox"
      checked={chillMode}
      onChange={e => setChillMode(e.target.checked)}
    />
    <span>🛋️ Mode Chill</span>
    <span className="rc-chill-hint" style={{ color: '#94a3b8', fontSize: '0.85em', marginLeft: 8 }}>
      Compte à rebours commun · Revue après chaque manche
    </span>
  </label>

  {chillMode && (
    <div className="rc-chill-options" style={{ marginTop: 12, paddingLeft: 24 }}>
      <label className="rc-slider-label">
        <span>
          Pays par manche : <strong>{mancheSize}</strong>
        </span>
        <input
          type="range"
          min={5}
          max={20}
          step={5}
          value={mancheSize}
          onChange={e => setMancheSize(Number(e.target.value))}
        />
        <span style={{ color: '#64748b', fontSize: '0.8em' }}>
          Chrono : Facile 6s · Moyen 8s · Difficile 10s · Impossible 15s
        </span>
      </label>
    </div>
  )}
</div>
```

- [ ] **Étape 3.4 — Tester manuellement dans le navigateur**

Lancer `npm run dev`, aller sur la page de création de room multijoueur.
Vérifier : le toggle "Mode Chill" apparaît, l'activer affiche le slider mancheSize (5/10/15/20), soumettre crée la room.
Vérifier dans Firestore (Firebase Console) que la room créée contient bien `config.chillConfig.mancheSize`.

- [ ] **Étape 3.5 — Commit**

```bash
git add src/components/multiplayer/RoomConfig.jsx
git commit -m "feat: add Mode Chill toggle and mancheSize config to RoomConfig"
```

---

## Task 4 — ChillCountdown.jsx

**Fichiers :**
- Créer : `src/components/multiplayer/chill/ChillCountdown.jsx`

- [ ] **Étape 4.1 — Créer le composant**

```jsx
// src/components/multiplayer/chill/ChillCountdown.jsx
import { useState, useEffect } from 'react'

/**
 * Barre de progression synchronisée sur countdownEnd (Firestore Timestamp).
 * @param {{ countdownEnd: import('firebase/firestore').Timestamp, totalMs: number }} props
 */
export default function ChillCountdown({ countdownEnd, totalMs }) {
  const [remaining, setRemaining] = useState(totalMs)

  useEffect(() => {
    if (!countdownEnd) return
    const endMs = typeof countdownEnd.toMillis === 'function'
      ? countdownEnd.toMillis()
      : Number(countdownEnd)

    const tick = () => setRemaining(Math.max(0, endMs - Date.now()))
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [countdownEnd])

  const pct = totalMs > 0 ? (remaining / totalMs) * 100 : 0
  const seconds = Math.ceil(remaining / 1000)
  const color = pct > 40 ? '#22c55e' : pct > 15 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      <div style={{
        width: '100%', height: 8,
        background: '#1e293b', borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.1s linear, background 0.3s',
        }} />
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: '0.75em',
        color: '#94a3b8',
        marginTop: 2,
      }}>
        {seconds}s
      </div>
    </div>
  )
}
```

- [ ] **Étape 4.2 — Commit**

```bash
git add src/components/multiplayer/chill/ChillCountdown.jsx
git commit -m "feat: add ChillCountdown synchronized progress bar"
```

---

## Task 5 — ChillTextInput.jsx

**Fichiers :**
- Créer : `src/components/multiplayer/chill/ChillTextInput.jsx`

- [ ] **Étape 5.1 — Créer le composant**

```jsx
// src/components/multiplayer/chill/ChillTextInput.jsx
import { useState, useEffect, useRef } from 'react'

/**
 * Input texte sans validation temps réel.
 * Auto-soumet la valeur courante quand countdownEnd est atteint.
 *
 * @param {{
 *   onSubmit: (value: string) => void,
 *   countdownEnd: import('firebase/firestore').Timestamp,
 *   locked: boolean,
 *   placeholder?: string,
 * }} props
 */
export default function ChillTextInput({ onSubmit, countdownEnd, locked, placeholder = 'Écris ta réponse…' }) {
  const [value, setValue] = useState('')
  // Ref pour capturer la valeur la plus récente dans le setTimeout
  const valueRef = useRef('')
  const submitted = useRef(false)

  // Réinitialiser quand countdownEnd change (nouveau pays)
  useEffect(() => {
    setValue('')
    valueRef.current = ''
    submitted.current = false
  }, [countdownEnd])

  // Auto-soumettre à countdownEnd
  useEffect(() => {
    if (!countdownEnd) return
    const endMs = typeof countdownEnd.toMillis === 'function'
      ? countdownEnd.toMillis()
      : Number(countdownEnd)
    const ms = Math.max(0, endMs - Date.now())
    const id = setTimeout(() => {
      if (!submitted.current) {
        submitted.current = true
        onSubmit(valueRef.current)
      }
    }, ms)
    return () => clearTimeout(id)
  }, [countdownEnd, onSubmit])

  const handleChange = (e) => {
    if (locked || submitted.current) return
    setValue(e.target.value)
    valueRef.current = e.target.value
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      disabled={locked || submitted.current}
      placeholder={locked ? '⏳ En attente…' : placeholder}
      autoFocus
      style={{
        width: '100%',
        padding: '10px 14px',
        fontSize: '1rem',
        borderRadius: 8,
        border: `2px solid ${locked ? '#334155' : '#3b82f6'}`,
        background: '#0f172a',
        color: locked ? '#64748b' : '#f1f5f9',
        outline: 'none',
        transition: 'border-color 0.2s',
      }}
    />
  )
}
```

- [ ] **Étape 5.2 — Commit**

```bash
git add src/components/multiplayer/chill/ChillTextInput.jsx
git commit -m "feat: add ChillTextInput with auto-submit at countdown end"
```

---

## Task 6 — ChillPlacementInput.jsx

**Fichiers :**
- Créer : `src/components/multiplayer/chill/ChillPlacementInput.jsx`

**Note pour l'implémenteur :** Adapter le setup Leaflet de `GamePage.jsx` / `useGameState.js`. Le composant affiche la même carte monde, mais avec un seul clic possible (marqueur déplaçable). À `countdownEnd`, le pays sélectionné (ADMIN du layer cliqué) est soumis automatiquement.

- [ ] **Étape 6.1 — Créer le composant**

```jsx
// src/components/multiplayer/chill/ChillPlacementInput.jsx
import { useEffect, useRef } from 'react'
// Adapter les imports du même pattern que GamePage.jsx
// Le MapComponent existant doit être réutilisé ou adapté.

/**
 * Carte Leaflet en mode chill : un seul clic place le marqueur (déplaçable),
 * auto-soumet le pays cliqué à countdownEnd.
 *
 * @param {{
 *   targetName: string,          — nom du pays à trouver (affiché en haut)
 *   onSubmit: (clickedAdmin: string|null) => void,
 *   countdownEnd: import('firebase/firestore').Timestamp,
 *   locked: boolean,
 * }} props
 */
export default function ChillPlacementInput({ targetName, onSubmit, countdownEnd, locked }) {
  const selectedRef = useRef(null)   // ADMIN du dernier pays cliqué
  const submittedRef = useRef(false)

  // Réinitialiser à chaque nouveau pays
  useEffect(() => {
    selectedRef.current = null
    submittedRef.current = false
  }, [countdownEnd])

  // Auto-soumettre à countdownEnd
  useEffect(() => {
    if (!countdownEnd) return
    const endMs = typeof countdownEnd.toMillis === 'function'
      ? countdownEnd.toMillis()
      : Number(countdownEnd)
    const ms = Math.max(0, endMs - Date.now())
    const id = setTimeout(() => {
      if (!submittedRef.current) {
        submittedRef.current = true
        onSubmit(selectedRef.current)  // null si pas de clic
      }
    }, ms)
    return () => clearTimeout(id)
  }, [countdownEnd, onSubmit])

  // Handler à passer à la carte : appelé quand le joueur clique sur un pays
  const handleCountryClick = (countryAdmin) => {
    if (locked || submittedRef.current) return
    selectedRef.current = countryAdmin
    // Mettre à jour la surbrillance visuelle du pays sélectionné
    // (utiliser le même pattern de highlight que GamePage.jsx)
  }

  // TODO: Remplacer ce div par le composant carte existant de GamePage.jsx
  // en passant handleCountryClick comme prop onClick.
  // Le pays `selectedRef.current` doit être mis en surbrillance (couleur bleue).
  // Le pays `targetName` est affiché dans l'UI mais PAS sur la carte.
  return (
    <div>
      <p style={{ textAlign: 'center', fontSize: '1.2em', marginBottom: 8 }}>
        📍 Clique sur : <strong>{targetName}</strong>
      </p>
      {/* Remplacer par la vraie MapComponent en adaptant GamePage.jsx */}
      <div style={{ height: 400, background: '#1e293b', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        [Carte Leaflet — adapter depuis GamePage.jsx]
        <br />
        Sélectionné : {selectedRef.current ?? 'aucun'}
      </div>
    </div>
  )
}
```

**Instructions d'adaptation :** Ouvrir `GamePage.jsx` et `useGameState.js`. Copier l'initialisation Leaflet (`MapContainer`, `GeoJSON`, listener de clic sur les layers). Remplacer la logique de clic multi-erreurs par un simple `selectedRef.current = layer.feature.properties.ADMIN` (ou équivalent selon le champ utilisé dans le projet). Appliquer un style `fillColor: '#3b82f6'` sur le layer sélectionné.

- [ ] **Étape 6.2 — Commit**

```bash
git add src/components/multiplayer/chill/ChillPlacementInput.jsx
git commit -m "feat: add ChillPlacementInput skeleton with auto-submit logic"
```

---

## Task 7 — ChillReview.jsx

**Fichiers :**
- Créer : `src/components/multiplayer/chill/ChillReview.jsx`

**Logique de la revue :**
- `reviewStep === 0` → afficher tous les joueurs corrects (en vert) pour la manche entière
- `reviewStep >= 1` → afficher la `(reviewStep - 1)`ème mauvaise réponse de la liste `wrongAnswers`
- Quand `reviewStep > wrongAnswers.length` → afficher le bouton "Continuer"

- [ ] **Étape 7.1 — Créer le composant**

```jsx
// src/components/multiplayer/chill/ChillReview.jsx

/**
 * Revue de fin de manche.
 * Affiche d'abord tous les bons résultats, puis les mauvais un par un.
 *
 * @param {{
 *   mancheCountries: Array<string|object>,  // pays de la manche (string pour placement, feature pour les autres)
 *   mancheStartIndex: number,
 *   playerAnswers: object,                   // chillState.playerAnswers
 *   reviewStep: number,                      // chillState.reviewStep
 *   isHost: boolean,
 *   players: object,                         // room.players { [playerId]: { pseudo } }
 *   gameType: string,
 *   onNext: () => void,                      // host avance d'un pas
 *   onContinue: () => void,                  // host termine la review
 * }} props
 */
export default function ChillReview({
  mancheCountries,
  mancheStartIndex,
  playerAnswers,
  reviewStep,
  isHost,
  players,
  gameType,
  onNext,
  onContinue,
}) {
  // Construire la liste de toutes les mauvaises réponses de la manche
  const wrongAnswers = mancheCountries.flatMap((country, i) => {
    const idx = mancheStartIndex + i
    const countryName = typeof country === 'string' ? country : country.ADMIN
    return Object.entries(players)
      .filter(([pid]) => {
        const ans = playerAnswers?.[pid]?.[String(idx)]
        return ans !== undefined && ans !== null && !ans.correct
      })
      .map(([pid]) => ({
        pid,
        pseudo: players[pid].pseudo,
        country,
        countryName,
        answer: playerAnswers[pid][String(idx)],
      }))
  })

  // Construire la synthèse des bons résultats (step 0)
  const correctSummary = Object.entries(players).map(([pid, p]) => {
    const correctCount = mancheCountries.filter((_, i) => {
      const idx = mancheStartIndex + i
      return playerAnswers?.[pid]?.[String(idx)]?.correct === true
    }).length
    return { pid, pseudo: p.pseudo, correctCount, total: mancheCountries.length }
  }).sort((a, b) => b.correctCount - a.correctCount)

  const isAllDone = reviewStep > wrongAnswers.length

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color: '#f1f5f9', marginBottom: 16 }}>
        📋 Revue de manche — {mancheCountries.length} pays
      </h2>

      {reviewStep === 0 && (
        <div>
          <h3 style={{ color: '#22c55e', marginBottom: 12 }}>✓ Résultats</h3>
          {correctSummary.map(({ pid, pseudo, correctCount, total }) => (
            <div key={pid} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 14px', borderRadius: 8, marginBottom: 6,
              background: correctCount === total ? '#166534' : '#1e293b',
            }}>
              <span style={{ color: '#f1f5f9' }}>{pseudo}</span>
              <span style={{ color: correctCount === total ? '#86efac' : '#94a3b8' }}>
                {correctCount} / {total}
              </span>
            </div>
          ))}
          {wrongAnswers.length > 0 && isHost && (
            <button onClick={onNext} style={btnStyle('#1d4ed8')}>
              Voir les erreurs »
            </button>
          )}
          {wrongAnswers.length === 0 && isHost && (
            <button onClick={onContinue} style={btnStyle('#166534')}>
              Continuer →
            </button>
          )}
          {!isHost && (
            <p style={{ color: '#64748b', marginTop: 12 }}>En attente de l'hôte…</p>
          )}
        </div>
      )}

      {reviewStep >= 1 && !isAllDone && (() => {
        const current = wrongAnswers[reviewStep - 1]
        const correctName = typeof current.country === 'string'
          ? current.country
          : (current.country.capital ?? current.country.ADMIN)
        const givenAnswer = current.answer.answer ?? current.answer.clickedAdmin ?? '—'

        return (
          <div>
            <h3 style={{ color: '#ef4444', marginBottom: 12 }}>
              ✗ Erreur {reviewStep} / {wrongAnswers.length}
            </h3>
            <div style={{
              background: '#1e293b', borderRadius: 10, padding: '16px 20px', marginBottom: 16,
            }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>Joueur</span>
                <div style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{current.pseudo}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>Réponse donnée</span>
                <div style={{ color: '#fca5a5' }}>{givenAnswer || '(rien)'}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '0.85em' }}>Réponse correcte</span>
                <div style={{ color: '#86efac', fontWeight: 'bold' }}>{correctName}</div>
              </div>
            </div>
            {isHost && reviewStep < wrongAnswers.length && (
              <button onClick={onNext} style={btnStyle('#1d4ed8')}>
                Suivant »
              </button>
            )}
            {isHost && reviewStep === wrongAnswers.length && (
              <button onClick={onContinue} style={btnStyle('#166534')}>
                Continuer →
              </button>
            )}
            {!isHost && (
              <p style={{ color: '#64748b' }}>En attente de l'hôte…</p>
            )}
          </div>
        )
      })()}

      {isAllDone && isHost && (
        <button onClick={onContinue} style={btnStyle('#166534')}>
          Continuer →
        </button>
      )}
    </div>
  )
}

function btnStyle(bg) {
  return {
    marginTop: 16, padding: '10px 24px', borderRadius: 8,
    background: bg, color: 'white', border: 'none',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '1em',
  }
}
```

- [ ] **Étape 7.2 — Commit**

```bash
git add src/components/multiplayer/chill/ChillReview.jsx
git commit -m "feat: add ChillReview end-of-manche review component"
```

---

## Task 8 — ChillGame.jsx (orchestrateur)

**Fichiers :**
- Créer : `src/components/multiplayer/chill/ChillGame.jsx`

**Responsabilités :**
1. Initialiser `chillState` (host uniquement, une seule fois au démarrage)
2. Déclencher l'avance de tour quand `countdownEnd` est dépassé (host uniquement)
3. Soumettre la réponse locale à Firestore
4. Afficher `ChillReview` ou l'interface de jeu selon `chillState.phase`
5. En fin de partie (après la dernière review), calculer les scores et passer en `between_games`

- [ ] **Étape 8.1 — Créer le composant**

```jsx
// src/components/multiplayer/chill/ChillGame.jsx
import { useMemo, useEffect, useRef, useCallback } from 'react'
import { GAME_TYPES } from '../../../utils/gameTypes'
import { getSeededCountriesForGame } from '../../../utils/multiplayerSeed'
import { rankResults } from '../../../utils/multiplayerScoring'
import {
  initChillState,
  advanceChillTurn,
  submitChillAnswer,
  setChillReviewStep,
  updateRoomStatus,
  writeGameResult,
  updateTotalPoints,
} from '../../../utils/multiplayerRoom'
import {
  getCountdownMs,
  evaluateTextAnswer,
  evaluateGuessAnswer,
  evaluatePlacement,
  flattenAscensionCountries,
} from '../../../utils/chillModeUtils'
import ChillCountdown from './ChillCountdown'
import ChillTextInput from './ChillTextInput'
import ChillPlacementInput from './ChillPlacementInput'
import ChillReview from './ChillReview'

export default function ChillGame({ room, playerId, roomId }) {
  const chillState = room.chillState
  const gameIndex = room.currentGameIndex
  const gameConfig = room.config.games[gameIndex]
  const mancheSize = room.config.chillConfig?.mancheSize ?? 10
  const isHost = room.hostId === playerId
  const transitioningRef = useRef(false)

  // ─── Liste de pays avec difficulté ─────────────────────────────────────────
  const countriesWithDiff = useMemo(() => {
    const raw = getSeededCountriesForGame(gameConfig, room.seed, gameIndex)
    if (gameConfig.mode === 'ascension') {
      // raw est un objet { [diff]: countries[] }
      return flattenAscensionCountries(raw)
    }
    // raw est un tableau : placer la difficulté du gameConfig sur tous
    return (raw ?? []).map(c => ({ country: c, difficulty: gameConfig.difficulty ?? 'Moyen' }))
  }, [gameConfig, room.seed, gameIndex])

  const totalCountries = countriesWithDiff.length

  // ─── Init chillState (host, une seule fois) ────────────────────────────────
  useEffect(() => {
    if (!isHost || chillState) return
    if (!countriesWithDiff.length) return
    const countdownMs = getCountdownMs(countriesWithDiff[0].difficulty)
    initChillState(roomId, countdownMs)
  }, [isHost, chillState, roomId, countriesWithDiff])

  // ─── Fin de partie (host) ──────────────────────────────────────────────────
  const handleGameEnd = useCallback(async () => {
    if (!isHost || transitioningRef.current) return
    transitioningRef.current = true

    const activePlayers = Object.entries(room.players).filter(([, p]) => !p.disconnected)
    const results = activePlayers.map(([pid]) => {
      const answers = chillState.playerAnswers?.[pid] ?? {}
      let weightedScore = 0, countriesSolved = 0, failures = 0
      countriesWithDiff.forEach((_, idx) => {
        const ans = answers[String(idx)]
        if (ans && ans.correct) { weightedScore += ans.score; countriesSolved++ }
        else failures++
      })
      return {
        playerId: pid,
        weightedScore,
        countriesSolved,
        failures,
        attempts: failures,     // 1 tentative/pays en chill → raté = 1 erreur
        perfects: countriesSolved,
        stumbles: 0,
        elapsedTime: null,
      }
    })

    const scored = rankResults(results, activePlayers.length, 'weighted')
    await Promise.all(scored.map(r =>
      writeGameResult(roomId, gameIndex, r.playerId, r)
    ))
    await updateTotalPoints(roomId, scored.map(r => ({ playerId: r.playerId, points: r.points })))
    await updateRoomStatus(roomId, 'between_games')
  }, [isHost, room.players, chillState, countriesWithDiff, roomId, gameIndex])

  // ─── Host : avancer le tour quand le countdown se termine ─────────────────
  useEffect(() => {
    if (!isHost || !chillState || chillState.phase !== 'playing') return
    if (!chillState.countdownEnd) return

    const endMs = typeof chillState.countdownEnd.toMillis === 'function'
      ? chillState.countdownEnd.toMillis()
      : Number(chillState.countdownEnd)
    const ms = Math.max(0, endMs - Date.now())

    const id = setTimeout(async () => {
      const next = chillState.currentCountryIndex + 1
      const mancheStart = chillState.mancheStartIndex
      const isEndOfManche = (next - mancheStart) >= mancheSize || next >= totalCountries

      if (isEndOfManche) {
        // Déclencher la review (peu importe si c'est aussi la fin du jeu)
        await advanceChillTurn(roomId, 'review', next, mancheStart, null)
      } else {
        const { difficulty } = countriesWithDiff[next]
        const countdownMs = getCountdownMs(difficulty)
        await advanceChillTurn(roomId, 'playing', next, mancheStart, countdownMs)
      }
    }, ms + 300)   // 300ms de grâce pour la soumission des réponses

    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, chillState?.countdownEnd, chillState?.currentCountryIndex, chillState?.phase])

  // ─── Soumission de la réponse locale ───────────────────────────────────────
  const handleSubmitAnswer = useCallback((answerData) => {
    const idx = chillState?.currentCountryIndex
    if (idx == null) return
    // Vérifier si déjà soumis pour ce pays
    if (room.chillState?.playerAnswers?.[playerId]?.[String(idx)] != null) return
    submitChillAnswer(roomId, playerId, idx, answerData)
  }, [chillState?.currentCountryIndex, room.chillState?.playerAnswers, playerId, roomId])

  // ─── Callbacks review ──────────────────────────────────────────────────────
  const handleReviewNext = useCallback(() => {
    setChillReviewStep(roomId, (chillState?.reviewStep ?? 0) + 1)
  }, [roomId, chillState?.reviewStep])

  const handleReviewContinue = useCallback(() => {
    const next = chillState.currentCountryIndex
    if (next >= totalCountries) {
      // Fin du jeu — calculer les scores
      handleGameEnd()
    } else {
      // Prochaine manche
      const { difficulty } = countriesWithDiff[next]
      const countdownMs = getCountdownMs(difficulty)
      advanceChillTurn(roomId, 'playing', next, next, countdownMs)
    }
  }, [chillState, totalCountries, countriesWithDiff, roomId, handleGameEnd])

  // ─── Render ────────────────────────────────────────────────────────────────
  if (!chillState) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement…</div>
  }

  // Phase review
  if (chillState.phase === 'review') {
    const mancheStart = chillState.mancheStartIndex
    const mancheEnd = chillState.currentCountryIndex   // non inclus
    const mancheCountries = countriesWithDiff
      .slice(mancheStart, mancheEnd)
      .map(({ country }) => country)

    return (
      <ChillReview
        mancheCountries={mancheCountries}
        mancheStartIndex={mancheStart}
        playerAnswers={chillState.playerAnswers ?? {}}
        reviewStep={chillState.reviewStep ?? 0}
        isHost={isHost}
        players={room.players}
        gameType={gameConfig.type}
        onNext={handleReviewNext}
        onContinue={handleReviewContinue}
      />
    )
  }

  // Phase playing
  const { country: currentCountry, difficulty } = countriesWithDiff[chillState.currentCountryIndex] ?? {}
  if (!currentCountry) return null

  const alreadyAnswered = room.chillState?.playerAnswers?.[playerId]?.[String(chillState.currentCountryIndex)] != null
  const countdownMs = getCountdownMs(difficulty)

  const renderInput = () => {
    if (gameConfig.type === GAME_TYPES.PLACEMENT) {
      const targetName = typeof currentCountry === 'string' ? currentCountry : currentCountry.ADMIN
      return (
        <ChillPlacementInput
          targetName={targetName}
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          onSubmit={(clickedAdmin) => {
            const evalResult = evaluatePlacement(clickedAdmin, targetName, difficulty)
            handleSubmitAnswer({ clickedAdmin, ...evalResult })
          }}
        />
      )
    }

    if (gameConfig.type === GAME_TYPES.FLAGS) {
      const target = currentCountry.ADMIN
      const aliases = currentCountry.aliases ?? []
      return (
        <ChillTextInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          placeholder="Nom du pays…"
          onSubmit={(answer) => {
            const evalResult = evaluateTextAnswer(answer, target, aliases, difficulty)
            handleSubmitAnswer({ answer, ...evalResult })
          }}
        />
      )
    }

    if (gameConfig.type === GAME_TYPES.CAPITALS) {
      const target = currentCountry.capital ?? ''
      const aliases = currentCountry.capitalAliases ?? []
      return (
        <ChillTextInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          placeholder="Nom de la capitale…"
          onSubmit={(answer) => {
            const evalResult = evaluateTextAnswer(answer, target, aliases, difficulty)
            handleSubmitAnswer({ answer, ...evalResult })
          }}
        />
      )
    }

    if (gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE) {
      const target = currentCountry.ADMIN
      const aliases = currentCountry.aliases ?? []
      return (
        <ChillTextInput
          countdownEnd={chillState.countdownEnd}
          locked={alreadyAnswered}
          placeholder="Nom du pays…"
          onSubmit={(answer) => {
            const evalResult = evaluateGuessAnswer(answer, target, aliases)
            handleSubmitAnswer({ answer, ...evalResult })
          }}
        />
      )
    }

    return <div style={{ color: '#ef4444' }}>Type de jeu non supporté en mode chill.</div>
  }

  const progress = `${chillState.currentCountryIndex + 1} / ${totalCountries}`

  return (
    <div style={{ padding: '16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: 8, fontSize: '0.85em' }}>
        <span>Pays {progress}</span>
        <span>Manche : {chillState.currentCountryIndex - chillState.mancheStartIndex + 1} / {mancheSize}</span>
      </div>
      <ChillCountdown countdownEnd={chillState.countdownEnd} totalMs={countdownMs} />
      <div style={{ marginTop: 16 }}>
        {renderInput()}
      </div>
      {alreadyAnswered && (
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: 12, fontSize: '0.9em' }}>
          ✓ Réponse envoyée — en attente des autres joueurs…
        </p>
      )}
    </div>
  )
}
```

- [ ] **Étape 8.2 — Commit**

```bash
git add src/components/multiplayer/chill/ChillGame.jsx
git commit -m "feat: add ChillGame orchestrator for synchronized chill turns"
```

---

## Task 9 — MultiplayerRoomPage.jsx : brancher vers ChillGame

**Fichiers :**
- Modifier : `src/pages/multiplayer/MultiplayerRoomPage.jsx`

- [ ] **Étape 9.1 — Ajouter l'import ChillGame**

Après la ligne 7 (`import MultiplayerGame …`) :

```jsx
import ChillGame from '../../components/multiplayer/chill/ChillGame'
```

- [ ] **Étape 9.2 — Modifier le bloc `room.status === 'playing'` (lignes 56–69)**

Remplacer :

```jsx
if (room.status === 'playing') {
  const showCountdown = room.startAt && !gameStarted
  return (
    <div className="mp-room mp-room--playing">
      <NavBar />
      {showCountdown && (
        <CountdownOverlay startAt={room.startAt} onStart={() => setGameStarted(true)} />
      )}
      {gameStarted && (
        <MultiplayerGame room={room} progress={progress} playerId={playerId} roomId={roomId} />
      )}
    </div>
  )
}
```

Par :

```jsx
if (room.status === 'playing') {
  const isChill = !!room.config?.chillConfig
  const showCountdown = room.startAt && !gameStarted
  return (
    <div className="mp-room mp-room--playing">
      <NavBar />
      {showCountdown && (
        <CountdownOverlay startAt={room.startAt} onStart={() => setGameStarted(true)} />
      )}
      {gameStarted && isChill && (
        <ChillGame room={room} playerId={playerId} roomId={roomId} />
      )}
      {gameStarted && !isChill && (
        <MultiplayerGame room={room} progress={progress} playerId={playerId} roomId={roomId} />
      )}
    </div>
  )
}
```

- [ ] **Étape 9.3 — Tester manuellement le flux complet**

1. `npm run dev`
2. Créer une room avec "Mode Chill" activé, 2 joueurs (2 onglets)
3. Vérifier : countdown affiché, les 2 joueurs voient le même pays
4. Soumettre une réponse → vérifier dans Firestore que `playerAnswers` se remplit
5. Attendre la fin du chrono → le pays suivant apparaît
6. Après N pays (mancheSize) → la review apparaît
7. L'hôte navigue dans la review (Suivant / Continuer)
8. À la fin de la partie → `BetweenGamesScreen` s'affiche avec les scores

- [ ] **Étape 9.4 — Commit final**

```bash
git add src/pages/multiplayer/MultiplayerRoomPage.jsx
git commit -m "feat: route to ChillGame for chill multiplayer rooms"
```

---

## Notes pour l'implémenteur

**ChillPlacementInput (Task 6) :** C'est la tâche la plus complexe car elle dépend de l'API Leaflet interne de `GamePage.jsx`. Commencer par lire entièrement `src/pages/GamePage.jsx` et `src/hooks/useGameState.js` pour comprendre comment la carte est initialisée et comment les clics de pays sont détectés.

**Ascension mode :** `flattenAscensionCountries` est implémenté et utilisé dans `ChillGame.jsx`. La logique de difficulty par pays fonctionne automatiquement. Tester en créant une room chill avec un jeu en mode Ascension.

**Modes hors scope :** RANKING n'est pas dans `GAME_META` du multijoueur → pas concerné. Mode chill solo → hors scope.

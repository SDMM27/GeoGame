# Multiplayer — Plan 1 : Infrastructure & Lobby

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un host de créer une room multijoueur, la configurer (jeux + difficulté/ascension), partager un lien, que des joueurs rejoignent avec un pseudo, et démarrer une partie synchronisée avec un countdown — jusqu'à l'écran placeholder "Jeu en cours" (les vrais jeux arrivent en Plan 2).

**Architecture:** Firestore avec `onSnapshot` pour la synchronisation temps réel. L'état de la room (`lobby → playing → ...`) est stocké dans `rooms/{roomId}`. Un `playerId` UUID est généré côté client et persisté en `sessionStorage`. Le countdown est synchronisé via un `startAt: Timestamp` écrit par le host.

**Tech Stack:** React 18, Vite, Vitest, Firebase Firestore v9, react-router-dom v6

---

## File Structure

### Créer
| Fichier | Responsabilité |
|---------|---------------|
| `src/utils/prng.js` | PRNG déterministe mulberry32 + seededShuffle |
| `src/utils/prng.test.js` | Tests unitaires PRNG |
| `src/utils/multiplayerScoring.js` | Calcul des rangs et points par partie |
| `src/utils/multiplayerScoring.test.js` | Tests unitaires scoring |
| `src/utils/multiplayerRoom.js` | CRUD Firestore pour rooms (createRoom, joinRoom, launchRoom…) |
| `src/hooks/useMultiplayerRoom.js` | Hook onSnapshot room + progress |
| `src/components/multiplayer/RoomConfig.jsx` | UI de configuration des jeux (host) |
| `src/components/multiplayer/RoomConfig.css` | Styles RoomConfig |
| `src/components/multiplayer/LobbyScreen.jsx` | Salle d'attente (liste joueurs, bouton lancer) |
| `src/components/multiplayer/LobbyScreen.css` | Styles LobbyScreen |
| `src/components/multiplayer/CountdownOverlay.jsx` | Overlay countdown synchronisé 5…1 |
| `src/components/multiplayer/CountdownOverlay.css` | Styles CountdownOverlay |
| `src/pages/multiplayer/MultiplayerHomePage.jsx` | `/multiplayer` : créer ou rejoindre |
| `src/pages/multiplayer/MultiplayerHomePage.css` | Styles MultiplayerHomePage |
| `src/pages/multiplayer/MultiplayerCreatePage.jsx` | `/multiplayer/create` : config + création room |
| `src/pages/multiplayer/MultiplayerCreatePage.css` | Styles MultiplayerCreatePage |
| `src/pages/multiplayer/MultiplayerRoomPage.jsx` | `/multiplayer/room/:roomId` : orchestrateur session |
| `src/pages/multiplayer/MultiplayerRoomPage.css` | Styles MultiplayerRoomPage |

### Modifier
| Fichier | Changement |
|---------|-----------|
| `src/App.jsx` | Ajouter 3 routes `/multiplayer`, `/multiplayer/create`, `/multiplayer/room/:roomId` |
| `src/components/NavBar.jsx` | Ajouter lien "Multijoueur" |
| `src/hooks/useBorderGuessState.js` | Exporter `BORDER_GUESS_COUNTRY_COUNT` |
| `src/hooks/useCountryClueState.js` | Exporter `COUNTRY_CLUE_COUNTRY_COUNT` |

---

## Task 1 : PRNG utility

**Files:**
- Create: `src/utils/prng.js`
- Create: `src/utils/prng.test.js`

- [ ] **Step 1.1 : Écrire les tests**

```js
// src/utils/prng.test.js
import { describe, it, expect } from 'vitest'
import { mulberry32, seededShuffle } from './prng'

describe('mulberry32', () => {
  it('produces deterministic output for the same seed', () => {
    const r1 = mulberry32(42)
    const r2 = mulberry32(42)
    expect(r1()).toBe(r2())
    expect(r1()).toBe(r2())
  })

  it('produces different output for different seeds', () => {
    expect(mulberry32(42)()).not.toBe(mulberry32(43)())
  })

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(12345)
    for (let i = 0; i < 100; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('seededShuffle', () => {
  it('returns an array of the same length', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 1)).toHaveLength(5)
  })

  it('contains the same elements', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 1).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('produces the same shuffle for the same seed', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(seededShuffle(arr, 99)).toEqual(seededShuffle(arr, 99))
  })

  it('produces different shuffles for different seeds', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(seededShuffle(arr, 1)).not.toEqual(seededShuffle(arr, 2))
  })

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3, 4, 5]
    seededShuffle(arr, 1)
    expect(arr).toEqual([1, 2, 3, 4, 5])
  })
})
```

- [ ] **Step 1.2 : Vérifier que les tests échouent**

```bash
npx vitest run src/utils/prng.test.js
```
Attendu : `FAIL` — `Cannot find module './prng'`

- [ ] **Step 1.3 : Implémenter**

```js
// src/utils/prng.js

/**
 * mulberry32 — PRNG 32-bit déterministe.
 * Retourne une fonction générant des floats dans [0, 1).
 */
export function mulberry32(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

/**
 * Fisher-Yates shuffle avec PRNG seedé.
 * Ne mute pas le tableau original.
 */
export function seededShuffle(array, seed) {
  const arr = [...array]
  const random = mulberry32(seed)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
```

- [ ] **Step 1.4 : Vérifier que les tests passent**

```bash
npx vitest run src/utils/prng.test.js
```
Attendu : `PASS` — 8 tests

- [ ] **Step 1.5 : Commit**

```bash
git add src/utils/prng.js src/utils/prng.test.js
git commit -m "feat: add deterministic PRNG and seededShuffle utility"
```

---

## Task 2 : Multiplayer scoring utility

**Files:**
- Create: `src/utils/multiplayerScoring.js`
- Create: `src/utils/multiplayerScoring.test.js`

- [ ] **Step 2.1 : Écrire les tests**

```js
// src/utils/multiplayerScoring.test.js
import { describe, it, expect } from 'vitest'
import { rankResults, aggregatePoints } from './multiplayerScoring'

describe('rankResults', () => {
  it('ranks by attempts ascending', () => {
    const results = [
      { playerId: 'b', attempts: 5, elapsedTime: 10000 },
      { playerId: 'a', attempts: 3, elapsedTime: 20000 },
    ]
    const ranked = rankResults(results, 2)
    expect(ranked[0].playerId).toBe('a')
    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].points).toBe(2)
    expect(ranked[1].playerId).toBe('b')
    expect(ranked[1].rank).toBe(2)
    expect(ranked[1].points).toBe(1)
  })

  it('breaks ties by elapsedTime ascending', () => {
    const results = [
      { playerId: 'b', attempts: 3, elapsedTime: 15000 },
      { playerId: 'a', attempts: 3, elapsedTime: 10000 },
    ]
    expect(rankResults(results, 2)[0].playerId).toBe('a')
  })

  it('treats missing elapsedTime as Infinity (last)', () => {
    const results = [
      { playerId: 'b', attempts: 3, elapsedTime: undefined },
      { playerId: 'a', attempts: 3, elapsedTime: 5000 },
    ]
    expect(rankResults(results, 2)[0].playerId).toBe('a')
  })

  it('assigns N points to 1st for N players', () => {
    const results = [
      { playerId: 'a', attempts: 1, elapsedTime: 1000 },
      { playerId: 'b', attempts: 2, elapsedTime: 2000 },
      { playerId: 'c', attempts: 3, elapsedTime: 3000 },
    ]
    expect(rankResults(results, 3).map(r => r.points)).toEqual([3, 2, 1])
  })

  it('does not mutate the input array', () => {
    const results = [
      { playerId: 'b', attempts: 5, elapsedTime: 10000 },
      { playerId: 'a', attempts: 3, elapsedTime: 5000 },
    ]
    rankResults(results, 2)
    expect(results[0].playerId).toBe('b')
  })
})

describe('aggregatePoints', () => {
  it('sums points across games per player', () => {
    const gameResults = [
      { playerId: 'a', gameIndex: 0, points: 3 },
      { playerId: 'b', gameIndex: 0, points: 2 },
      { playerId: 'a', gameIndex: 1, points: 2 },
      { playerId: 'b', gameIndex: 1, points: 3 },
    ]
    const totals = aggregatePoints(gameResults)
    expect(totals['a']).toBe(5)
    expect(totals['b']).toBe(5)
  })

  it('returns empty object for no results', () => {
    expect(aggregatePoints([])).toEqual({})
  })
})
```

- [ ] **Step 2.2 : Vérifier que les tests échouent**

```bash
npx vitest run src/utils/multiplayerScoring.test.js
```
Attendu : `FAIL` — `Cannot find module './multiplayerScoring'`

- [ ] **Step 2.3 : Implémenter**

```js
// src/utils/multiplayerScoring.js

/**
 * Classe les résultats d'un jeu et attribue les points.
 * Tri : attempts ASC, puis elapsedTime ASC.
 * Points : 1er → totalPlayers pts, dernier → 1 pt.
 *
 * @param {Array<{playerId: string, attempts: number, elapsedTime: number}>} results
 * @param {number} totalPlayers - nombre de joueurs actifs (non déconnectés)
 * @returns {Array<{playerId, attempts, elapsedTime, rank, points}>}
 */
export function rankResults(results, totalPlayers) {
  const sorted = [...results].sort((a, b) => {
    if (a.attempts !== b.attempts) return a.attempts - b.attempts
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })
  return sorted.map((result, index) => ({
    ...result,
    rank: index + 1,
    points: totalPlayers - index,
  }))
}

/**
 * Agrège les points de tous les jeux pour chaque joueur.
 *
 * @param {Array<{playerId: string, gameIndex: number, points: number}>} allGameResults
 * @returns {Object} { [playerId]: totalPoints }
 */
export function aggregatePoints(allGameResults) {
  return allGameResults.reduce((acc, result) => {
    acc[result.playerId] = (acc[result.playerId] ?? 0) + result.points
    return acc
  }, {})
}
```

- [ ] **Step 2.4 : Vérifier que les tests passent**

```bash
npx vitest run src/utils/multiplayerScoring.test.js
```
Attendu : `PASS` — 7 tests

- [ ] **Step 2.5 : Commit**

```bash
git add src/utils/multiplayerScoring.js src/utils/multiplayerScoring.test.js
git commit -m "feat: add multiplayer ranking and points aggregation utility"
```

---

## Task 3 : Firestore room utilities

**Files:**
- Create: `src/utils/multiplayerRoom.js`

- [ ] **Step 3.1 : Créer le fichier**

```js
// src/utils/multiplayerRoom.js
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '../Firebase'

/** Génère un code de room lisible de 6 caractères (sans ambiguïtés O/0/I/1). */
export function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/** UUID stable par onglet, persisté en sessionStorage. */
export function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('mp_player_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('mp_player_id', id)
  }
  return id
}

/**
 * Crée une room dans Firestore et retourne le roomId.
 * @param {{ hostId: string, hostPseudo: string, config: object }} params
 */
export async function createRoom({ hostId, hostPseudo, config }) {
  const roomId = generateRoomId()
  const seed = Math.floor(Math.random() * 2 ** 31)
  await setDoc(doc(firestore, 'rooms', roomId), {
    hostId,
    status: 'lobby',
    currentGameIndex: 0,
    config,
    seed,
    startAt: null,
    players: {
      [hostId]: { pseudo: hostPseudo, totalPoints: 0, disconnected: false },
    },
    createdAt: serverTimestamp(),
  })
  return roomId
}

/** Ajoute un joueur dans la room. */
export async function joinRoom({ roomId, playerId, pseudo }) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    [`players.${playerId}`]: { pseudo, totalPoints: 0, disconnected: false },
  })
}

/** Le host lance la partie : startAt = maintenant + 5s, status = 'playing'. */
export async function launchRoom(roomId) {
  const startAt = Timestamp.fromDate(new Date(Date.now() + 5000))
  await updateDoc(doc(firestore, 'rooms', roomId), {
    status: 'playing',
    startAt,
  })
}

/** Met à jour le status de la room + champs optionnels supplémentaires. */
export async function updateRoomStatus(roomId, status, extra = {}) {
  await updateDoc(doc(firestore, 'rooms', roomId), { status, ...extra })
}

/** Met à jour la progression d'un joueur pour le jeu en cours. */
export async function updatePlayerProgress(roomId, playerId, progressData) {
  await setDoc(
    doc(firestore, 'rooms', roomId, 'progress', playerId),
    progressData,
    { merge: true }
  )
}

/**
 * Écrit le résultat d'un joueur pour un jeu donné.
 * Clé : `{gameIndex}_{playerId}` pour garantir l'unicité.
 */
export async function writeGameResult(roomId, gameIndex, playerId, resultData) {
  await setDoc(
    doc(firestore, 'rooms', roomId, 'gameResults', `${gameIndex}_${playerId}`),
    { playerId, gameIndex, ...resultData }
  )
}

/** Marque un joueur comme déconnecté. */
export async function markDisconnected(roomId, playerId) {
  await updateDoc(doc(firestore, 'rooms', roomId), {
    [`players.${playerId}.disconnected`]: true,
  })
}

/** Transfère le rôle de host à un autre joueur. */
export async function transferHost(roomId, newHostId) {
  await updateDoc(doc(firestore, 'rooms', roomId), { hostId: newHostId })
}
```

- [ ] **Step 3.2 : Commit**

```bash
git add src/utils/multiplayerRoom.js
git commit -m "feat: add Firestore room CRUD utilities for multiplayer"
```

---

## Task 4 : App routes + NavBar + MultiplayerHomePage

**Files:**
- Create: `src/pages/multiplayer/MultiplayerHomePage.jsx`
- Create: `src/pages/multiplayer/MultiplayerHomePage.css`
- Modify: `src/App.jsx`
- Modify: `src/components/NavBar.jsx`

- [ ] **Step 4.1 : Créer MultiplayerHomePage.jsx**

```jsx
// src/pages/multiplayer/MultiplayerHomePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import './MultiplayerHomePage.css'

export default function MultiplayerHomePage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  const handleJoin = (e) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length === 6) navigate(`/multiplayer/room/${code}`)
  }

  return (
    <div className="mp-home">
      <NavBar />
      <main className="mp-home-main">
        <h1 className="mp-home-title">Multijoueur</h1>
        <div className="mp-home-cards">
          <button
            className="mp-card mp-card--create"
            onClick={() => navigate('/multiplayer/create')}
          >
            <span className="mp-card-icon">🎮</span>
            <span className="mp-card-label">Créer une partie</span>
          </button>
          <div className="mp-card mp-card--join">
            <span className="mp-card-icon">🔗</span>
            <span className="mp-card-label">Rejoindre</span>
            <form onSubmit={handleJoin} className="mp-join-form">
              <input
                className="mp-join-input"
                placeholder="Code (ex: AB3K7Z)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
              <button
                type="submit"
                className="mp-join-btn"
                disabled={joinCode.trim().length !== 6}
              >
                Rejoindre
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4.2 : Créer MultiplayerHomePage.css**

```css
/* src/pages/multiplayer/MultiplayerHomePage.css */
.mp-home { min-height: 100vh; background: var(--bg-dark, #0f172a); color: #f1f5f9; }
.mp-home-main { max-width: 600px; margin: 0 auto; padding: 3rem 1rem; }
.mp-home-title { font-size: 2rem; font-weight: 700; margin-bottom: 2rem; text-align: center; }
.mp-home-cards { display: flex; flex-direction: column; gap: 1rem; }
.mp-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; cursor: pointer; transition: border-color 0.2s; }
.mp-card:hover { border-color: #00d4ff; }
.mp-card--create { text-align: center; }
.mp-card-icon { font-size: 2rem; }
.mp-card-label { font-size: 1.1rem; font-weight: 600; }
.mp-join-form { display: flex; gap: 0.5rem; width: 100%; }
.mp-join-input { flex: 1; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f1f5f9; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.15em; }
.mp-join-btn { padding: 0.5rem 1rem; border-radius: 8px; background: #00d4ff; color: #0f172a; font-weight: 600; border: none; cursor: pointer; }
.mp-join-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 4.3 : Mettre à jour NavBar.jsx**

```jsx
// src/components/NavBar.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import './NavBar.css'

export default function NavBar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        GEO<span className="navbar-logo-accent">GAME</span>
      </Link>
      <Link to="/multiplayer" className="navbar-mp-link">
        Multijoueur
      </Link>
    </nav>
  )
}
```

Ajouter dans `src/components/NavBar.css` (à la fin du fichier) :
```css
.navbar-mp-link { color: #00d4ff; text-decoration: none; font-weight: 600; font-size: 0.9rem; margin-left: auto; }
.navbar-mp-link:hover { text-decoration: underline; }
```

- [ ] **Step 4.4 : Ajouter la route `/multiplayer` dans App.jsx**

Dans `src/App.jsx`, ajouter l'import :
```jsx
import MultiplayerHomePage from './pages/multiplayer/MultiplayerHomePage'
```

Dans `<Routes>`, ajouter après la route `/scores` :
```jsx
<Route path="/multiplayer" element={<MultiplayerHomePage />} />
```

> Note : les routes `/multiplayer/create` et `/multiplayer/room/:roomId` seront ajoutées dans leurs tâches respectives (Task 5 et Task 9) pour éviter d'importer des fichiers qui n'existent pas encore.

- [ ] **Step 4.5 : Commit**

```bash
git add src/pages/multiplayer/MultiplayerHomePage.jsx src/pages/multiplayer/MultiplayerHomePage.css src/components/NavBar.jsx src/components/NavBar.css src/App.jsx
git commit -m "feat: add multiplayer home page and /multiplayer route"
```

---

## Task 5 : Export country counts + RoomConfig + MultiplayerCreatePage

**Files:**
- Modify: `src/hooks/useBorderGuessState.js`
- Modify: `src/hooks/useCountryClueState.js`
- Create: `src/components/multiplayer/RoomConfig.jsx`
- Create: `src/components/multiplayer/RoomConfig.css`
- Create: `src/pages/multiplayer/MultiplayerCreatePage.jsx`
- Create: `src/pages/multiplayer/MultiplayerCreatePage.css`

- [ ] **Step 5.1 : Exporter BORDER_GUESS_COUNTRY_COUNT depuis useBorderGuessState.js**

Dans `src/hooks/useBorderGuessState.js`, après la définition de `BORDER_GUESS_COUNTRIES` (ligne ~34), ajouter :
```js
export const BORDER_GUESS_COUNTRY_COUNT = BORDER_GUESS_COUNTRIES.length
```

- [ ] **Step 5.2 : Exporter COUNTRY_CLUE_COUNTRY_COUNT depuis useCountryClueState.js**

Dans `src/hooks/useCountryClueState.js`, après la définition de `COUNTRY_CLUE_COUNTRIES` (ligne ~13), ajouter :
```js
export const COUNTRY_CLUE_COUNTRY_COUNT = COUNTRY_CLUE_COUNTRIES.length
```

- [ ] **Step 5.3 : Créer RoomConfig.jsx**

```jsx
// src/components/multiplayer/RoomConfig.jsx
import React, { useState } from 'react'
import { GAME_TYPES } from '../../utils/gameTypes'
import { ASCENSION_PRESETS, matchPreset } from '../../utils/ascensionPresets'
import { getTotalCountries } from '../../hooks/useGameState'
import { getTotalFlagCountries } from '../../hooks/useFlagGameState'
import { getTotalCapitalCountries } from '../../hooks/useCapitalsGameState'
import { BORDER_GUESS_COUNTRY_COUNT } from '../../hooks/useBorderGuessState'
import { COUNTRY_CLUE_COUNTRY_COUNT } from '../../hooks/useCountryClueState'
import './RoomConfig.css'

const GAME_META = {
  [GAME_TYPES.PLACEMENT]:    { label: 'Trouve le Pays',    icon: '🌍', hasMode: true },
  [GAME_TYPES.FLAGS]:        { label: 'Trouve le Drapeau', icon: '🚩', hasMode: true },
  [GAME_TYPES.CAPITALS]:     { label: 'Trouve la Capitale',icon: '🏛️', hasMode: true },
  [GAME_TYPES.BORDER_GUESS]: { label: 'BorderGuess',       icon: '🧭', hasMode: false },
  [GAME_TYPES.COUNTRY_CLUE]: { label: 'Country Clue',      icon: '🔎', hasMode: false },
}

const DIFFICULTIES = ['Facile', 'Moyen', 'Difficile', 'Impossible', 'Hardcore']
const ASCENSION_DIFFS = ['Facile', 'Moyen', 'Difficile', 'Impossible']
const DIFFICULTY_COLORS = {
  Facile: '#4ade80', Moyen: '#00d4ff', Difficile: '#fbbf24',
  Impossible: '#f97316', Hardcore: '#f87171',
}

function getCountFn(type) {
  if (type === GAME_TYPES.FLAGS) return getTotalFlagCountries
  if (type === GAME_TYPES.CAPITALS) return getTotalCapitalCountries
  return getTotalCountries
}

function getCaps(type) {
  const fn = getCountFn(type)
  return Object.fromEntries(ASCENSION_DIFFS.map(d => [d, fn(d)]))
}

function defaultGame(type) {
  if (type === GAME_TYPES.BORDER_GUESS || type === GAME_TYPES.COUNTRY_CLUE) {
    return { type, countryCount: 10 }
  }
  return {
    type,
    mode: 'standard',
    difficulty: 'Moyen',
    phases: { Facile: 15, Moyen: 10, Difficile: 5, Impossible: 1 },
  }
}

function GameSettings({ game, onChange }) {
  const meta = GAME_META[game.type]

  if (!meta.hasMode) {
    const maxCount = game.type === GAME_TYPES.BORDER_GUESS
      ? BORDER_GUESS_COUNTRY_COUNT
      : COUNTRY_CLUE_COUNTRY_COUNT
    return (
      <div className="rc-game-settings">
        <label className="rc-slider-label">
          <span>Nombre de pays : <strong>{game.countryCount}</strong></span>
          <input
            type="range"
            min={1}
            max={maxCount}
            value={game.countryCount}
            onChange={e => onChange({ ...game, countryCount: Number(e.target.value) })}
          />
        </label>
      </div>
    )
  }

  const countFn = getCountFn(game.type)
  const caps = getCaps(game.type)
  const detectedPreset = matchPreset(game.phases ?? {})

  const handlePreset = (preset) => {
    const nextPhases = Object.fromEntries(
      ASCENSION_DIFFS.map(d => [d, Math.min(preset.phases[d] ?? 0, caps[d] ?? 0)])
    )
    onChange({ ...game, phases: nextPhases })
  }

  const handleSlider = (d, val) => {
    onChange({ ...game, phases: { ...game.phases, [d]: Number(val) } })
  }

  return (
    <div className="rc-game-settings">
      <div className="rc-mode-tabs">
        <button
          type="button"
          className={`rc-mode-tab${game.mode === 'standard' ? ' active' : ''}`}
          onClick={() => onChange({ ...game, mode: 'standard' })}
        >Standard</button>
        <button
          type="button"
          className={`rc-mode-tab${game.mode === 'ascension' ? ' active' : ''}`}
          onClick={() => onChange({ ...game, mode: 'ascension' })}
        >🚀 Ascension</button>
      </div>

      {game.mode === 'standard' ? (
        <div className="rc-difficulties">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              type="button"
              className={`rc-diff-btn${game.difficulty === d ? ' active' : ''}`}
              style={{ '--diff-color': DIFFICULTY_COLORS[d] }}
              onClick={() => onChange({ ...game, difficulty: d })}
            >
              <span style={{ color: DIFFICULTY_COLORS[d] }}>
                {d === 'Hardcore' ? '💀 Hardcore' : d}
              </span>
              <span className="rc-diff-count">
                {d === 'Hardcore' ? 'Tous' : countFn(d)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rc-ascension">
          <div className="rc-presets">
            {ASCENSION_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                className={`rc-preset${detectedPreset === p.name ? ' active' : ''}`}
                onClick={() => handlePreset(p)}
              >{p.icon} {p.name}</button>
            ))}
          </div>
          {ASCENSION_DIFFS.map(d => (
            <label key={d} className="rc-asc-row">
              <span style={{ color: DIFFICULTY_COLORS[d] }}>{d}</span>
              <span className="rc-asc-val">{game.phases?.[d] ?? 0} / {caps[d]}</span>
              <input
                type="range"
                min={0}
                max={caps[d]}
                value={game.phases?.[d] ?? 0}
                onChange={e => handleSlider(d, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RoomConfig({ onSubmit, submitting }) {
  const [pseudo, setPseudo] = useState('')
  const [games, setGames] = useState([defaultGame(GAME_TYPES.PLACEMENT)])

  const usedTypes = new Set(games.map(g => g.type))
  const availableToAdd = Object.keys(GAME_META).filter(t => !usedTypes.has(t))

  const addGame = (type) => setGames(prev => [...prev, defaultGame(type)])
  const removeGame = (i) => setGames(prev => prev.filter((_, idx) => idx !== i))

  const moveUp = (i) => setGames(prev => {
    if (i === 0) return prev
    const arr = [...prev]
    ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
    return arr
  })

  const moveDown = (i) => setGames(prev => {
    if (i === prev.length - 1) return prev
    const arr = [...prev]
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    return arr
  })

  const updateGame = (i, updated) =>
    setGames(prev => prev.map((g, idx) => (idx === i ? updated : g)))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!pseudo.trim() || games.length === 0) return
    onSubmit({ pseudo: pseudo.trim(), config: { games } })
  }

  return (
    <form className="room-config" onSubmit={handleSubmit}>
      <h2 className="rc-title">Configurer la partie</h2>

      <div className="rc-pseudo">
        <label htmlFor="rc-pseudo-input">Ton pseudo</label>
        <input
          id="rc-pseudo-input"
          value={pseudo}
          onChange={e => setPseudo(e.target.value)}
          placeholder="Pseudo"
          maxLength={20}
          required
        />
      </div>

      <div className="rc-games">
        <h3 className="rc-games-title">Jeux ({games.length})</h3>
        {games.map((game, i) => {
          const meta = GAME_META[game.type]
          return (
            <div key={game.type} className="rc-game">
              <div className="rc-game-header">
                <span className="rc-game-label">{meta.icon} {meta.label}</span>
                <div className="rc-game-actions">
                  <button type="button" onClick={() => moveUp(i)} disabled={i === 0} aria-label="Monter">↑</button>
                  <button type="button" onClick={() => moveDown(i)} disabled={i === games.length - 1} aria-label="Descendre">↓</button>
                  <button type="button" onClick={() => removeGame(i)} disabled={games.length === 1} aria-label="Supprimer">✕</button>
                </div>
              </div>
              <GameSettings game={game} onChange={updated => updateGame(i, updated)} />
            </div>
          )
        })}

        {availableToAdd.length > 0 && (
          <div className="rc-add-games">
            <span className="rc-add-label">Ajouter un jeu :</span>
            {availableToAdd.map(type => {
              const meta = GAME_META[type]
              return (
                <button key={type} type="button" className="rc-add-btn" onClick={() => addGame(type)}>
                  + {meta.icon} {meta.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rc-submit"
        disabled={!pseudo.trim() || games.length === 0 || submitting}
      >
        {submitting ? 'Création en cours...' : 'Créer la partie'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5.4 : Créer RoomConfig.css**

```css
/* src/components/multiplayer/RoomConfig.css */
.room-config { max-width: 640px; margin: 0 auto; padding: 2rem 1rem; color: #f1f5f9; }
.rc-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem; }
.rc-pseudo { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
.rc-pseudo label { font-weight: 600; color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
.rc-pseudo input { padding: 0.6rem 0.9rem; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #f1f5f9; font-size: 1rem; }
.rc-games-title { font-size: 1rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
.rc-game { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
.rc-game-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.rc-game-label { font-weight: 600; font-size: 1rem; }
.rc-game-actions { display: flex; gap: 0.4rem; }
.rc-game-actions button { padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #94a3b8; cursor: pointer; font-size: 0.85rem; }
.rc-game-actions button:disabled { opacity: 0.3; cursor: not-allowed; }
.rc-mode-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.rc-mode-tab { padding: 0.35rem 0.75rem; border-radius: 20px; border: 1px solid #475569; background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.85rem; }
.rc-mode-tab.active { background: #00d4ff22; border-color: #00d4ff; color: #00d4ff; }
.rc-difficulties { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.rc-diff-btn { padding: 0.4rem 0.75rem; border-radius: 8px; border: 1px solid #334155; background: #0f172a; cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 80px; }
.rc-diff-btn.active { border-color: currentColor; background: #ffffff11; }
.rc-diff-count { font-size: 0.75rem; color: #64748b; }
.rc-ascension { display: flex; flex-direction: column; gap: 0.5rem; }
.rc-presets { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
.rc-preset { padding: 0.3rem 0.6rem; border-radius: 6px; border: 1px solid #334155; background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.8rem; }
.rc-preset.active { border-color: #00d4ff; color: #00d4ff; background: #00d4ff11; }
.rc-asc-row { display: grid; grid-template-columns: 100px 60px 1fr; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
.rc-asc-val { text-align: right; color: #64748b; font-size: 0.8rem; }
.rc-slider-label { display: flex; flex-direction: column; gap: 0.4rem; }
.rc-game-settings { margin-top: 0.5rem; }
.rc-add-games { margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.rc-add-label { font-size: 0.85rem; color: #64748b; }
.rc-add-btn { padding: 0.35rem 0.65rem; border-radius: 8px; border: 1px dashed #475569; background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.85rem; }
.rc-add-btn:hover { border-color: #00d4ff; color: #00d4ff; }
.rc-submit { width: 100%; padding: 0.85rem; margin-top: 1.5rem; border-radius: 10px; border: none; background: #00d4ff; color: #0f172a; font-size: 1rem; font-weight: 700; cursor: pointer; }
.rc-submit:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 5.5 : Créer MultiplayerCreatePage.jsx**

```jsx
// src/pages/multiplayer/MultiplayerCreatePage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import RoomConfig from '../../components/multiplayer/RoomConfig'
import { createRoom, getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerCreatePage.css'

export default function MultiplayerCreatePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async ({ pseudo, config }) => {
    setSubmitting(true)
    try {
      const playerId = getOrCreatePlayerId()
      const roomId = await createRoom({ hostId: playerId, hostPseudo: pseudo, config })
      navigate(`/multiplayer/room/${roomId}`)
    } catch (err) {
      console.error('Erreur création room :', err)
      setSubmitting(false)
    }
  }

  return (
    <div className="mp-create">
      <NavBar />
      <RoomConfig onSubmit={handleSubmit} submitting={submitting} />
    </div>
  )
}
```

- [ ] **Step 5.6 : Créer MultiplayerCreatePage.css**

```css
/* src/pages/multiplayer/MultiplayerCreatePage.css */
.mp-create { min-height: 100vh; background: var(--bg-dark, #0f172a); }
```

- [ ] **Step 5.7 : Ajouter la route `/multiplayer/create` dans App.jsx**

Ajouter l'import dans `src/App.jsx` :
```jsx
import MultiplayerCreatePage from './pages/multiplayer/MultiplayerCreatePage'
```

Ajouter la route après `/multiplayer` :
```jsx
<Route path="/multiplayer/create" element={<MultiplayerCreatePage />} />
```

- [ ] **Step 5.8 : Commit**

```bash
git add src/hooks/useBorderGuessState.js src/hooks/useCountryClueState.js src/components/multiplayer/RoomConfig.jsx src/components/multiplayer/RoomConfig.css src/pages/multiplayer/MultiplayerCreatePage.jsx src/pages/multiplayer/MultiplayerCreatePage.css src/App.jsx
git commit -m "feat: add RoomConfig and MultiplayerCreatePage for host game setup"
```

---

## Task 6 : useMultiplayerRoom hook

**Files:**
- Create: `src/hooks/useMultiplayerRoom.js`

- [ ] **Step 6.1 : Créer le hook**

```js
// src/hooks/useMultiplayerRoom.js
import { useState, useEffect } from 'react'
import { doc, collection, onSnapshot } from 'firebase/firestore'
import { firestore } from '../Firebase'

/**
 * S'abonne à la room et à la subcollection progress via onSnapshot.
 * Retourne { room, progress, gameResults, loading, error }.
 *
 * - room       : document rooms/{roomId}
 * - progress   : { [playerId]: progressData }
 * - gameResults: { [`${gameIndex}_${playerId}`]: resultData }
 */
export default function useMultiplayerRoom(roomId) {
  const [room, setRoom] = useState(null)
  const [progress, setProgress] = useState({})
  const [gameResults, setGameResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!roomId) return

    setLoading(true)
    setError(null)

    const unsubRoom = onSnapshot(
      doc(firestore, 'rooms', roomId),
      (snap) => {
        if (snap.exists()) {
          setRoom({ id: snap.id, ...snap.data() })
        } else {
          setError('Room introuvable.')
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    const unsubProgress = onSnapshot(
      collection(firestore, 'rooms', roomId, 'progress'),
      (snap) => {
        const map = {}
        snap.docs.forEach(d => { map[d.id] = d.data() })
        setProgress(map)
      }
    )

    const unsubResults = onSnapshot(
      collection(firestore, 'rooms', roomId, 'gameResults'),
      (snap) => {
        const map = {}
        snap.docs.forEach(d => { map[d.id] = d.data() })
        setGameResults(map)
      }
    )

    return () => {
      unsubRoom()
      unsubProgress()
      unsubResults()
    }
  }, [roomId])

  return { room, progress, gameResults, loading, error }
}
```

- [ ] **Step 6.2 : Commit**

```bash
git add src/hooks/useMultiplayerRoom.js
git commit -m "feat: add useMultiplayerRoom hook with Firestore onSnapshot"
```

---

## Task 7 : LobbyScreen component

**Files:**
- Create: `src/components/multiplayer/LobbyScreen.jsx`
- Create: `src/components/multiplayer/LobbyScreen.css`
- Create: `src/components/multiplayer/LobbyScreen.test.jsx`

- [ ] **Step 7.1 : Écrire les tests**

```jsx
// src/components/multiplayer/LobbyScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LobbyScreen from './LobbyScreen'

vi.mock('../../utils/multiplayerRoom', () => ({
  joinRoom: vi.fn().mockResolvedValue(undefined),
  launchRoom: vi.fn().mockResolvedValue(undefined),
}))

const makeRoom = (overrides = {}) => ({
  id: 'ROOM01',
  hostId: 'host-uuid',
  status: 'lobby',
  players: {
    'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
  },
  ...overrides,
})

describe('LobbyScreen', () => {
  it('shows join form when playerId not in room', () => {
    render(
      <LobbyScreen
        room={makeRoom()}
        playerId="stranger-uuid"
        onPseudoSet={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText('Ton pseudo')).toBeInTheDocument()
  })

  it('shows player list when playerId is in room', () => {
    render(
      <LobbyScreen
        room={makeRoom()}
        playerId="host-uuid"
        onPseudoSet={vi.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows launch button for host', () => {
    const room = makeRoom({
      players: {
        'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
        'p2-uuid':   { pseudo: 'Bob',   totalPoints: 0, disconnected: false },
      },
    })
    render(<LobbyScreen room={room} playerId="host-uuid" onPseudoSet={vi.fn()} />)
    expect(screen.getByRole('button', { name: /lancer/i })).toBeInTheDocument()
  })

  it('disables launch button when fewer than 2 connected players', () => {
    render(
      <LobbyScreen room={makeRoom()} playerId="host-uuid" onPseudoSet={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /joueurs/i })).toBeDisabled()
  })

  it('shows waiting message for non-host', () => {
    const room = makeRoom({
      players: {
        'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
        'p2-uuid':   { pseudo: 'Bob',   totalPoints: 0, disconnected: false },
      },
    })
    render(<LobbyScreen room={room} playerId="p2-uuid" onPseudoSet={vi.fn()} />)
    expect(screen.getByText(/en attente/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7.2 : Vérifier que les tests échouent**

```bash
npx vitest run src/components/multiplayer/LobbyScreen.test.jsx
```
Attendu : `FAIL` — `Cannot find module './LobbyScreen'`

- [ ] **Step 7.3 : Créer LobbyScreen.jsx**

```jsx
// src/components/multiplayer/LobbyScreen.jsx
import React, { useState } from 'react'
import { joinRoom, launchRoom } from '../../utils/multiplayerRoom'
import './LobbyScreen.css'

export default function LobbyScreen({ room, playerId, onPseudoSet }) {
  const [pseudo, setPseudo] = useState('')
  const [joining, setJoining] = useState(false)

  const isInRoom = playerId in room.players
  const isHost = room.hostId === playerId
  const activePlayers = Object.values(room.players).filter(p => !p.disconnected)
  const canLaunch = activePlayers.length >= 2

  const handleJoin = async (e) => {
    e.preventDefault()
    const trimmed = pseudo.trim()
    if (!trimmed) return
    setJoining(true)
    await joinRoom({ roomId: room.id, playerId, pseudo: trimmed })
    onPseudoSet(trimmed)
    setJoining(false)
  }

  const handleLaunch = () => launchRoom(room.id)

  const handleCopyLink = () => navigator.clipboard.writeText(window.location.href)

  if (!isInRoom) {
    return (
      <div className="lobby-join">
        <h2 className="lobby-join-title">Rejoindre la partie</h2>
        <p className="lobby-join-code">Code : <strong>{room.id}</strong></p>
        <form onSubmit={handleJoin} className="lobby-join-form">
          <input
            className="lobby-pseudo-input"
            placeholder="Ton pseudo"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="lobby-join-btn" disabled={!pseudo.trim() || joining}>
            {joining ? 'Connexion...' : 'Rejoindre'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="lobby">
      <h2 className="lobby-title">Salle d'attente</h2>

      <div className="lobby-invite">
        <span className="lobby-invite-label">Lien d'invitation</span>
        <div className="lobby-invite-row">
          <code className="lobby-invite-code">{room.id}</code>
          <button className="lobby-copy-btn" type="button" onClick={handleCopyLink}>
            Copier le lien
          </button>
        </div>
      </div>

      <ul className="lobby-players">
        {Object.entries(room.players).map(([pid, player]) => (
          <li
            key={pid}
            className={`lobby-player${player.disconnected ? ' lobby-player--disconnected' : ''}${pid === room.hostId ? ' lobby-player--host' : ''}`}
          >
            <span className="lobby-player-pseudo">{player.pseudo}</span>
            {pid === room.hostId && <span className="lobby-host-badge">Host</span>}
            {player.disconnected && <span className="lobby-dc-badge">Déconnecté</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          className="lobby-launch-btn"
          type="button"
          onClick={handleLaunch}
          disabled={!canLaunch}
        >
          {canLaunch ? 'Lancer la partie' : 'En attente de joueurs... (min. 2)'}
        </button>
      ) : (
        <p className="lobby-waiting">En attente du lancement par le host...</p>
      )}
    </div>
  )
}
```

- [ ] **Step 7.4 : Créer LobbyScreen.css**

```css
/* src/components/multiplayer/LobbyScreen.css */
.lobby, .lobby-join { max-width: 480px; margin: 3rem auto; padding: 0 1rem; color: #f1f5f9; }
.lobby-title, .lobby-join-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.25rem; }
.lobby-join-code { color: #94a3b8; margin-bottom: 1rem; }
.lobby-join-form { display: flex; flex-direction: column; gap: 0.75rem; }
.lobby-pseudo-input { padding: 0.6rem 0.9rem; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #f1f5f9; font-size: 1rem; }
.lobby-join-btn { padding: 0.6rem 1rem; border-radius: 8px; background: #00d4ff; color: #0f172a; font-weight: 600; border: none; cursor: pointer; }
.lobby-join-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.lobby-invite { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem; }
.lobby-invite-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; display: block; margin-bottom: 0.5rem; }
.lobby-invite-row { display: flex; align-items: center; gap: 0.75rem; }
.lobby-invite-code { font-size: 1.5rem; font-weight: 700; letter-spacing: 0.15em; color: #00d4ff; }
.lobby-copy-btn { padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid #475569; background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.85rem; }
.lobby-copy-btn:hover { border-color: #00d4ff; color: #00d4ff; }
.lobby-players { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.lobby-player { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1rem; background: #1e293b; border: 1px solid #334155; border-radius: 8px; }
.lobby-player--host { border-color: #fbbf24; }
.lobby-player--disconnected { opacity: 0.4; }
.lobby-player-pseudo { font-weight: 600; flex: 1; }
.lobby-host-badge { font-size: 0.75rem; padding: 0.15rem 0.4rem; background: #fbbf2422; color: #fbbf24; border-radius: 4px; border: 1px solid #fbbf2466; }
.lobby-dc-badge { font-size: 0.75rem; color: #64748b; }
.lobby-launch-btn { width: 100%; padding: 0.85rem; border-radius: 10px; border: none; background: #4ade80; color: #052e16; font-size: 1rem; font-weight: 700; cursor: pointer; }
.lobby-launch-btn:disabled { background: #1e293b; color: #64748b; border: 1px solid #334155; cursor: not-allowed; }
.lobby-waiting { text-align: center; color: #64748b; font-style: italic; }
```

- [ ] **Step 7.5 : Vérifier que les tests passent**

```bash
npx vitest run src/components/multiplayer/LobbyScreen.test.jsx
```
Attendu : `PASS` — 5 tests

- [ ] **Step 7.6 : Commit**

```bash
git add src/components/multiplayer/LobbyScreen.jsx src/components/multiplayer/LobbyScreen.css src/components/multiplayer/LobbyScreen.test.jsx
git commit -m "feat: add LobbyScreen component with join flow and host controls"
```

---

## Task 8 : CountdownOverlay component

**Files:**
- Create: `src/components/multiplayer/CountdownOverlay.jsx`
- Create: `src/components/multiplayer/CountdownOverlay.css`
- Create: `src/components/multiplayer/CountdownOverlay.test.jsx`

- [ ] **Step 8.1 : Écrire les tests**

```jsx
// src/components/multiplayer/CountdownOverlay.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import CountdownOverlay from './CountdownOverlay'

afterEach(() => vi.useRealTimers())

const makeStartAt = (msFromNow) => ({
  toDate: () => new Date(Date.now() + msFromNow),
})

describe('CountdownOverlay', () => {
  it('renders null when startAt is null', () => {
    const { container } = render(
      <CountdownOverlay startAt={null} onStart={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows countdown number when startAt is in the future', () => {
    vi.useFakeTimers()
    render(<CountdownOverlay startAt={makeStartAt(3000)} onStart={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onStart when countdown reaches 0', () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    render(<CountdownOverlay startAt={makeStartAt(500)} onStart={onStart} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 8.2 : Vérifier que les tests échouent**

```bash
npx vitest run src/components/multiplayer/CountdownOverlay.test.jsx
```
Attendu : `FAIL` — `Cannot find module './CountdownOverlay'`

- [ ] **Step 8.3 : Créer CountdownOverlay.jsx**

```jsx
// src/components/multiplayer/CountdownOverlay.jsx
import React, { useState, useEffect, useRef } from 'react'
import './CountdownOverlay.css'

export default function CountdownOverlay({ startAt, onStart }) {
  const [count, setCount] = useState(null)
  const onStartRef = useRef(onStart)
  onStartRef.current = onStart

  useEffect(() => {
    if (!startAt) return

    const startTime = startAt.toDate ? startAt.toDate() : new Date(startAt)

    let timeoutId

    const tick = () => {
      const remaining = Math.ceil((startTime - Date.now()) / 1000)
      if (remaining <= 0) {
        setCount(null)
        onStartRef.current()
        return
      }
      setCount(remaining)
      timeoutId = setTimeout(tick, 200)
    }

    tick()
    return () => clearTimeout(timeoutId)
  }, [startAt])

  if (count === null) return null

  return (
    <div className="countdown-overlay" aria-live="polite">
      <div className="countdown-number">{count}</div>
    </div>
  )
}
```

- [ ] **Step 8.4 : Créer CountdownOverlay.css**

```css
/* src/components/multiplayer/CountdownOverlay.css */
.countdown-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
}
.countdown-number {
  font-size: 10rem; font-weight: 900; color: #00d4ff;
  animation: countdown-pop 0.2s ease-out;
  text-shadow: 0 0 40px #00d4ff88;
}
@keyframes countdown-pop {
  from { transform: scale(1.3); opacity: 0.6; }
  to   { transform: scale(1);   opacity: 1; }
}
```

- [ ] **Step 8.5 : Vérifier que les tests passent**

```bash
npx vitest run src/components/multiplayer/CountdownOverlay.test.jsx
```
Attendu : `PASS` — 3 tests

- [ ] **Step 8.6 : Commit**

```bash
git add src/components/multiplayer/CountdownOverlay.jsx src/components/multiplayer/CountdownOverlay.css src/components/multiplayer/CountdownOverlay.test.jsx
git commit -m "feat: add synchronized CountdownOverlay component"
```

---

## Task 9 : MultiplayerRoomPage orchestrateur

**Files:**
- Create: `src/pages/multiplayer/MultiplayerRoomPage.jsx`
- Create: `src/pages/multiplayer/MultiplayerRoomPage.css`

- [ ] **Step 9.1 : Créer MultiplayerRoomPage.jsx**

```jsx
// src/pages/multiplayer/MultiplayerRoomPage.jsx
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import NavBar from '../../components/NavBar'
import LobbyScreen from '../../components/multiplayer/LobbyScreen'
import CountdownOverlay from '../../components/multiplayer/CountdownOverlay'
import useMultiplayerRoom from '../../hooks/useMultiplayerRoom'
import { getOrCreatePlayerId } from '../../utils/multiplayerRoom'
import './MultiplayerRoomPage.css'

export default function MultiplayerRoomPage() {
  const { roomId } = useParams()
  const [playerId] = useState(getOrCreatePlayerId)
  const [gameStarted, setGameStarted] = useState(false)
  const { room, progress, gameResults, loading, error } = useMultiplayerRoom(roomId)

  if (loading) {
    return (
      <div className="mp-room">
        <NavBar />
        <div className="mp-room-loading">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mp-room">
        <NavBar />
        <div className="mp-room-error">{error}</div>
      </div>
    )
  }

  const showCountdown = room.status === 'playing' && room.startAt && !gameStarted
  const showLobby = room.status === 'lobby'

  return (
    <div className="mp-room">
      <NavBar />

      {showCountdown && (
        <CountdownOverlay
          startAt={room.startAt}
          onStart={() => setGameStarted(true)}
        />
      )}

      {showLobby && (
        <LobbyScreen
          room={room}
          playerId={playerId}
          onPseudoSet={() => {}}
        />
      )}

      {(room.status === 'playing' && gameStarted) && (
        <div className="mp-game-placeholder">
          {/* Plan 2 : remplacer par le composant de jeu en cours */}
          <p>Jeu {room.currentGameIndex + 1} / {room.config.games.length} en cours...</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 9.2 : Créer MultiplayerRoomPage.css**

```css
/* src/pages/multiplayer/MultiplayerRoomPage.css */
.mp-room { min-height: 100vh; background: var(--bg-dark, #0f172a); color: #f1f5f9; }
.mp-room-loading, .mp-room-error { display: flex; align-items: center; justify-content: center; height: 60vh; font-size: 1.1rem; color: #94a3b8; }
.mp-room-error { color: #f87171; }
.mp-game-placeholder { display: flex; align-items: center; justify-content: center; height: 60vh; font-size: 1.2rem; color: #64748b; }
```

- [ ] **Step 9.3 : Lancer l'app et vérifier le flux complet**

```bash
npm run dev
```

Vérifier manuellement :
1. Aller sur `/multiplayer` → voit les deux cartes (Créer / Rejoindre)
2. Cliquer "Créer une partie" → arriver sur `/multiplayer/create` avec la config
3. Entrer un pseudo, configurer au moins un jeu, cliquer "Créer la partie"
4. Redirection vers `/multiplayer/room/{CODE}` → voir la salle d'attente avec lien de partage
5. Ouvrir le lien dans un autre onglet → voir le formulaire "Entrer un pseudo"
6. Entrer un pseudo dans l'onglet 2 → le joueur apparaît dans la liste des deux onglets
7. Cliquer "Lancer la partie" (host) → les deux onglets voient le countdown 5, 4, 3, 2, 1
8. Après le countdown → voir le placeholder "Jeu 1/N en cours..."

- [ ] **Step 9.4 : Ajouter la route `/multiplayer/room/:roomId` dans App.jsx**

Ajouter l'import dans `src/App.jsx` :
```jsx
import MultiplayerRoomPage from './pages/multiplayer/MultiplayerRoomPage'
```

Ajouter la route après `/multiplayer/create` :
```jsx
<Route path="/multiplayer/room/:roomId" element={<MultiplayerRoomPage />} />
```

- [ ] **Step 9.5 : Lancer tous les tests**

```bash
npm test
```
Attendu : tous les tests existants + nouveaux passent

- [ ] **Step 9.6 : Commit final Plan 1**

```bash
git add src/pages/multiplayer/MultiplayerRoomPage.jsx src/pages/multiplayer/MultiplayerRoomPage.css src/App.jsx
git commit -m "feat: add MultiplayerRoomPage orchestrator — completes Plan 1 lobby + countdown flow"
```

---

## Récapitulatif Plan 1

À la fin de ce plan, le flux suivant est fonctionnel et testé :

| Étape | Status |
|-------|--------|
| PRNG déterministe (seededShuffle) | ✅ testé |
| Calcul rangs + points | ✅ testé |
| CRUD Firestore rooms | ✅ implémenté |
| `/multiplayer` (créer / rejoindre) | ✅ |
| `/multiplayer/create` (config host) | ✅ |
| `/multiplayer/room/:roomId` (lobby) | ✅ testé |
| Countdown synchronisé | ✅ testé |
| Placeholder "jeu en cours" | ✅ |

**Plan 2** couvrira : progression live, adaptateurs des 5 jeux, classements intermédiaires et final, actions post-partie (revanche / reconfigurer).

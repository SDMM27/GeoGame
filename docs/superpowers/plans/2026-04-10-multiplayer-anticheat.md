# Multiplayer Anti-Cheat — Replay Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empêcher un joueur de rejouer un round multijoueur après avoir terminé et actualisé la page.

**Architecture:** Ajouter un state `isFinished` dans `MultiplayerGame.jsx`, initialisé depuis le snapshot localStorage, confirmé par Firestore. Quand `isFinished === true`, afficher un écran d'attente à la place du jeu.

**Tech Stack:** React, Firebase Firestore, localStorage (multiplayerSnapshot), Vitest, React Testing Library

---

## Fichiers

- Modify: `src/components/multiplayer/MultiplayerGame.jsx`
- Modify: `src/components/multiplayer/MultiplayerGame.css`
- Create: `src/components/multiplayer/MultiplayerGame.test.jsx`

---

### Task 1 : Tests — écran d'attente quand snapshot `completed: true`

**Files:**
- Create: `src/components/multiplayer/MultiplayerGame.test.jsx`

- [ ] **Step 1 : Créer le fichier de test avec les mocks nécessaires**

```jsx
// src/components/multiplayer/MultiplayerGame.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import MultiplayerGame from './MultiplayerGame'

// Snapshot mock — contrôlé par chaque test
const mockLoadSnapshot = vi.fn()
vi.mock('../../utils/multiplayerSnapshot', () => ({
  snapshotKey: (roomId, playerId, gameIndex) => `snap_${roomId}_${playerId}_${gameIndex}`,
  loadSnapshot: (...args) => mockLoadSnapshot(...args),
  saveSnapshot: vi.fn(),
}))

vi.mock('../../utils/multiplayerRoom', () => ({
  updatePlayerProgress: vi.fn().mockResolvedValue(undefined),
  writeGameResult: vi.fn().mockResolvedValue(undefined),
  updateRoomStatus: vi.fn().mockResolvedValue(undefined),
  updateTotalPoints: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../utils/multiplayerSeed', () => ({
  getSeededCountriesForGame: vi.fn().mockReturnValue([]),
}))

vi.mock('../../utils/multiplayerScoring', () => ({
  rankResults: vi.fn().mockReturnValue([]),
}))

vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn().mockReturnValue('SERVER_TS'),
}))

// Stub des composants de jeu — on veut juste vérifier lequel est rendu
vi.mock('../../pages/GamePage', () => ({ MultiplayerPlacementGame: () => <div data-testid="placement-game" /> }))
vi.mock('../../pages/FlagGamePage', () => ({ MultiplayerFlagsGame: () => <div data-testid="flags-game" /> }))
vi.mock('../../pages/CapitalsGamePage', () => ({ MultiplayerCapitalsGame: () => <div data-testid="capitals-game" /> }))
vi.mock('./MultiplayerBorderGuess', () => ({ default: () => <div data-testid="border-game" /> }))
vi.mock('./MultiplayerCountryClue', () => ({ default: () => <div data-testid="clue-game" /> }))
vi.mock('./LiveSidebar', () => ({ default: () => <div data-testid="live-sidebar" /> }))

const makeRoom = (overrides = {}) => ({
  currentGameIndex: 0,
  hostId: 'host-uuid',
  seed: 42,
  startAt: null,
  players: {
    'host-uuid': { pseudo: 'Alice', totalPoints: 0, disconnected: false },
    'p2-uuid':   { pseudo: 'Bob',   totalPoints: 0, disconnected: false },
  },
  config: {
    games: [{ type: 'placement', mode: 'classic', difficulty: 'medium' }],
  },
  ...overrides,
})

const defaultProgress = {}

beforeEach(() => {
  mockLoadSnapshot.mockReturnValue(null)
})
```

- [ ] **Step 2 : Écrire le test — snapshot `completed: true` → écran d'attente**

Ajouter dans le même fichier, après les mocks :

```jsx
describe('MultiplayerGame — anti-cheat', () => {
  it('affiche l'écran d'attente si le snapshot local est completed', () => {
    mockLoadSnapshot.mockReturnValue({ completed: true, savedAt: Date.now() })

    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={defaultProgress}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )

    expect(screen.getByText(/tu as terminé/i)).toBeInTheDocument()
    expect(screen.queryByTestId('placement-game')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

```bash
cd D:/NasaCode/GeoGame
npx vitest run src/components/multiplayer/MultiplayerGame.test.jsx
```

Résultat attendu : FAIL — "Unable to find an element with the text: /tu as terminé/i"

---

### Task 2 : Tests — fallback Firestore si localStorage vide

**Files:**
- Modify: `src/components/multiplayer/MultiplayerGame.test.jsx`

- [ ] **Step 1 : Ajouter le test fallback Firestore**

Ajouter dans le `describe` existant :

```jsx
  it('affiche l'écran d'attente si Firestore indique finished:true', async () => {
    mockLoadSnapshot.mockReturnValue(null) // localStorage vide

    const progressWithFinished = {
      'p2-uuid': { gameIndex: 0, finished: true, countriesFound: 5 },
    }

    const { rerender } = render(
      <MultiplayerGame
        room={makeRoom()}
        progress={defaultProgress}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )

    // Pas encore d'écran d'attente — progress vide au départ
    expect(screen.queryByText(/tu as terminé/i)).not.toBeInTheDocument()

    // Firestore arrive avec finished:true
    await act(async () => {
      rerender(
        <MultiplayerGame
          room={makeRoom()}
          progress={progressWithFinished}
          playerId="p2-uuid"
          roomId="ROOM01"
        />
      )
    })

    expect(screen.getByText(/tu as terminé/i)).toBeInTheDocument()
    expect(screen.queryByTestId('placement-game')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npx vitest run src/components/multiplayer/MultiplayerGame.test.jsx
```

Résultat attendu : 2 FAIL

---

### Task 3 : Implémentation — state `isFinished` dans `MultiplayerGame.jsx`

**Files:**
- Modify: `src/components/multiplayer/MultiplayerGame.jsx`

- [ ] **Step 1 : Remplacer la déclaration `alreadyCompleted` et ajouter `isFinished`**

Remplacer les lignes 28-31 (bloc `alreadyCompleted`) :

```js
// AVANT
const [alreadyCompleted] = React.useState(() => {
  const snap = loadSnapshot(snapshotKey(roomId, playerId, gameIndex))
  return snap?.completed === true
})
```

Par :

```js
const alreadyCompleted = React.useMemo(() => {
  const snap = loadSnapshot(snapshotKey(roomId, playerId, gameIndex))
  return snap?.completed === true
}, []) // eslint-disable-line react-hooks/exhaustive-deps

const [isFinished, setIsFinished] = React.useState(() => alreadyCompleted)
```

- [ ] **Step 2 : Ajouter le useEffect Firestore (après le useEffect existant ligne 113)**

Ajouter après le `useEffect` qui surveille `progress` (le bloc `allFinished`, ligne ~113) :

```js
useEffect(() => {
  if (isFinished) return
  if (progress[playerId]?.gameIndex === gameIndex && progress[playerId]?.finished === true) {
    setIsFinished(true)
  }
}, [progress, playerId, gameIndex, isFinished])
```

- [ ] **Step 3 : Modifier le rendu pour utiliser `isFinished`**

Dans le `return` du composant, remplacer :

```jsx
// AVANT
<div className="mp-game-content">
  {renderGame()}
</div>
```

Par :

```jsx
<div className="mp-game-content">
  {isFinished ? (
    <div className="mp-game-finished-wait">
      <p className="mp-game-finished-icon">✓</p>
      <h2>Tu as terminé !</h2>
      <p>En attente des autres joueurs...</p>
    </div>
  ) : renderGame()}
</div>
```

- [ ] **Step 4 : Lancer les tests**

```bash
npx vitest run src/components/multiplayer/MultiplayerGame.test.jsx
```

Résultat attendu : 2 PASS

---

### Task 4 : Styles — écran d'attente

**Files:**
- Modify: `src/components/multiplayer/MultiplayerGame.css`

- [ ] **Step 1 : Ajouter les styles à la fin du fichier**

```css
/* Écran d'attente après completion */
.mp-game-finished-wait {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 0.75rem;
  color: #ccc;
  text-align: center;
  padding: 2rem;
}

.mp-game-finished-icon {
  font-size: 3rem;
  color: #4caf50;
  margin: 0;
}

.mp-game-finished-wait h2 {
  font-size: 1.5rem;
  color: #fff;
  margin: 0;
}

.mp-game-finished-wait p {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.7;
}
```

- [ ] **Step 2 : Lancer tous les tests multiplayer pour vérifier aucune régression**

```bash
npx vitest run src/components/multiplayer/
```

Résultat attendu : tous PASS

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiplayer/MultiplayerGame.jsx \
        src/components/multiplayer/MultiplayerGame.css \
        src/components/multiplayer/MultiplayerGame.test.jsx
git commit -m "feat: block game replay after round completion (anti-cheat)"
```

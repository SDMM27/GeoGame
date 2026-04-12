# Bouton Abandonner le Round (Multijoueur) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à chaque joueur d'abandonner individuellement un round multijoueur — il est automatiquement classé dernier pour ce round et continue les rounds suivants normalement.

**Architecture:** On ajoute un champ `abandoned: true` dans le doc Firestore `progress/{playerId}` (avec `finished: true` pour déclencher la transition normale). `rankResults()` est modifié pour placer les abandonnés systématiquement en dernière position. Un bouton + modale de confirmation sont ajoutés dans `MultiplayerGame.jsx` (wrapper commun à tous les types de jeu).

**Tech Stack:** React 18, Firebase Firestore, Vitest + @testing-library/react

---

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `src/utils/multiplayerRoom.js` | Ajout de `abandonRound()` |
| `src/utils/multiplayerScoring.js` | `rankResults()` — abandonnés en dernière position |
| `src/utils/multiplayerScoring.test.js` | Nouveaux tests pour le comportement abandonné |
| `src/components/multiplayer/MultiplayerGame.jsx` | Bouton + modale, propagation du champ `abandoned` |
| `src/components/multiplayer/MultiplayerGame.test.jsx` | Test du bouton et de l'appel à `abandonRound` |
| `src/components/multiplayer/MultiplayerGame.css` | Styles du bouton et de la modale |
| `src/components/multiplayer/BetweenGamesScreen.jsx` | Badge "(abandonné)" + "—" pour les scores |

---

## Task 1 : Tests `rankResults` — joueurs abandonnés

**Fichier :** `src/utils/multiplayerScoring.test.js`

- [ ] **Étape 1 : Ajouter les tests**

Ouvrir `src/utils/multiplayerScoring.test.js` et ajouter ce bloc **à la fin du fichier** (après le bloc `aggregatePoints`) :

```js
describe('rankResults — joueurs abandonnés', () => {
  it('place un joueur abandonné après les joueurs actifs (mode weighted)', () => {
    const results = [
      { playerId: 'a', weightedScore: 5, elapsedTime: 10000, abandoned: false },
      { playerId: 'b', weightedScore: 2, elapsedTime: 10000, abandoned: false },
      { playerId: 'c', weightedScore: 0, elapsedTime: 0,     abandoned: true  },
    ]
    const ranked = rankResults(results, 3)
    expect(ranked[0].playerId).toBe('a')
    expect(ranked[1].playerId).toBe('b')
    expect(ranked[2].playerId).toBe('c')
    expect(ranked[2].rank).toBe(3)
    expect(ranked[2].points).toBe(1)
  })

  it('place un joueur abandonné après les joueurs actifs (mode solved)', () => {
    const results = [
      { playerId: 'a', countriesSolved: 5, attempts: 2, elapsedTime: 8000, abandoned: false },
      { playerId: 'b', countriesSolved: 0, attempts: 0, elapsedTime: 0,    abandoned: true  },
    ]
    const ranked = rankResults(results, 2, 'solved')
    expect(ranked[0].playerId).toBe('a')
    expect(ranked[1].playerId).toBe('b')
    expect(ranked[1].rank).toBe(2)
    expect(ranked[1].points).toBe(1)
  })

  it('deux joueurs abandonnés partagent le même rang et les mêmes points', () => {
    const results = [
      { playerId: 'a', weightedScore: 8, elapsedTime: 5000, abandoned: false },
      { playerId: 'b', weightedScore: 0, elapsedTime: 0,    abandoned: true  },
      { playerId: 'c', weightedScore: 0, elapsedTime: 0,    abandoned: true  },
    ]
    const ranked = rankResults(results, 3)
    const abandoned = ranked.filter(r => r.abandoned)
    expect(abandoned).toHaveLength(2)
    expect(abandoned[0].rank).toBe(abandoned[1].rank)
    expect(abandoned[0].points).toBe(abandoned[1].points)
  })

  it('quand tous les joueurs abandonnent, chacun reçoit 1 point', () => {
    const results = [
      { playerId: 'a', weightedScore: 0, elapsedTime: 0, abandoned: true },
      { playerId: 'b', weightedScore: 0, elapsedTime: 0, abandoned: true },
      { playerId: 'c', weightedScore: 0, elapsedTime: 0, abandoned: true },
    ]
    const ranked = rankResults(results, 3)
    ranked.forEach(r => expect(r.points).toBe(1))
  })

  it('joueurs non abandonnés sans champ abandoned ne sont pas affectés', () => {
    const results = [
      { playerId: 'a', weightedScore: 9, elapsedTime: 1000 },
      { playerId: 'b', weightedScore: 3, elapsedTime: 2000 },
    ]
    const ranked = rankResults(results, 2)
    expect(ranked[0].playerId).toBe('a')
    expect(ranked[0].points).toBe(2)
  })
})
```

- [ ] **Étape 2 : Vérifier que les tests échouent**

```bash
cd D:/NasaCode/GeoGame
npm test -- multiplayerScoring
```

Résultat attendu : les 5 nouveaux tests **FAIL** avec des erreurs de ranking.

---

## Task 2 : Modifier `rankResults()` pour gérer les abandonnés

**Fichier :** `src/utils/multiplayerScoring.js`

- [ ] **Étape 3 : Remplacer la fonction `rankResults`**

Remplacer le contenu complet de la fonction `rankResults` (lignes 29–56) par :

```js
export function rankResults(results, totalPlayers, scoringMode = 'weighted') {
  const active   = results.filter(r => !r.abandoned)
  const abandoned = results.filter(r => r.abandoned)

  const sorted = [...active].sort((a, b) => {
    if (scoringMode === 'solved') {
      const solvedDiff = (b.countriesSolved ?? 0) - (a.countriesSolved ?? 0)
      if (solvedDiff !== 0) return solvedDiff
      const attemptsDiff = (a.attempts ?? 0) - (b.attempts ?? 0)
      if (attemptsDiff !== 0) return attemptsDiff
      return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
    }
    const scoreDiff = (b.weightedScore ?? 0) - (a.weightedScore ?? 0)
    if (scoreDiff !== 0) return scoreDiff
    return (a.elapsedTime ?? Infinity) - (b.elapsedTime ?? Infinity)
  })

  const abandonedRank   = active.length + 1
  // Si tous abandonnent → 1 pt ; sinon, dernier rang actif + 1
  const abandonedPoints = active.length === 0 ? 1 : totalPlayers - active.length

  const rankedActive = sorted.map((result, index) => ({
    ...result,
    rank:   index + 1,
    points: totalPlayers - index,
  }))

  const rankedAbandoned = abandoned.map(result => ({
    ...result,
    rank:   abandonedRank,
    points: abandonedPoints,
  }))

  return [...rankedActive, ...rankedAbandoned]
}
```

- [ ] **Étape 4 : Vérifier que tous les tests passent**

```bash
npm test -- multiplayerScoring
```

Résultat attendu : **tous les tests PASS** (anciens + nouveaux).

- [ ] **Étape 5 : Commit**

```bash
git add src/utils/multiplayerScoring.js src/utils/multiplayerScoring.test.js
git commit -m "feat(scoring): placer les joueurs abandonnés en dernière position"
```

---

## Task 3 : Ajouter `abandonRound()` dans `multiplayerRoom.js`

**Fichier :** `src/utils/multiplayerRoom.js`

- [ ] **Étape 6 : Ajouter la fonction à la fin du fichier**

Ajouter après la dernière fonction (`updatePlayerGameFlags`) :

```js
/**
 * Abandonne le round en cours pour un joueur.
 * Le joueur est marqué finished + abandoned, tous ses scores sont remis à 0.
 * Il sera classé dernier pour ce round mais continue les suivants.
 *
 * @param {string} roomId
 * @param {string} playerId
 * @param {number} gameIndex
 */
export async function abandonRound(roomId, playerId, gameIndex) {
  await updatePlayerProgress(roomId, playerId, {
    gameIndex,
    abandoned: true,
    finished: true,
    weightedScore: 0,
    countriesSolved: 0,
    attempts: 0,
    elapsedTime: 0,
    perfects: 0,
    stumbles: 0,
    failures: 0,
    countriesFound: 0,
  })
}
```

- [ ] **Étape 7 : Vérifier que les tests existants passent toujours**

```bash
npm test
```

Résultat attendu : tous les tests **PASS** (aucune régression).

- [ ] **Étape 8 : Commit**

```bash
git add src/utils/multiplayerRoom.js
git commit -m "feat(room): ajouter abandonRound() pour marquer un joueur comme abandonné"
```

---

## Task 4 : Propager le champ `abandoned` dans `MultiplayerGame.jsx`

**Fichier :** `src/components/multiplayer/MultiplayerGame.jsx`

Le `useEffect` qui détecte la fin de partie (lignes 112–165) construit un tableau `results` à partir de `progress`. Il faut y inclure `abandoned` pour que `rankResults()` et `writeGameResult()` le reçoivent.

- [ ] **Étape 9 : Préparer le fichier de test — ajouter les imports manquants**

En haut de `src/components/multiplayer/MultiplayerGame.test.jsx`, modifier les imports existants :

```js
// Remplacer cette ligne :
import { render, screen, act } from '@testing-library/react'
// Par :
import { render, screen, act, fireEvent } from '@testing-library/react'
```

```js
// Remplacer cette ligne :
import { updatePlayerProgress } from '../../utils/multiplayerRoom'
// Par :
import { updatePlayerProgress, abandonRound, writeGameResult } from '../../utils/multiplayerRoom'
```

Ajouter cet import après les imports existants :

```js
import { rankResults } from '../../utils/multiplayerScoring'
```

- [ ] **Étape 10 : Ajouter un test pour la propagation du champ `abandoned`**

Ajouter ce bloc **à la fin du fichier** de test :

```js
describe('MultiplayerGame — abandon', () => {
  it('inclut abandoned:true dans les résultats quand un joueur a abandonné', async () => {
    const progressWithAbandoned = {
      'host-uuid': {
        gameIndex: 0, finished: true, abandoned: false,
        weightedScore: 8, countriesSolved: 5, attempts: 3,
        elapsedTime: 12000, perfects: 2, stumbles: 1, failures: 0,
      },
      'p2-uuid': {
        gameIndex: 0, finished: true, abandoned: true,
        weightedScore: 0, countriesSolved: 0, attempts: 0,
        elapsedTime: 0, perfects: 0, stumbles: 0, failures: 0,
      },
    }

    rankResults.mockReturnValue([
      { playerId: 'host-uuid', rank: 1, points: 2, weightedScore: 8, countriesSolved: 5, attempts: 3, elapsedTime: 12000, perfects: 2, stumbles: 1, failures: 0, abandoned: false },
      { playerId: 'p2-uuid',   rank: 2, points: 1, weightedScore: 0, countriesSolved: 0, attempts: 0, elapsedTime: 0,     perfects: 0, stumbles: 0, failures: 0, abandoned: true  },
    ])

    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={progressWithAbandoned}
        playerId="host-uuid"
        roomId="ROOM01"
      />
    )

    await act(async () => {})

    // rankResults doit avoir reçu abandoned:true pour p2
    const callArgs = rankResults.mock.calls[0][0]
    const p2entry = callArgs.find(r => r.playerId === 'p2-uuid')
    expect(p2entry.abandoned).toBe(true)

    // writeGameResult doit avoir été appelé avec abandoned:true pour p2
    const p2write = writeGameResult.mock.calls.find(c => c[2] === 'p2-uuid')
    expect(p2write[3].abandoned).toBe(true)
  })
})
```

- [ ] **Étape 11 : Vérifier que le test échoue**

```bash
npm test -- MultiplayerGame
```

Résultat attendu : le nouveau test **FAIL** (le champ `abandoned` n'est pas encore propagé).

- [ ] **Étape 12 : Modifier le `useEffect` de transition dans `MultiplayerGame.jsx`**

Repérer le bloc qui construit `results` (vers la ligne 126). Ajouter `abandoned` dans le mapping :

```js
const results = activePlayers.map(pid => ({
  playerId: pid,
  attempts: progress[pid].attempts ?? 0,
  elapsedTime: progress[pid].elapsedTime ?? null,
  countriesSolved: progress[pid].countriesSolved ?? 0,
  weightedScore: progress[pid].weightedScore ?? 0,
  perfects: progress[pid].perfects ?? 0,
  stumbles: progress[pid].stumbles ?? 0,
  failures: progress[pid].failures ?? 0,
  abandoned: progress[pid].abandoned ?? false,
}))
```

Repérer le bloc `writeGameResult` (vers la ligne 143) et ajouter `abandoned: r.abandoned` :

```js
writeGameResult(roomId, gameIndex, r.playerId, {
  playerId: r.playerId,
  gameIndex,
  attempts: r.attempts,
  elapsedTime: r.elapsedTime,
  countriesSolved: r.countriesSolved,
  weightedScore: r.weightedScore,
  perfects: r.perfects,
  stumbles: r.stumbles,
  failures: r.failures,
  abandoned: r.abandoned,
  rank: r.rank,
  points: r.points,
})
```

- [ ] **Étape 13 : Vérifier que le test passe**

```bash
npm test -- MultiplayerGame
```

Résultat attendu : **tous les tests PASS**.

- [ ] **Étape 14 : Commit**

```bash
git add src/components/multiplayer/MultiplayerGame.jsx src/components/multiplayer/MultiplayerGame.test.jsx
git commit -m "feat(game): propager le champ abandoned dans les résultats de round"
```

---

## Task 5 : Bouton + modale d'abandon dans `MultiplayerGame.jsx`

**Fichiers :** `src/components/multiplayer/MultiplayerGame.jsx`, `src/components/multiplayer/MultiplayerGame.css`

- [ ] **Étape 15 : Ajouter les tests pour le bouton et la modale**

Dans `src/components/multiplayer/MultiplayerGame.test.jsx`, ajouter ce bloc à la fin :

```js
describe('MultiplayerGame — bouton abandonner', () => {
  it('affiche le bouton "Abandonner le round" quand le joueur n\'a pas fini', () => {
    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={{}}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )
    expect(screen.getByRole('button', { name: /abandonner le round/i })).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton quand le joueur a terminé', () => {
    const finishedProgress = {
      'p2-uuid': { gameIndex: 0, finished: true },
    }
    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={finishedProgress}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )
    expect(screen.queryByRole('button', { name: /abandonner le round/i })).not.toBeInTheDocument()
  })

  it('ouvre la modale de confirmation au clic', () => {
    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={{}}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /abandonner le round/i }))
    expect(screen.getByText(/abandonner ce round/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuer à jouer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^abandonner$/i })).toBeInTheDocument()
  })

  it('ferme la modale sans abandonner si le joueur clique "Continuer à jouer"', () => {
    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={{}}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /abandonner le round/i }))
    fireEvent.click(screen.getByRole('button', { name: /continuer à jouer/i }))
    expect(screen.queryByText(/abandonner ce round/i)).not.toBeInTheDocument()
    expect(abandonRound).not.toHaveBeenCalled()
  })

  it('appelle abandonRound avec les bons paramètres si le joueur confirme', async () => {
    render(
      <MultiplayerGame
        room={makeRoom()}
        progress={{}}
        playerId="p2-uuid"
        roomId="ROOM01"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /abandonner le round/i }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^abandonner$/i }))
    })
    expect(abandonRound).toHaveBeenCalledWith('ROOM01', 'p2-uuid', 0)
  })
})
```

Aussi, ajouter `abandonRound` dans le mock de `multiplayerRoom` en haut du fichier (bloc `vi.mock`) :

```js
vi.mock('../../utils/multiplayerRoom', () => ({
  updatePlayerProgress: vi.fn().mockResolvedValue(undefined),
  writeGameResult:      vi.fn().mockResolvedValue(undefined),
  updateRoomStatus:     vi.fn().mockResolvedValue(undefined),
  updateTotalPoints:    vi.fn().mockResolvedValue(undefined),
  abandonRound:         vi.fn().mockResolvedValue(undefined),  // ← ajouter
}))
```

- [ ] **Étape 16 : Vérifier que les tests échouent**

```bash
npm test -- MultiplayerGame
```

Résultat attendu : les 5 nouveaux tests **FAIL**.

- [ ] **Étape 17 : Modifier `MultiplayerGame.jsx` — imports et state**

En haut du fichier, ajouter `abandonRound` dans l'import de `multiplayerRoom` :

```js
import {
  updatePlayerProgress,
  writeGameResult,
  updateRoomStatus,
  updateTotalPoints,
  abandonRound,
} from '../../utils/multiplayerRoom'
```

Dans le composant, ajouter le state de la modale juste après la déclaration de `isFinished` :

```js
const [showAbandonModal, setShowAbandonModal] = useState(false)
```

Ajouter le handler d'abandon juste après `handleGameFinished` :

```js
const handleAbandon = useCallback(async () => {
  setShowAbandonModal(false)
  await abandonRound(roomId, playerId, gameIndex)
}, [roomId, playerId, gameIndex])
```

- [ ] **Étape 18 : Modifier le `return` de `MultiplayerGame.jsx`**

Remplacer le bloc `return` actuel par :

```jsx
return (
  <div className="mp-game-view">
    <div className="mp-game-content">
      {isFinished ? (
        <div className="mp-game-finished-wait">
          <span className="mp-game-finished-icon">✓</span>
          <h2>Tu as terminé !</h2>
          <p>En attente des autres joueurs...</p>
        </div>
      ) : (
        <>
          {renderGame()}
          <div className="mp-abandon-bar">
            <button
              className="mp-abandon-btn"
              onClick={() => setShowAbandonModal(true)}
            >
              Abandonner le round
            </button>
          </div>
        </>
      )}
    </div>

    <LiveSidebar
      room={room}
      progress={progress}
      playerId={playerId}
      totalCountries={totalCountries}
    />

    {showAbandonModal && (
      <div className="mp-abandon-overlay" role="dialog" aria-modal="true">
        <div className="mp-abandon-modal">
          <h3>⚠️ Abandonner ce round ?</h3>
          <p>
            Tu seras classé dernier pour ce round, mais tu pourras
            continuer les rounds suivants.
          </p>
          <div className="mp-abandon-modal-actions">
            <button
              className="mp-abandon-modal-cancel"
              onClick={() => setShowAbandonModal(false)}
            >
              Continuer à jouer
            </button>
            <button
              className="mp-abandon-modal-confirm"
              onClick={handleAbandon}
            >
              Abandonner
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)
```

- [ ] **Étape 19 : Vérifier que les tests passent**

```bash
npm test -- MultiplayerGame
```

Résultat attendu : **tous les tests PASS**.

- [ ] **Étape 20 : Ajouter les styles dans `MultiplayerGame.css`**

Ajouter à la **fin** de `src/components/multiplayer/MultiplayerGame.css` :

```css
/* ── Barre abandon ────────────────────────────────── */
.mp-abandon-bar {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}

.mp-abandon-btn {
  background: transparent;
  border: 1px solid #888;
  color: #888;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.mp-abandon-btn:hover {
  border-color: #e05c5c;
  color: #e05c5c;
}

/* ── Modale abandon ───────────────────────────────── */
.mp-abandon-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.mp-abandon-modal {
  background: #1e1e2e;
  border: 1px solid #3a3a5c;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 380px;
  width: 90%;
  text-align: center;
}

.mp-abandon-modal h3 {
  margin: 0 0 12px;
  font-size: 1.1rem;
}

.mp-abandon-modal p {
  margin: 0 0 24px;
  color: #aaa;
  font-size: 0.9rem;
  line-height: 1.5;
}

.mp-abandon-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.mp-abandon-modal-cancel {
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid #555;
  background: transparent;
  color: #ccc;
  cursor: pointer;
  font-size: 0.9rem;
}

.mp-abandon-modal-cancel:hover {
  border-color: #aaa;
  color: #fff;
}

.mp-abandon-modal-confirm {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: #c0392b;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
}

.mp-abandon-modal-confirm:hover {
  background: #e74c3c;
}
```

- [ ] **Étape 21 : Commit**

```bash
git add src/components/multiplayer/MultiplayerGame.jsx \
        src/components/multiplayer/MultiplayerGame.test.jsx \
        src/components/multiplayer/MultiplayerGame.css
git commit -m "feat(game): ajouter bouton et modale d'abandon du round"
```

---

## Task 6 : Badge "(abandonné)" dans `BetweenGamesScreen.jsx`

**Fichier :** `src/components/multiplayer/BetweenGamesScreen.jsx`

- [ ] **Étape 22 : Modifier la colonne Joueur dans le tableau guess games (ligne ~69)**

Repérer cette ligne dans la `<tbody>` du tableau guess games :

```jsx
<td>{playerData?.pseudo ?? '?'}{isMe ? ' (Toi)' : ''}</td>
```

La remplacer par :

```jsx
<td>
  {playerData?.pseudo ?? '?'}
  {isMe ? ' (Toi)' : ''}
  {result.abandoned ? <span className="bg-abandoned-badge"> (abandonné)</span> : null}
</td>
```

- [ ] **Étape 23 : Modifier la colonne Joueur dans le tableau weighted games (ligne ~104)**

Repérer cette ligne dans la `<tbody>` du tableau weighted games :

```jsx
<td>{playerData?.pseudo ?? '?'}{isMe ? ' (Toi)' : ''}</td>
```

La remplacer par :

```jsx
<td>
  {playerData?.pseudo ?? '?'}
  {isMe ? ' (Toi)' : ''}
  {result.abandoned ? <span className="bg-abandoned-badge"> (abandonné)</span> : null}
</td>
```

- [ ] **Étape 24 : Afficher "—" pour les scores d'un joueur abandonné dans le tableau weighted**

Dans le tableau weighted (non guess), repérer la cellule Score :

```jsx
<td><strong>{result.weightedScore ?? 0}</strong></td>
```

La remplacer par :

```jsx
<td><strong>{result.abandoned ? '—' : (result.weightedScore ?? 0)}</strong></td>
```

- [ ] **Étape 25 : Ajouter le style du badge dans `BetweenGamesScreen.css`**

Ouvrir `src/components/multiplayer/BetweenGamesScreen.css` et ajouter à la fin :

```css
.bg-abandoned-badge {
  font-size: 0.75em;
  color: #888;
  font-style: italic;
}
```

- [ ] **Étape 26 : Vérifier visuellement et lancer tous les tests**

```bash
npm test
```

Résultat attendu : **tous les tests PASS** — aucune régression.

- [ ] **Étape 27 : Commit final**

```bash
git add src/components/multiplayer/BetweenGamesScreen.jsx \
        src/components/multiplayer/BetweenGamesScreen.css
git commit -m "feat(results): afficher badge abandonné dans BetweenGamesScreen"
```

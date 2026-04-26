# Chill Multi — Tentatives multiples BORDER_GUESS / COUNTRY_CLUE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le `ChillTextInput` mono-tentative pour BORDER_GUESS / COUNTRY_CLUE par un nouveau composant `ChillGuessInput` qui permet des tentatives multiples via `useBorderGuessState`, stocke la liste des propositions et l'affiche dans `ChillReview`.

**Architecture:** Nouveau composant `ChillGuessInput` encapsule `useBorderGuessState` et appelle `onSubmit` une seule fois à completion. `ChillGame` le monte avec `key={currentCountryIndex}` pour garantir la réinitialisation. `ChillReview` affiche `guesses[]` quand le champ est présent (rétrocompatible avec les autres types).

**Tech Stack:** React 18, Vitest 1.3, @testing-library/react 14, react-toastify, useBorderGuessState (hook existant)

**Spec:** `docs/superpowers/specs/2026-04-26-chill-guess-multi-attempt-design.md`

---

## File Map

| Action | Fichier |
|--------|---------|
| Créer | `src/components/multiplayer/chill/ChillGuessInput.jsx` |
| Créer | `src/components/multiplayer/chill/ChillGuessInput.test.jsx` |
| Modifier | `src/components/multiplayer/chill/ChillGame.jsx` lignes 371-392 |
| Modifier | `src/components/multiplayer/chill/ChillReview.jsx` lignes 99-121 |
| Créer | `src/components/multiplayer/chill/ChillReview.test.jsx` |

---

## Task 1 : Tests ChillGuessInput (TDD — écrire avant d'implémenter)

**Files:**
- Create: `src/components/multiplayer/chill/ChillGuessInput.test.jsx`

- [ ] **Step 1 : Créer le fichier de tests**

```jsx
// src/components/multiplayer/chill/ChillGuessInput.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChillGuessInput from './ChillGuessInput'

vi.mock('../../../hooks/useBorderGuessState', () => ({
  default: vi.fn(),
}))
vi.mock('react-toastify', () => ({
  ToastContainer: () => null,
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))
vi.mock('react-toastify/dist/ReactToastify.css', () => ({}))

import useBorderGuessState from '../../../hooks/useBorderGuessState'

const makeHook = (overrides = {}) => ({
  inputValue: '',
  setInputValue: vi.fn(),
  guesses: [],
  isSolved: false,
  isComplete: false,
  answerName: 'France',
  filteredCountrySuggestions: [],
  handleSubmit: vi.fn(),
  revealCountry: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  useBorderGuessState.mockReturnValue(makeHook())
})

describe('ChillGuessInput — locked au montage', () => {
  it('affiche En attente sans appeler onSubmit', () => {
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={true} onSubmit={onSubmit} />)
    expect(screen.getByText('⏳ En attente…')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ne appelle pas onSubmit même si isComplete=true quand locked au montage', () => {
    useBorderGuessState.mockReturnValue(makeHook({ isComplete: true, isSolved: true, guesses: [] }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={true} onSubmit={onSubmit} />)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('ChillGuessInput — soumission', () => {
  it('appelle onSubmit avec correct=true et score=3 quand résolu sans erreur', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [{ value: 'France', isCorrect: true, distanceKm: 0, directionArrow: null }],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, score: 3, guesses: ['France'] })
  })

  it('appelle onSubmit avec correct=true et score=2 quand résolu après 1 erreur', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [
        { value: 'Allemagne', isCorrect: false, distanceKm: 1200, directionArrow: '→' },
        { value: 'France', isCorrect: true, distanceKm: 0, directionArrow: null },
      ],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: true, score: 2, guesses: ['Allemagne', 'France'] })
  })

  it('appelle onSubmit avec correct=false et score=0 quand abandonné', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: false,
      isComplete: true,
      guesses: [{ value: 'Espagne', isCorrect: false, distanceKm: 1500, directionArrow: '↑' }],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: false, score: 0, guesses: ['Espagne'] })
  })

  it('appelle onSubmit avec guesses=[] quand abandonné sans essai', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: false,
      isComplete: true,
      guesses: [],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledWith({ correct: false, score: 0, guesses: [] })
  })

  it('n\'appelle onSubmit qu\'une seule fois même si re-render', () => {
    useBorderGuessState.mockReturnValue(makeHook({
      isSolved: true,
      isComplete: true,
      guesses: [{ value: 'France', isCorrect: true }],
      answerName: 'France',
    }))
    const onSubmit = vi.fn()
    const { rerender } = render(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    rerender(<ChillGuessInput country={{}} locked={false} onSubmit={onSubmit} />)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('ChillGuessInput — rendu input actif', () => {
  it('affiche les boutons Proposer et Abandonner quand non locked', () => {
    render(<ChillGuessInput country={{}} locked={false} onSubmit={vi.fn()} />)
    expect(screen.getByText('Proposer')).toBeInTheDocument()
    expect(screen.getByText('Abandonner')).toBeInTheDocument()
  })

  it('affiche le message résolu quand isSolved=true', () => {
    useBorderGuessState.mockReturnValue(makeHook({ isSolved: true, isComplete: true, guesses: [], answerName: 'France' }))
    render(<ChillGuessInput country={{}} locked={false} onSubmit={vi.fn()} />)
    expect(screen.getByText('✓ France')).toBeInTheDocument()
  })

  it('affiche le message echec quand isComplete=true et isSolved=false', () => {
    useBorderGuessState.mockReturnValue(makeHook({ isSolved: false, isComplete: true, guesses: [], answerName: 'France' }))
    render(<ChillGuessInput country={{}} locked={false} onSubmit={vi.fn()} />)
    expect(screen.getByText("✗ C'était : France")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent (fichier non créé)**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|ChillGuessInput|Cannot find"
```

Attendu : erreur `Cannot find module './ChillGuessInput'`

---

## Task 2 : Implémenter ChillGuessInput

**Files:**
- Create: `src/components/multiplayer/chill/ChillGuessInput.jsx`

- [ ] **Step 1 : Créer le composant**

```jsx
// src/components/multiplayer/chill/ChillGuessInput.jsx
import { useEffect, useRef } from 'react'
import { ToastContainer } from 'react-toastify'
import useBorderGuessState from '../../../hooks/useBorderGuessState'
import { getGuessGamePoints } from '../../../utils/scoringRules'
import 'react-toastify/dist/ReactToastify.css'

export default function ChillGuessInput({ country, locked, onSubmit }) {
  const lockedAtMount = useRef(locked)
  const submittedRef = useRef(false)

  const {
    inputValue, setInputValue,
    guesses, isSolved, isComplete, answerName,
    filteredCountrySuggestions,
    handleSubmit, revealCountry,
  } = useBorderGuessState('daily', { overrideCountry: country })

  useEffect(() => {
    if (!isComplete || lockedAtMount.current || submittedRef.current) return
    submittedRef.current = true
    const wrongGuesses = guesses.filter(g => !g.isCorrect).length
    onSubmit({
      correct: isSolved,
      score: isSolved ? getGuessGamePoints(wrongGuesses) : 0,
      guesses: guesses.map(g => g.value),
    })
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  if (lockedAtMount.current) {
    return (
      <div style={{ padding: '10px 14px', color: '#64748b', fontSize: '1rem', textAlign: 'center' }}>
        ⏳ En attente…
      </div>
    )
  }

  const trimmedInput = inputValue.trim()
  const showSuggestions = !isComplete &&
    filteredCountrySuggestions.length > 0 &&
    !filteredCountrySuggestions.some(n => n === trimmedInput)

  return (
    <div>
      {isComplete ? (
        <div style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'center', fontWeight: 600,
          background: isSolved ? '#166534' : '#7f1d1d',
          color: isSolved ? '#86efac' : '#fca5a5',
          marginBottom: 12,
        }}>
          {isSolved ? `✓ ${answerName}` : `✗ C'était : ${answerName}`}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Nom du pays…"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', fontSize: '1rem',
                borderRadius: 8, border: '2px solid #3b82f6',
                background: '#0f172a', color: '#f1f5f9', outline: 'none',
              }}
            />
            {showSuggestions && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto',
              }}>
                {filteredCountrySuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setInputValue(name)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 14px', background: 'none', border: 'none',
                      color: '#f1f5f9', cursor: 'pointer', fontSize: '0.95rem',
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Proposer
            </button>
            <button
              onClick={revealCountry}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: '#334155', color: '#94a3b8', cursor: 'pointer',
              }}
            >
              Abandonner
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...guesses].reverse().map((guess, i) => (
          <div
            key={i}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 12px', borderRadius: 8,
              background: guess.isCorrect ? '#166534' : '#1e293b',
              color: guess.isCorrect ? '#86efac' : '#f1f5f9',
            }}
          >
            <span>{guess.isCorrect ? '✓' : '✗'} {guess.value}</span>
            {!guess.isCorrect && guess.distanceKm != null && (
              <small style={{ color: '#94a3b8' }}>
                {guess.directionArrow} {guess.distanceKm.toLocaleString('fr-FR')} km
              </small>
            )}
          </div>
        ))}
      </div>

      <ToastContainer
        enableMultiContainer
        containerId="topRightToast"
        position="top-right"
        autoClose={1500}
        theme="dark"
        hideProgressBar
      />
    </div>
  )
}
```

- [ ] **Step 2 : Lancer les tests**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|ChillGuessInput"
```

Attendu : tous les tests `ChillGuessInput` passent en vert.

- [ ] **Step 3 : Commit**

```bash
git add src/components/multiplayer/chill/ChillGuessInput.jsx src/components/multiplayer/chill/ChillGuessInput.test.jsx
git commit -m "feat: add ChillGuessInput with multi-attempt support for chill mode"
```

---

## Task 3 : Tests ChillReview — affichage guesses (TDD)

**Files:**
- Create: `src/components/multiplayer/chill/ChillReview.test.jsx`

- [ ] **Step 1 : Créer le fichier de tests**

```jsx
// src/components/multiplayer/chill/ChillReview.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChillReview from './ChillReview'

const players = { p1: { pseudo: 'Alice' } }

const baseProps = {
  mancheCountries: [{ properties: { ADMIN: 'France', capital: 'Paris' } }],
  mancheStartIndex: 0,
  players,
  isHost: false,
  gameType: 'BORDER_GUESS',
  onNext: vi.fn(),
  onContinue: vi.fn(),
}

describe('ChillReview — step 0 (résumé)', () => {
  it('affiche le pseudo du joueur', () => {
    const playerAnswers = { p1: { '0': { correct: true, score: 3, guesses: ['France'] } } }
    render(<ChillReview {...baseProps} reviewStep={0} playerAnswers={playerAnswers} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

describe('ChillReview — affichage guesses multiples (BORDER_GUESS)', () => {
  it('affiche N tentatives et la liste avec séparateur →', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, score: 0, guesses: ['Allemagne', 'Espagne'] } },
    }
    render(<ChillReview {...baseProps} reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('2 tentatives')).toBeInTheDocument()
    expect(screen.getByText('Allemagne → Espagne')).toBeInTheDocument()
  })

  it('affiche 1 tentative au singulier', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, score: 0, guesses: ['Allemagne'] } },
    }
    render(<ChillReview {...baseProps} reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('1 tentative')).toBeInTheDocument()
    expect(screen.getByText('Allemagne')).toBeInTheDocument()
  })

  it('affiche "(rien)" quand guesses est tableau vide', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, score: 0, guesses: [] } },
    }
    render(<ChillReview {...baseProps} reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('(rien)')).toBeInTheDocument()
  })
})

describe('ChillReview — rétrocompatibilité (FLAGS / CAPITALS)', () => {
  it('affiche answer.answer quand guesses absent', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, answer: 'Brésil' } },
    }
    render(<ChillReview {...baseProps} gameType="FLAGS" reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('Brésil')).toBeInTheDocument()
  })

  it('affiche "(rien)" quand answer.answer est vide et guesses absent', () => {
    const playerAnswers = {
      p1: { '0': { correct: false, answer: '' } },
    }
    render(<ChillReview {...baseProps} gameType="FLAGS" reviewStep={1} playerAnswers={playerAnswers} />)
    expect(screen.getByText('(rien)')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Vérifier que les tests guesses échouent**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "ChillReview|tentative|FAIL"
```

Attendu : les tests `affiche N tentatives` et `affiche 1 tentative` échouent.

---

## Task 4 : Modifier ChillReview pour afficher guesses

**Files:**
- Modify: `src/components/multiplayer/chill/ChillReview.jsx` lignes 99-121

- [ ] **Step 1 : Remplacer la section "Réponse donnée" (lignes 99-121)**

Trouver et remplacer ce bloc dans `ChillReview.jsx` :

```jsx
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
```

Remplacer par :

```jsx
  const guessesArr = current.answer.guesses
  const givenAnswer = current.answer.answer ?? current.answer.clickedAdmin ?? null

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
          {guessesArr?.length > 0
            ? <>
                <div style={{ color: '#94a3b8', fontSize: '0.85em', marginTop: 2 }}>
                  {guessesArr.length} tentative{guessesArr.length > 1 ? 's' : ''}
                </div>
                <div style={{ color: '#fca5a5' }}>{guessesArr.join(' → ')}</div>
              </>
            : <div style={{ color: '#fca5a5' }}>{givenAnswer || '(rien)'}</div>
          }
        </div>
```

- [ ] **Step 2 : Lancer les tests**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "ChillReview|PASS|FAIL"
```

Attendu : tous les tests `ChillReview` passent en vert.

- [ ] **Step 3 : Lancer la suite complète**

```bash
npm test 2>&1 | tail -10
```

Attendu : aucun test en échec.

- [ ] **Step 4 : Commit**

```bash
git add src/components/multiplayer/chill/ChillReview.jsx src/components/multiplayer/chill/ChillReview.test.jsx
git commit -m "feat: display multi-attempt guesses list in ChillReview"
```

---

## Task 5 : Wiring dans ChillGame

**Files:**
- Modify: `src/components/multiplayer/chill/ChillGame.jsx` lignes 371-392

- [ ] **Step 1 : Ajouter l'import ChillGuessInput**

Dans `ChillGame.jsx`, après la ligne `import ChillPlacementReview from './ChillPlacementReview'`, ajouter :

```jsx
import ChillGuessInput from './ChillGuessInput'
```

- [ ] **Step 2 : Remplacer le bloc BORDER_GUESS / COUNTRY_CLUE dans renderTextInput()**

Trouver et remplacer ce bloc (lignes ~371-392) :

```jsx
    if (gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE) {
      const target = currentCountry.properties?.ADMIN
      const aliases = currentCountry.properties?.aliases ?? []
      return (
        <>
          {gameConfig.type === GAME_TYPES.BORDER_GUESS
            ? <BorderGuessDisplay country={currentCountry} />
            : <CountryClueDisplay country={currentCountry} />
          }
          <ChillTextInput
            key={chillState.currentCountryIndex}
            countdownEnd={null}
            locked={alreadyAnswered}
            placeholder="Nom du pays…"
            onSubmit={(answer) => {
              const evalResult = evaluateGuessAnswer(answer, target, aliases)
              handleSubmitAnswer({ answer, ...evalResult })
            }}
          />
        </>
      )
    }
```

Remplacer par :

```jsx
    if (gameConfig.type === GAME_TYPES.BORDER_GUESS || gameConfig.type === GAME_TYPES.COUNTRY_CLUE) {
      return (
        <>
          {gameConfig.type === GAME_TYPES.BORDER_GUESS
            ? <BorderGuessDisplay country={currentCountry} />
            : <CountryClueDisplay country={currentCountry} />
          }
          <ChillGuessInput
            key={chillState.currentCountryIndex}
            country={currentCountry}
            locked={alreadyAnswered}
            onSubmit={(result) => handleSubmitAnswer(result)}
          />
        </>
      )
    }
```

- [ ] **Step 3 : Vérifier le build**

```bash
npm run build 2>&1 | tail -15
```

Attendu : `✓ built in` sans erreur.

- [ ] **Step 4 : Lancer la suite de tests complète**

```bash
npm test 2>&1 | tail -10
```

Attendu : aucun test en échec.

- [ ] **Step 5 : Commit**

```bash
git add src/components/multiplayer/chill/ChillGame.jsx
git commit -m "feat: wire ChillGuessInput into ChillGame for BORDER_GUESS and COUNTRY_CLUE"
```

---

## Vérification manuelle post-implémentation

1. Lancer `npm run dev`
2. Créer une room multijoueur Chill avec type BORDER_GUESS
3. Vérifier : input + dropdown de suggestions apparaissent, bouton "Proposer" et "Abandonner" visibles
4. Soumettre une mauvaise réponse → chip ✗ avec distance/direction s'affiche, input reste actif
5. Soumettre la bonne réponse → chip ✓ apparaît, composant verrouillé, le host avance automatiquement
6. Cliquer "Abandonner" → le pays est révélé, `onSubmit` est déclenché
7. En review : vérifier l'affichage "N tentatives : X → Y → Z" dans la section erreurs
8. Tester avec COUNTRY_CLUE : même comportement attendu
9. Tester avec FLAGS / CAPITALS : comportement inchangé (ChillTextInput toujours utilisé)

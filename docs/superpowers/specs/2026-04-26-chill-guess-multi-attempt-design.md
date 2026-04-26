# Chill Multi — Tentatives multiples pour BORDER_GUESS / COUNTRY_CLUE

**Date :** 2026-04-26

## Contexte

En mode multijoueur Chill, les types BORDER_GUESS et COUNTRY_CLUE utilisaient `ChillTextInput`, qui se verrouille après une seule soumission. Le jeu solo équivalent permet des tentatives illimitées avec retour distance/direction. Cette spec aligne le mode chill sur ce comportement.

---

## Périmètre

Fichiers touchés :
- `src/components/multiplayer/chill/ChillGuessInput.jsx` — nouveau composant
- `src/components/multiplayer/chill/ChillGame.jsx` — remplacement du bloc BORDER_GUESS/COUNTRY_CLUE
- `src/components/multiplayer/chill/ChillReview.jsx` — affichage des tentatives multiples

Fichiers inchangés : `chillModeUtils.js` (évaluateGuessAnswer conservée mais plus appelée pour ces types), `useBorderGuessState.js`, `scoringRules.js`, Firebase/multiplayerRoom.

---

## Schéma de données stocké (Firebase)

Payload passé à `handleSubmitAnswer` / écrit dans `playerAnswers[playerId][idx]` :

```js
{
  correct: boolean,           // true si résolu
  score: number,              // getGuessGamePoints(wrongGuesses)
  guesses: string[],          // noms des pays soumis dans l'ordre (ex. ['Allemagne', 'France'])
}
```

Rétrocompatible : les autres types (FLAGS, CAPITALS, PLACEMENT) continuent d'écrire `{ correct, score, answer }` ou `{ correct, score, clickedAdmin }`.

---

## `ChillGuessInput.jsx` (nouveau)

### Props

| Prop | Type | Description |
|---|---|---|
| `country` | GeoJSON feature | Pays cible |
| `locked` | boolean | Vrai si le joueur a déjà répondu pour ce pays |
| `onSubmit` | `({ correct, score, guesses }) => void` | Appelé une seule fois à completion |

### Comportement

- **Si `locked=true` au montage** : afficher `<div>⏳ En attente…</div>`, ne jamais appeler `onSubmit`. La valeur initiale est capturée par `useRef` pour ignorer les re-renders.
- **Sinon** : monter `useBorderGuessState('daily', { overrideCountry: country })`. Grâce au `key={currentCountryIndex}` dans le parent, le composant est remonté à chaque nouveau pays → réinitialisation propre du hook.
- **Quand `isComplete` passe à `true`** : un `useEffect` avec ref guard appelle `onSubmit` exactement une fois :
  ```js
  const wrongGuesses = guesses.filter(g => !g.isCorrect).length
  onSubmit({
    correct: isSolved,
    score: isSolved ? getGuessGamePoints(wrongGuesses) : 0,
    guesses: guesses.map(g => g.value),
  })
  ```
- **UI active** (non verrouillée, non complète) :
  - Input texte avec dropdown de suggestions filtrées (pattern identique à `MultiplayerBorderGuess`)
  - Bouton « Proposer » (ou Entrée)
  - Bouton « Abandonner » → `revealCountry()`
  - Historique inversé : chips ✓/✗ avec distance km et flèche direction pour les erreurs
- **UI complète** (après résolution ou abandon) :
  - Message ✓ `answerName` (vert) ou ✗ `C'était : answerName` (rouge)
  - Historique toujours affiché
- `ToastContainer enableMultiContainer containerId="topRightToast"` inclus dans le composant.

---

## `ChillGame.jsx` — changements

Dans `renderTextInput()`, remplacer le bloc BORDER_GUESS / COUNTRY_CLUE (lignes ~371-392) :

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

Import à ajouter : `import ChillGuessInput from './ChillGuessInput'`

---

## `ChillReview.jsx` — changements

Dans le bloc d'affichage d'une erreur (section "Réponse donnée"), détecter la présence du champ `guesses` :

```jsx
const guessesArr = current.answer.guesses         // string[] | undefined
const givenAnswer = current.answer.answer ?? current.answer.clickedAdmin ?? null

// Rendu :
{guessesArr?.length > 0
  ? <>
      <div style={{ color: '#94a3b8', fontSize: '0.85em', marginBottom: 4 }}>
        {guessesArr.length} tentative{guessesArr.length > 1 ? 's' : ''}
      </div>
      <div style={{ color: '#fca5a5' }}>{guessesArr.join(' → ')}</div>
    </>
  : <div style={{ color: '#fca5a5' }}>{givenAnswer || '(rien)'}</div>
}
```

Rétrocompatible : FLAGS, CAPITALS, PLACEMENT continuent d'afficher `answer.answer` / `clickedAdmin` comme avant.

---

## Scoring

`getGuessGamePoints(wrongGuesses)` depuis `scoringRules.js` :
- 0 erreur → 3 pts
- 1-2 erreurs → 2 pts
- 3+ erreurs → 0 pt

Si `correct = false` (abandon ou erreurs), `score = 0` explicitement — pas d'appel à `getGuessGamePoints`. Évite de stocker un score positif pour une tentative échouée.

---

## Ce qui n'est PAS dans ce scope

- Afficher les flèches/distances dans `ChillReview` (données non stockées)
- Modifier le flow d'avancement host (le mécanisme "tous ont répondu" reste inchangé)
- Modifier `evaluateGuessAnswer` dans `chillModeUtils.js`

# Design : Anti-triche multijoueur — Blocage du replay après refresh

Date : 2026-04-10

## Problème

Un joueur peut tricher en :
1. Révélant tous les pays rapidement pour terminer le round (et mémoriser les réponses)
2. Actualisant la page — le jeu repart de zéro (roundIndex = 0) car le snapshot de fin ne contient pas `roundIndex`
3. Rejouant la partie avec la connaissance des réponses, écrasant ses anciens résultats dans Firestore si les autres joueurs n'ont pas encore terminé

Ce comportement est possible sur tous les types de jeux.

## Cause racine

Dans `MultiplayerGame.jsx`, la variable `alreadyCompleted` est calculée correctement depuis le snapshot local, mais n'est jamais utilisée pour bloquer le rendu du jeu. `renderGame()` s'exécute toujours, quel que soit l'état.

## Solution retenue : Option 3 (snapshot local + confirmation Firestore)

### Logique de blocage

Introduire un state `isFinished` dans `MultiplayerGame.jsx` :

- Initialisé à `true` si `snap?.completed === true` (snapshot localStorage) → blocage immédiat, sans flash
- Se met à `true` via un `useEffect` si `progress[playerId]?.finished === true` arrive depuis Firestore → protection si le localStorage est vide

```js
const [isFinished, setIsFinished] = React.useState(() => alreadyCompleted)

useEffect(() => {
  if (!isFinished && progress[playerId]?.gameIndex === gameIndex && progress[playerId]?.finished === true) {
    setIsFinished(true)
  }
}, [progress, playerId, gameIndex, isFinished])
```

Quand `isFinished === true`, `renderGame()` est remplacé par l'écran d'attente.

### Écran d'attente

Affiché dans `mp-game-content` (même cadre que le jeu). Le LiveSidebar reste intact.

```jsx
<div className="mp-game-finished-wait">
  <p className="mp-game-finished-icon">✓</p>
  <h2>Tu as terminé !</h2>
  <p>En attente des autres joueurs...</p>
</div>
```

Styles ajoutés dans `MultiplayerGame.css` : centré, sobre.

## Fichiers modifiés

- `src/components/multiplayer/MultiplayerGame.jsx` — logique `isFinished` + rendu conditionnel
- `src/components/multiplayer/MultiplayerGame.css` — styles de l'écran d'attente

## Fichiers non modifiés

- `MultiplayerBorderGuess.jsx`, `MultiplayerCountryClue.jsx` et autres composants de jeu — le bug du `roundIndex = 0` disparaît de facto car ces composants ne montent jamais quand `isFinished = true`
- `multiplayerRoom.js`, `multiplayerSnapshot.js` — aucun changement

## Comportement après le fix

| Situation | Avant | Après |
|---|---|---|
| Refresh après avoir terminé (localStorage intact) | Jeu repart de 0 | Écran d'attente immédiat |
| Refresh après avoir terminé (localStorage vidé) | Jeu repart de 0 | Écran d'attente dès réception Firestore |
| Refresh en cours de partie | Reprend depuis le snapshot | Inchangé |
| Déconnexion/reconnexion normale | Fonctionne | Inchangé |

# Design : Boutons de navigation en fin de partie

**Date :** 2026-04-01

## Contexte

Quand la partie se termine (`isGameOver`), une overlay apparaît avec le formulaire de sauvegarde du score. Les boutons "Accueil" et "Recommencer" du HUD sont cachés derrière cette overlay et inaccessibles. L'utilisateur est bloqué sans possibilité de naviguer s'il ne veut pas sauvegarder.

## Objectif

Ajouter deux boutons de navigation directement dans l'overlay de fin de partie, toujours visibles, indépendamment de la sauvegarde du score.

## Décision

**Option A retenue :** Ajouter les boutons dans `GamePage.jsx` à l'intérieur du bloc `game-over-overlay`, sous le composant `<Form>`.

## Changements

### `src/pages/GamePage.jsx`

Modifier le bloc `game-over-overlay` pour y inclure les boutons :

```jsx
{isGameOver && (
  <div className="game-over-overlay">
    <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} />
    <div className="game-over-actions">
      <button className="hud-btn hud-btn--restart" onClick={restartGame}>
        ↺ Recommencer
      </button>
      <button className="hud-btn hud-btn--home" onClick={goHome}>
        ← Accueil
      </button>
    </div>
  </div>
)}
```

### Fichiers non modifiés

- `form.jsx` — reste centré sur la sauvegarde du score uniquement
- `useGameState.js` — `restartGame` et `goHome` existent déjà
- Aucun nouveau CSS — les classes `hud-btn`, `hud-btn--restart`, `hud-btn--home` existent déjà

## Comportement attendu

- Les boutons sont visibles dès l'apparition de l'overlay
- Cliquer "Recommencer" réinitialise la partie (même difficulté) et ferme l'overlay
- Cliquer "Accueil" navigue vers `/`
- L'utilisateur peut sauvegarder son score avant ou après, ou ne pas le faire du tout

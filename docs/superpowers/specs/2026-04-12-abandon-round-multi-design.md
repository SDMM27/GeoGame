# Design : Bouton Abandonner le Round (Multijoueur)

**Date :** 2026-04-12  
**Statut :** Approuvé

---

## Contexte

En mode multijoueur, un joueur peut vouloir passer un round sans le terminer. Actuellement, il n'existe aucun moyen de le faire — le joueur est bloqué jusqu'à ce qu'il finisse ou que les autres joueurs terminent et déclenchent la transition automatique.

---

## Comportement souhaité

- N'importe quel joueur peut abandonner le round en cours individuellement
- Le joueur abandonnant obtient automatiquement la **dernière place** pour ce round
- Il **continue de participer** aux rounds suivants normalement
- Une **confirmation** est demandée pour éviter les clics accidentels

---

## Architecture & Données

### Champ Firestore — `progress/{playerId}`

Un seul champ ajouté au document de progression existant :

```js
{
  // Champs existants inchangés
  finished: true,
  weightedScore: 0,
  countriesSolved: 0,
  attempts: 0,
  elapsedTime: 0,
  // ...

  // Nouveau champ
  abandoned: true   // présent uniquement en cas d'abandon
}
```

### Nouvelle fonction — `multiplayerRoom.js`

```js
abandonRound(roomId, playerId)
```

Écrit dans `progress/{playerId}` :
- `abandoned: true`
- `finished: true`
- Tous les scores à 0 : `weightedScore`, `countriesSolved`, `attempts`, `elapsedTime`, `perfects`, `stumbles`, `failures`, `countriesFound`

### Impact sur `rankResults()`

Les joueurs avec `abandoned: true` sont placés **systématiquement après** tous les joueurs qui ont joué. Si plusieurs joueurs abandonnent dans le même round, ils partagent la dernière position (même rang → même nombre de points).

---

## Composants UI

### Bouton "Abandonner le round"

- Affiché dans : `MultiplayerGame.jsx`, `MultiplayerBorderGuess.jsx`, `MultiplayerCountryClue.jsx`
- Positionné en bas, style secondaire/danger
- **Masqué** si le joueur a déjà `finished: true`
- Au clic, ouvre la modale de confirmation

### Modale de confirmation

```
┌─────────────────────────────────────┐
│  ⚠️  Abandonner ce round ?           │
│                                     │
│  Tu seras classé dernier pour       │
│  ce round, mais tu pourras          │
│  continuer les rounds suivants.     │
│                                     │
│  [ Continuer à jouer ]  [ Abandonner ]│
└─────────────────────────────────────┘
```

### `BetweenGamesScreen.jsx`

Pour les joueurs avec `abandoned: true` dans les résultats :
- Badge "(abandonné)" affiché à côté de leur nom
- Score affiché comme `—` plutôt que `0`

---

## Flux complet

```
Joueur clique "Abandonner le round"
  → Modale de confirmation s'ouvre
  → Joueur confirme
  → abandonRound(roomId, playerId)
     → Firestore: progress { abandoned: true, finished: true, scores: 0 }
  → L'effet "tous finished" dans MultiplayerGame se déclenche normalement
  → rankResults() place les abandonnés en dernier
  → Transition vers between_games
  → BetweenGamesScreen affiche "(abandonné)" pour ce joueur
  → Rounds suivants : joueur participe normalement
```

---

## Cas limites

| Situation | Comportement |
|---|---|
| Tous les joueurs abandonnent | Tous à égalité dernière place → tous gagnent 1 point |
| Dernier joueur actif abandonne | Déclenche immédiatement la transition `between_games` |
| Joueur déconnecté vs abandonné | Inchangé — géré séparément via `disconnected: true` |
| Hôte abandonne | Identique aux autres joueurs (les contrôles hôte sont dans `BetweenGamesScreen`, pas pendant le jeu) |
| Joueur a déjà `finished: true` | Bouton non affiché, abandon impossible |

---

## Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/utils/multiplayerRoom.js` | Ajouter `abandonRound()` |
| `src/utils/multiplayerScoring.js` | Modifier `rankResults()` pour placer les abandonnés en dernier |
| `src/components/multiplayer/MultiplayerGame.jsx` | Ajouter bouton + modale |
| `src/components/multiplayer/MultiplayerBorderGuess.jsx` | Ajouter bouton + modale |
| `src/components/multiplayer/MultiplayerCountryClue.jsx` | Ajouter bouton + modale |
| `src/components/multiplayer/BetweenGamesScreen.jsx` | Afficher badge "(abandonné)" |

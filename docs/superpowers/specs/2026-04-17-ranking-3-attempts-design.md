# Design : 3 essais pour le Country Ranking

**Date :** 2026-04-17

## Contexte

Le jeu de classement (Country Ranking) n'offre actuellement qu'une seule soumission par round. Ce design ajoute 3 essais avec feedback visuel, une révision du scoring, et une mise à jour du leaderboard.

---

## 1. État du jeu — `useRankingGameState`

### Nouveaux champs dans le state

```js
attemptNumber: 1,        // essai en cours (1, 2, 3)
positionFeedback: null,  // null = pas encore soumis
                         // tableau de booleans : positionFeedback[i] = true si position i correcte
gameOver: false,         // true quand totalError=0 OU 3 essais épuisés
finalScore: null,        // 3 / 2 / 1 / 0
bestTotalError: null,    // plus petit totalError atteint sur tous les essais
```

### Logique `handleSubmit` modifiée

1. Calcule `totalError` (inchangé)
2. Met à jour `bestTotalError` = min(bestTotalError actuel, totalError)
3. Calcule `positionFeedback` = tableau de booleans (position i correcte si playerOrder[i] === correctOrder[i])
4. Si `totalError === 0` → `finalScore = 4 - attemptNumber`, `gameOver = true`
5. Sinon si `attemptNumber === 3` → `finalScore = 0`, `gameOver = true`
6. Sinon → incrémente `attemptNumber`, affiche le feedback, le joueur peut réessayer

La soumission au leaderboard est déclenchée uniquement quand `gameOver = true`.

---

## 2. Feedback visuel — `RankingGamePage`

- Chaque ligne du classement affiche une couleur après soumission :
  - **Vert** : position correcte (`positionFeedback[i] === true`)
  - **Rouge** : position incorrecte
- Indicateur `Essai X/3` visible en haut du jeu
- Bouton **"Réessayer"** remplace "Soumettre" quand il reste des essais et que le jeu n'est pas terminé
- Quand `gameOver = true` et `finalScore = 0` : révèle le bon ordre

---

## 3. Score

| Condition | Score |
|---|---|
| `totalError = 0` au 1er essai | 3 pts |
| `totalError = 0` au 2e essai | 2 pts |
| `totalError = 0` au 3e essai | 1 pt |
| Jamais `totalError = 0` | 0 pt |

---

## 4. Leaderboard

### Données Firestore (`daily_scores`)

Champs ajoutés/modifiés :

```js
{
  score,          // 3 / 2 / 1 / 0
  totalError,     // bestTotalError (meilleur des 3 essais)
  attemptsUsed,   // 1, 2, ou 3
  playerOrder,    // ordre soumis au meilleur essai
}
```

### Tri (`sortRankingScores`)

1. `score` DESC
2. `totalError` ASC (tiebreaker — inchangé, maintenant = bestTotalError)

### Affichage

- Colonne ou badge indiquant le nombre d'essais utilisés (ex: "1 essai", "2 essais")
- Compatibilité ascendante : anciennes entrées sans `attemptsUsed` affichent `"-"`

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/hooks/useRankingGameState.js` | Nouveaux champs state, logique handleSubmit |
| `src/pages/RankingGamePage.jsx` | Feedback visuel, compteur essais, bouton réessayer |
| `src/pages/RankingLeaderboard.jsx` | Colonne attemptsUsed |
| `src/utils/scoringRules.js` | Nouvelle fonction ou modification de `getRankingGamePoints` |
| `src/utils/rankingScores.js` | Tri inchangé (totalError ASC reste valide) |

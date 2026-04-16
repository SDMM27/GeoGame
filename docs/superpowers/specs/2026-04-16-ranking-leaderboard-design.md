# Design : Leaderboard dédié pour le jeu Classement

**Date :** 2026-04-16  
**Périmètre :** Remplacer `DailyLeaderboard` par un composant `RankingLeaderboard` adapté aux données du jeu classement.

---

## Contexte

Le composant `DailyLeaderboard` est générique et affiche les colonnes **Essais / Temps**, adaptées au jeu de devinette. Le jeu classement stocke dans Firestore des champs différents : `score` (points) et `totalError` (erreur en positions). Ces colonnes sont donc vides et non pertinentes pour le jeu classement.

## Objectif

Afficher un leaderboard journalier correct pour le jeu classement : colonnes **# / Joueur / Score / Erreur**, trié par score décroissant puis erreur croissante.

---

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/pages/RankingLeaderboard.jsx` | Créer |
| `src/pages/RankingLeaderboard.css` | Créer |
| `src/pages/RankingGamePage.jsx` | Modifier : remplacer `<DailyLeaderboard>` par `<RankingLeaderboard>` |

`DailyLeaderboard` et `dailyScores.js` restent **inchangés**.

---

## Composant `RankingLeaderboard`

### Props

```js
RankingLeaderboard({ dailyKey: string })
```

`gameType` est toujours `GAME_TYPES.RANKING` — pas besoin de le passer en prop.

### Fetch Firestore

Même logique que `DailyLeaderboard` :
- Collection `daily_scores`
- Filtres : `gameType == GAME_TYPES.RANKING` et `dailyKey == selectedDate`

### Tri

Fonction locale `sortRankingScores(scores)` :
1. Score décroissant (`b.score - a.score`)
2. À égalité : totalError croissant (`a.totalError - b.totalError`)

### Navigation par date

Identique à `DailyLeaderboard` :
- Boutons pour les 7 derniers jours
- Toggle "Voir tout l'historique" + `<input type="date">`

### Affichage

**Header :** `# | Joueur | Score | Erreur`

**Ligne :**
- Rang : médaille (🥇🥈🥉) pour top 3, sinon `#N`
- Pseudo (`score.name`)
- Score : `85 pts`
- Erreur : `3 pos.`

Pas d'accordéon (aucune donnée de guesses stockée pour ce jeu).

### Styles

Réutilise les classes `.daily-lb__*` existantes via `DailyLeaderboard.css` + un fichier `RankingLeaderboard.css` pour les colonnes spécifiques (Score/Erreur).

---

## Données Firestore (existantes)

Le document sauvegardé dans `daily_scores` pour le jeu classement contient :

```js
{ name, gameType, dailyKey, score, totalError }
```

Aucune migration nécessaire.

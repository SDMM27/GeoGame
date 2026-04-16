# Ranking Game — Design Spec
*Date : 2026-04-15*

## Vue d'ensemble

Nouveau mode de jeu où le joueur classe N pays selon un critère (population, superficie, PIB, densité) par glisser-déposer, du plus grand au plus petit. Disponible en mode journalier et infini, dans le style de Country Clue et Border Guess.

---

## Architecture

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `src/hooks/useRankingGameState.js` | Logique d'état du jeu (mode daily/infinite, scoring, timer) |
| `src/pages/RankingGamePage.jsx` | Page principale du jeu |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/data/countriesWithDifficulty_FR.json` | Ajout du champ `gdp` (PIB en milliards USD) sur chaque pays |
| `src/utils/gameTypes.js` | Ajout de `RANKING: 'RANKING'` |
| `src/utils/scoringRules.js` | Ajout de `getRankingGamePoints(totalError, n)` |
| `src/App.jsx` | Route `/ranking` |
| `src/pages/HomePage.jsx` | Carte du jeu dans la liste |

---

## Données

### Nouveau champ JSON

```json
{ "gdp": 2716 }
```
PIB nominal en milliards USD. Valeur `null` pour les pays sans donnée fiable (micro-États, territoires). Ces pays sont exclus du pool quand le critère est PIB.

### Critères disponibles

| Clé | Label | Source | Unité d'affichage |
|---|---|---|---|
| `population` | Population | Champ JSON existant | Formaté (1,4 Md / 335 M / 68 M) |
| `area` | Superficie | Calculée depuis geometry (déjà dans le projet) | km² |
| `gdp` | PIB | Nouveau champ `gdp` | Mrd $ |
| `density` | Densité | Calculé : `population / area` | hab/km² |

### Sens du classement

Toujours du **plus grand au plus petit**. Le libellé affiché au joueur précise explicitement : *"Classe du plus [peuplé/grand/riche/dense] au moins [peuplé/grand/riche/dense]"*.

---

## Modes de jeu

### Mode Journalier

- Seed basé sur la date (Paris timezone) : `hash("ranking:" + dateKey)`
- Le seed détermine à la fois le critère et les 6 pays sélectionnés
- **6 pays** par round (valeur fixe pour le daily)
- Progression sauvegardée en localStorage avec clé `ranking-daily:YYYY-MM-DD`
- État sauvegardé :
  ```js
  {
    criterion: 'population',
    initialOrder: [...],    // ordre initial aléatoire (ISO codes) — ne change pas
    playerOrder: [...],     // ordre actuel du joueur (ISO codes) — mis à jour après chaque drag
    status: 'playing' | 'submitted',
    score: 0 | 1 | 2 | 3,
    totalError: number,
    elapsedTime: number,    // ms
    startedAt: timestamp
  }
  ```
- Après soumission : formulaire de dépôt au leaderboard Firebase (`gameType: 'RANKING'`, `dailyKey`, `score`, `totalError`, `elapsedTime`)
- Leaderboard trié par `score DESC`, puis `elapsedTime ASC`

### Mode Infini

- Le joueur choisit la difficulté avant de commencer :
  - Facile → 5 pays
  - Moyen → 8 pays
  - Difficile → 10 pays
- Critère tiré aléatoirement à chaque round
- Pas de soumission Firebase, score local affiché en session
- Bouton "Round suivant" après soumission

---

## Scoring

### Formule

```
totalError = Σ |position_joueur[i] - position_correcte[i]|  (pour i = 0..N-1)
```

Les positions sont 0-indexées. `position_correcte` est le rang dans le tableau trié par valeur décroissante du critère.

### Barème (fonction `getRankingGamePoints(totalError, n)`)

| Condition | Points |
|---|---|
| `totalError === 0` | 3 |
| `totalError <= n` | 2 |
| `totalError <= 2 * n` | 1 |
| `totalError > 2 * n` | 0 |

**Exemples :**
- N=5 : 0→3, 1-5→2, 6-10→1, >10→0
- N=8 : 0→3, 1-8→2, 9-16→1, >16→0
- N=10 : 0→3, 1-10→2, 11-20→1, >20→0

---

## Interface utilisateur

### Pendant le round

1. **Bannière critère** (en haut) : icône + nom du critère + libellé de consigne
2. **Timer** (coin haut droit) : démarre au clic sur le bouton "Démarrer le chrono" (pattern identique à Country Clue)
3. **Liste drag-and-drop** : N cartes avec poignée `⠿`, numéro de position, drapeau, nom du pays
4. **Bouton "Soumettre mon classement"** : actif dès le départ (le joueur peut soumettre sans avoir bougé une carte)

### Après soumission

1. **Rappel du critère** (bannière identique au jeu)
2. **Score** affiché en grand (pts + erreur totale)
3. **Classement correct** révélé : chaque ligne montre position correcte, drapeau, nom, valeur réelle, et feedback `✓ correct` ou `✗ tu avais mis #X`
4. **Bouton soumettre au leaderboard** (mode daily seulement)
5. **Bouton "Round suivant"** (mode infini seulement)

### Couleurs de feedback

- Vert `#1e3a1e` / `#3a7a3a` : position correcte
- Rouge sombre `#8a3a3a` : position incorrecte

---

## Hook `useRankingGameState(mode, options)`

```js
// mode: 'daily' | 'infinite'
// options: { difficulty } (pour infinite)

return {
  criterion,          // { key, label, unit, compute }
  countries,          // pays dans l'ordre actuel du joueur
  reorderCountries,   // (newOrderedArray) => void — appelée après chaque drag
  status,             // 'playing' | 'submitted'
  score,              // 0-3
  totalError,
  correctOrder,       // pays dans l'ordre correct (révélé après soumission)
  elapsedTime,
  handleSubmit,       // calcule score, passe status à 'submitted'
  startNextRound,     // mode infini uniquement
}
```

---

## Pool de pays

- Exclure les pays avec une valeur `null` ou `0` pour le critère tiré
- Pool minimum requis : N * 3 pays valides (pour avoir assez de choix lors du tirage)
- Les pays sont tirés sans remise par round (pas de doublon dans un même round)

# Design : Leaderboard journalier — BorderGuess & CountryClue

Date : 2026-04-07

## Contexte

BorderGuess et CountryClue ont chacun un mode journalier (un puzzle par jour, partagé). L'objectif est d'ajouter un classement historique affiché directement sur la page de jeu après une victoire, avec saisie de pseudo et affichage des essais en accordéon.

## Données & Firebase

### Collection Firestore : `daily_scores`

Nouvelle collection séparée de `scores` (qui sert aux jeux standard).

Champs par document :

| Champ | Type | Description |
|---|---|---|
| `name` | string | Pseudo du joueur |
| `gameType` | string | `'BORDER_GUESS'` ou `'COUNTRY_CLUE'` |
| `dailyKey` | string | Date du puzzle, ex. `"2026-04-07"` |
| `attempts` | number | Nombre d'essais avant victoire |
| `elapsedTime` | number | Millisecondes entre Start et victoire |
| `guesses` | string[] | Liste ordonnée des noms de pays tentés |

### Unicité

Par triplet `(name, gameType, dailyKey)` : un seul score autorisé. Si le joueur resoumet, on compare — moins d'essais = mieux, à égalité moins de temps. On remplace uniquement si le nouveau score est meilleur.

### Tri

1. `attempts` croissant (moins d'essais = mieux)
2. `elapsedTime` croissant en cas d'égalité

## Chrono & bouton Start

### Comportement

- Un bouton **"Démarrer"** remplace l'input au chargement de la page.
- Au clic → chrono lancé + input activé.
- **BorderGuess** : la carte est masquée jusqu'au clic (placeholder affiché à la place).
- **CountryClue** : l'input seul est désactivé (pas de carte à masquer).
- Le chrono tourne jusqu'à `status === 'won'`, puis s'arrête.
- Le chrono n'est **pas affiché pendant la partie** (pour ne pas stresser le joueur). Il est révélé uniquement dans le résultat final et le leaderboard.

### Implémentation

Logique ajoutée dans `useBorderGuessState` et `useCountryClueState` (pattern identique à `useGameState` : `startTimeRef`, `setTimer`).

Nouvelles valeurs exposées par les hooks : `elapsedTime` (number | null) et `hasStarted` (boolean).

## Composants

### `DailyForm` (`src/pages/DailyForm.jsx`)

Formulaire de saisie pseudo adapté aux jeux journaliers. Affiché après victoire (`isSolved === true`).

- Affiche : nombre d'essais + temps formaté
- Saisie pseudo (max 20 chars)
- Sauvegarde dans `daily_scores` avec logique d'unicité
- Après sauvegarde réussie : bouton désactivé + message de confirmation
- Props : `attempts`, `elapsedTime`, `guesses`, `gameType`, `dailyKey`

### `DailyLeaderboard` (`src/pages/DailyLeaderboard.jsx`)

Leaderboard inline affiché après `DailyForm` (ou immédiatement si déjà joué).

- Titre : "Classement journalier"
- Pré-filtré sur le `gameType` de la page courante
- Colonnes : `#` · `Joueur` · `Essais` · `Temps`
- Top 3 : médailles 🥇🥈🥉
- Chaque ligne cliquable → accordéon avec la liste numérotée des pays tentés
  - Dernier pays de la liste affiché en vert (= la bonne réponse)
- Fetch depuis `daily_scores` filtré par `gameType`
- Props : `gameType`

## Intégration dans les pages

### `BorderGuessPage.jsx`

- Ajouter état `hasStarted` + `elapsedTime` depuis le hook
- Si `!hasStarted` : afficher bouton "Démarrer" + masquer la carte (placeholder)
- Si `isSolved` : afficher `<DailyForm>` puis `<DailyLeaderboard>` dans la section résultat

### `CountryCluePage.jsx`

- Même logique `hasStarted` + `elapsedTime`
- Si `!hasStarted` : afficher bouton "Démarrer" + désactiver l'input
- Si `isSolved` : afficher `<DailyForm>` puis `<DailyLeaderboard>` dans l'aside résultat

## Ce qui n'est pas inclus

- Mode infini : pas de leaderboard (uniquement le mode daily)
- Parties perdues : n'apparaissent pas dans le classement
- Filtre par date : le leaderboard est historique (tous les jours confondus)
- Affichage du chrono en cours de partie

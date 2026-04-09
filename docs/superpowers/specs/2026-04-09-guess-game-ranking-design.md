# Design : Critères de victoire distincts pour Border Guess / Country Clue

Date : 2026-04-09

## Contexte

En multi, tous les types de jeux utilisaient la même fonction `rankResults` basée sur un `weightedScore` pondéré (0 erreur = 3pts, 1-2 = 2pts, 3+ = 0pt) avec l'elapsedTime comme tie-breaker.

Ce système pose un problème pour Border Guess et Country Clue : un joueur qui trouve moins de pays mais avec 0 erreur peut battre un joueur qui en trouve plus. Trouver plus de pays doit toujours primer.

## Nouveaux critères pour Border Guess / Country Clue

1. `countriesSolved` DESC — trouver des pays est l'objectif principal
2. `attempts` ASC — à égalité, le plus précis gagne (moins d'erreurs au total)
3. `elapsedTime` ASC — départage final : le plus rapide

Les jeux Placement, Flags et Capitals conservent les critères actuels (`weightedScore` DESC, `elapsedTime` ASC).

## Fichiers modifiés

### 1. `src/utils/multiplayerScoring.js`

Ajout d'une fonction `rankGuessResults(results, totalPlayers)` distincte de `rankResults`.

- Trie par `countriesSolved DESC`, puis `attempts ASC`, puis `elapsedTime ASC`
- Attribution des points identique : 1er = N pts, 2e = N-1 pts, etc.
- `rankResults` reste inchangée

### 2. `src/components/multiplayer/MultiplayerGame.jsx`

- Import de `rankGuessResults` en plus de `rankResults`
- Dans le useEffect de transition : détecte si `gameConfig.type` est `BORDER_GUESS` ou `COUNTRY_CLUE`, utilise `rankGuessResults`, sinon `rankResults`

### 3. `src/components/multiplayer/BetweenGamesScreen.jsx`

Deux rendus de table selon le type de jeu :

**Placement / Flags / Capitals (actuel) :**
| Rang | Joueur | Score | Pays trouvés | 🎯 One tap | 🔄 Hésitations | ❌ Non trouvés | Temps | Points | Total |

**Border Guess / Country Clue (nouveau) :**
| Rang | Joueur | Pays trouvés | Tentatives | ❌ Non trouvés | Temps | Points | Total |

- La note "première hésitation tolérée" reste uniquement pour Flags/Capitals
- La colonne "Score pondéré" est retirée pour BG/CC car elle n'est plus le critère de classement

## Ce qui ne change pas

- La structure des données envoyées à Firebase (tous les champs sont déjà présents)
- Le calcul du `weightedScore` dans les composants BG/CC (toujours calculé mais non utilisé pour le ranking)
- `FinalLeaderboard.jsx` (basé sur `totalPoints`, non impacté)

# Design — Page Scores dédiée

**Date:** 2026-04-01

## Contexte

Actuellement, le `Scoreboard` est affiché en toggle inline sur la `HomePage`. L'objectif est de le déplacer sur une page dédiée `/scores`, accessible via un bouton par carte de jeu, avec une navbar partagée.

## Architecture & Routing

### Nouveaux fichiers
- `src/components/NavBar.jsx` — composant navbar partagé
- `src/components/NavBar.css` — styles de la navbar
- `src/pages/ScoresPage.jsx` — page `/scores`

### Fichiers modifiés
- `src/App.jsx` — ajout de la route `/scores` pointant vers `ScoresPage`
- `src/pages/HomePage.jsx` — suppression du state `showScoreboard` et du toggle, suppression de l'import inline `Scoreboard`, remplacement de la nav inline par `<NavBar>`, ajout d'un bouton "🏆 Scores" sur chaque carte active qui navigate vers `/scores?game=<id>`
- `src/pages/Scoreboard.jsx` — ajout d'un filtre jeu (select), accepte une prop `defaultGame`

## Composant NavBar

- Logo "GEOGAME" cliquable → `/`
- Même style visuel que la nav actuelle dans `HomePage`
- Utilisée dans `HomePage` et `ScoresPage`
- Pas d'autres liens pour l'instant

## ScoresPage

- Lit le query param `?game=` via `useSearchParams`
- Passe la valeur comme prop `defaultGame` au composant `Scoreboard`
- Inclut `<NavBar>`

## Scoreboard (modifications)

- Nouveau filtre jeu (select) au-dessus ou à côté du filtre difficulté existant
- Options : "Tous les jeux" + les jeux actifs (pour l'instant uniquement "Trouve le Pays" / `country`)
- Les scores existants dans Firebase n'ont pas de champ `gameId` → ils sont traités comme `country` par défaut (filtre jeu = `country` les inclut tous)
- Prop `defaultGame` : pré-sélectionne le filtre jeu au montage

## HomePage (modifications)

- Suppression de `useState('showScoreboard')` et du bloc `{showScoreboard && <Scoreboard />}`
- Suppression de l'import `Scoreboard`
- `<nav>` inline remplacé par `<NavBar>`
- Bouton "🏆 Scores" ajouté dans `.game-card-controls` de chaque carte active, navigue vers `/scores?game=<game.id>`

## Ce qui n'est pas dans ce scope

- Ajout du champ `gameId` dans Firebase (future évolution)
- Autres jeux actifs
- Authentification ou scores personnels

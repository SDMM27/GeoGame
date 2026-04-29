# Voyage Voyage — Design Spec
Date: 2026-04-28

## Vue d'ensemble

Voyage Voyage est un nouveau jeu géographique de type "chemin de frontières" intégré au site GeoGame. Le joueur doit relier deux pays en devinant les pays intermédiaires, pays par pays, via leurs frontières communes. L'objectif est de trouver le chemin le plus court possible.

---

## Mécanisme de jeu

### Principe
- Le jeu affiche deux pays : un **pays de départ** et un **pays d'arrivée**.
- Le joueur tape le nom d'un pays dans un champ texte.
- Si le pays proposé partage une frontière terrestre avec le **dernier pays validé** de la chaîne : ✅ il est ajouté à la chaîne (affiché en vert sur la carte).
- Si non : ❌ il est affiché en rouge sur la carte comme mauvaise tentative.
- La partie se termine quand le pays d'arrivée est atteint (ajouté à la chaîne).

### Règles
- **Tentatives** : illimitées — le score dépend de l'efficacité.
- **Objectif** : atteindre le pays cible en un minimum d'étapes (chemin optimal).
- **Pas de sélecteur de difficulté** : la complexité vient naturellement de la distance géographique entre les pays.

---

## Modes de jeu

### Mode quotidien
- Une seule paire de pays par jour, identique pour tous les joueurs.
- Seed basée sur la date (même système que BorderGuess).
- Leaderboard quotidien via `DailyLeaderboard` et `DailyForm` existants.

### Mode infini
- Paire de pays générée aléatoirement à chaque partie.
- La paire est garantie d'avoir un chemin d'au moins 3 étapes (filtré par BFS ≥ 3), c'est-à-dire au minimum 2 pays intermédiaires entre le départ et l'arrivée.

---

## Calcul du score

```
optimalLength = longueur du chemin BFS le plus court
étapesJouées = longueur de validatedChain - 1 (sans compter le départ)
score = max(1, optimalLength × 2 - étapesJouées - (wrongGuesses.length × 0.5))
```

- Score maximal quand le joueur suit exactement le chemin optimal sans erreur.
- Les mauvaises tentatives pénalisent légèrement (-0.5 par erreur).
- Score minimum garanti : 1.

---

## Interface utilisateur

### Layout (style BorderGuess)
1. **Header** : drapeau + nom du pays de départ (vert) | compteur d'étapes et tentatives | drapeau + nom du pays d'arrivée (orange).
2. **Carte React-Leaflet** (zone principale) :
   - Pays de départ : highlight vert fixe.
   - Pays cible : highlight orange pulsant.
   - Pays validés : highlight vert + ligne tracée dans l'ordre de la chaîne.
   - Mauvaises tentatives : highlight rouge semi-transparent.
   - La carte zoome et recentre automatiquement pour englober tous les pays affichés.
   - Carte purement visuelle — pas d'interaction au clic.
3. **Chaîne validée** : rangée de badges drapeaux + noms dans l'ordre, sous la carte.
4. **Input** : champ texte avec placeholder dynamique ("Quel pays est voisin de [dernier pays] ?") + bouton de confirmation.
5. **Barre de statut** : score (affiché à la fin) et timer.

---

## Architecture technique

### Nouveau game type
```js
// src/utils/gameTypes.js
VOYAGE_VOYAGE: 'VOYAGE_VOYAGE'
```

### Fichiers créés
| Fichier | Rôle |
|---|---|
| `src/pages/VoyageVoyagePage.jsx` | Page principale du jeu |
| `src/pages/VoyageVoyagePage.css` | Styles de la page |
| `src/hooks/useVoyageVoyageState.js` | Logique de jeu (état, guesses, timer, score) |
| `src/utils/voyageVoyageUtils.js` | BFS (chemin optimal), sélection de paires, seed quotidienne |
| `src/data/countryBorders.js` | Objet `{ ISO_A2: [ISO_A2, ...] }` — frontières pré-calculées |

### Fichiers modifiés
| Fichier | Changement |
|---|---|
| `src/App.jsx` | Nouvelle route `/voyage-voyage` |
| `src/pages/HomePage.jsx` | Nouvelle carte de jeu (✈️ Voyage Voyage) |
| `src/utils/gameTypes.js` | Constante `VOYAGE_VOYAGE` |

### Données — frontières
`countryBorders.js` contient un objet statique pré-calculé, construit à partir de l'API restcountries.com (champ `borders` — liste d'ISO A3 convertie en ISO A2) :
```js
export const countryBorders = {
  'FR': ['ES', 'AD', 'MC', 'IT', 'CH', 'DE', 'LU', 'BE'],
  'IT': ['FR', 'MC', 'CH', 'AT', 'SI', 'SM', 'VA'],
  // ...~150 pays continentaux
}
```
**Pool de pays éligibles** : uniquement les pays ayant au moins une frontière terrestre. Les nations insulaires sans frontière terrestre (Japon, Australie, Royaume-Uni, Nouvelle-Zélande, Madagascar, etc.) sont exclues du pool de départ, d'arrivée et d'étapes intermédiaires.

### Algorithme BFS
```js
// src/utils/voyageVoyageUtils.js
function findShortestPath(startISO, targetISO, borders) {
  // BFS standard — retourne le tableau de ISO codes du chemin optimal
}
```

### État du hook
```js
{
  startCountry,       // feature GeoJSON
  targetCountry,      // feature GeoJSON
  validatedChain,     // [feature, ...] dans l'ordre
  wrongGuesses,       // [feature, ...] toutes les erreurs
  optimalLength,      // int — calculé au chargement
  isGameOver,         // bool
  elapsedTime,        // ms
  score,              // calculé à la fin
}
```

---

## Persistance des scores (Firebase)

Même collection `scores` que les autres jeux :
```js
{
  gameType: 'VOYAGE_VOYAGE',
  name: string,
  score: number,
  elapsedTime: number,
  stepsUsed: number,
  optimalSteps: number,
  mode: 'daily' | 'infinite',
  date: string, // pour mode quotidien
}
```

Le leaderboard existant (`/scores`) filtre déjà par `gameType` — pas de modification nécessaire.

---

## Ce qui est hors scope

- Intégration au mode **multijoueur Chill** (peut être ajouté plus tard).
- Sélecteur de difficulté.
- Indices (hints) sur la direction ou la distance.
- Interaction carte au clic pour sélectionner un pays.

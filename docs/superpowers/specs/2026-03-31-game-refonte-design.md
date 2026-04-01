# GéoGame — Refonte mécanique de jeu

**Date :** 2026-03-31
**Branche :** `refonte`
**Statut :** Approuvé

---

## Contexte

Le jeu actuel fait jouer le joueur contre un chrono qui descend de 60 secondes. L'objectif de la refonte est de passer à un mode "trouver tous les pays" : le chrono monte depuis 0, la partie se termine quand tous les pays ont été traités, et le temps sert de départage dans le classement.

---

## 1. Mécanique de jeu

### Ce qui change

| Avant | Après |
|-------|-------|
| Timer descend de 60s → 0 | Timer monte de 0 → fin |
| Partie terminée sur timeout | Partie terminée quand tous les pays sont traités |
| Score seul en Firebase | Score + `elapsedTime` en Firebase |
| Aucune stat en cours | Trouvés / Passés / Restants affichés en temps réel |

### Définitions

- **Trouvé** : le joueur a cliqué sur le bon pays (sans avoir utilisé "Voir" ni atteint 3 erreurs consécutives).
- **Passé** : le pays a été éliminé suite à 3 erreurs consécutives **ou** au clic sur "Voir". Ne revient pas dans le pool.
- **Restants** : `total − trouvés − passés`.
- **Fin de partie** : `restants === 0` (tous les pays ont été traités).
- **Total** : nombre de pays disponibles pour la difficulté choisie.
  - Facile : 29, Moyen : 83, Difficile : 191, Impossible : 244, Hardcore : 53.

### Timer

- Part de `0`, s'incrémente de 1 chaque seconde.
- Affiché en `MM:SS` (ex : `01:24`).
- En mode entraînement : affiché `∞`, valeur interne incrémentée normalement mais non utilisée.
- À la fin de partie, `elapsedTime` = valeur du timer en secondes.

### Score

- Formule inchangée : incrémentation/décrémentation par difficulté du pays.
- Le temps **n'affecte pas** le score. Il est affiché séparément et sert de départage à score égal dans le classement (temps bas = meilleur rang).

### Mode entraînement

Conservé. Quand `restants === 0` en mode entraînement : toast de félicitations affiché, mais **pas** d'écran de fin ni de formulaire de score. Le timer continue de tourner. À revoir dans une itération future.

---

## 2. Architecture — Hook `useGameState`

### Fichier créé

`src/hooks/useGameState.js`

### Responsabilités

Absorbe toute la logique actuellement dans `GamePage.jsx` :
- Gestion du timer (montant)
- Gestion du score
- Gestion des pays (pool, déjà choisis, pays cible)
- Gestion des stats (found, skipped, total)
- Logique des 3 erreurs consécutives
- Zoom carte (`zoomCountryMap`)
- Actions : `onCountryClick`, `onCountryMouseOver`, `onCountryMouseOut`, `seeCountry`, `restartGame`, `goHome`

### État interne du hook

```js
// State React
targetCountry, score, gameStarted, consecutiveErrors,
timer, clickOnSeeCountry,
stats: { found, skipped, total }

// Refs (stale closure Leaflet)
targetCountryRef, gameStartedRef, consecutiveErrorsRef,
clickOnSeeCountryRef, timerRef, geoJsonRef
```

### Interface publique (retournée au composant)

```js
{
  targetCountry, score, timer, stats,
  isGameOver, displayTimer,
  geoJsonRef, mapRef, setMapRef,
  onCountryClick, onCountryMouseOver, onCountryMouseOut,
  seeCountry, restartGame, goHome
}
```

### `GamePage.jsx` après refonte

Ne contient que du JSX. Consomme `useGameState(difficulty, isTraining)` et rend :
- Le HUD (2 blocs + boutons)
- La `MapContainer` / `GeoJSON`
- Le formulaire de fin de partie
- Les `ToastContainer`

---

## 3. UI

### HUD en jeu (coin haut-gauche, `position: fixed`)

**Bloc 1 — principal :**
```
┌──────────────────────────────────────────────┐
│  42          PAYS À TROUVER       01:24      │
│  SCORE           France           TEMPS      │
│  ▓▓▓▓▓░░░░░░░░░░░░  18 / 83 pays            │
└──────────────────────────────────────────────┘
```
- Barre de progression fine (`height: 6px`) sous la ligne score/cible/temps.
- Gradient vert → cyan, largeur = `(found / total) * 100%`.

**Bloc 2 — stats :**
```
┌──────────────────────────────────────────────┐
│  18 ✓ TROUVÉS    3 ✗ PASSÉS   62 ◎ RESTANTS │
└──────────────────────────────────────────────┘
```
- Couleurs : vert (`#4ade80`) / rouge (`#f87171`) / jaune (`#fbbf24`).

**Boutons d'action :** inchangés (`← Accueil`, `👁 Voir`, `↺ Recommencer`).

### Sélection de difficulté (HomePage)

Remplacement du `<select>` par une grille de boutons :

```
┌──────────┐  ┌──────────┐
│ Facile   │  │ Moyen ✓  │  ← sélectionné (border violet)
│ 29 pays  │  │ 83 pays  │
└──────────┘  └──────────┘
┌──────────┐  ┌──────────┐
│ Difficile│  │Impossible│
│ 191 pays │  │ 244 pays │
└──────────┘  └──────────┘
     ┌──────────────┐
     │ 💀 Hardcore  │
     │   53 pays    │
     └──────────────┘
```

Couleurs par niveau : Facile vert, Moyen cyan, Difficile jaune, Impossible orange, Hardcore rouge.

### Formulaire de fin de partie (`form.jsx`)

- Affiche le score final **et** le temps formaté (`MM:SS`).
- Sauvegarde en Firebase : `{ name, score, difficulty, elapsedTime }`.

### Scoreboard (`Scoreboard.jsx`)

- Ajout colonne `Temps` à droite du score.
- Tri : score DESC, puis `elapsedTime` ASC à égalité.
- Affichage du temps : `MM:SS` ou `—` si absent (anciens scores).

---

## 4. Firebase

### Règles Firestore à appliquer manuellement

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['name','score','difficulty'])
                    && request.resource.data.name is string
                    && request.resource.data.score is number;
      allow delete: if true;
    }
  }
}
```

### Schéma du document `scores`

```js
{
  name: string,        // pseudo du joueur
  score: number,       // points accumulés
  difficulty: string,  // "Facile" | "Moyen" | "Difficile" | "Impossible" | "Hardcore"
  elapsedTime: number  // secondes (absent sur anciens scores)
}
```

---

## 5. Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/hooks/useGameState.js` | Créer |
| `src/pages/GamePage.jsx` | Refactoriser (JSX only) |
| `src/pages/GamePage.css` | Mettre à jour (HUD stats) |
| `src/pages/HomePage.jsx` | Remplacer select par grille |
| `src/pages/HomePage.css` | Ajouter styles grille difficulté |
| `src/pages/form.jsx` | Ajouter `elapsedTime` |
| `src/pages/Scoreboard.jsx` | Ajouter colonne temps + tri |

---

## Hors scope

- Refonte du mode entraînement
- Authentification Firebase
- Leaderboard global / par amis

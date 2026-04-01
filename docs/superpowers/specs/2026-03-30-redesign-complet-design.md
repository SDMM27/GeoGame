# GeoGame — Refonte graphique complète + Bug Fixes
**Date :** 2026-03-30
**Statut :** Approuvé

---

## 1. Objectif

Refonte graphique complète du site GeoGame (plateforme de mini-jeux de géographie), correction des bugs connus, migration du build tool CRA → Vite, et mise en place d'une architecture extensible pour accueillir de futurs mini-jeux.

---

## 2. Stack & Outillage

| Élément | Avant | Après |
|---|---|---|
| Build tool | Create React App (`react-scripts`) | **Vite** + `@vitejs/plugin-react` |
| React | 18.2 | 18.2 (inchangé) |
| Language | JSX | JSX (pas de migration TypeScript) |
| CSS | Fichiers CSS epars + Bootstrap | CSS Variables (design system) + Bootstrap gardé pour les utilitaires |
| Font | Système | **Inter** (Google Fonts) |
| Firebase | v9 modular | v9 (inchangé) |
| Leaflet / react-leaflet | 1.9 / 4.2 | Inchangé |

---

## 3. Architecture des fichiers

```
src/
├── main.jsx                  # Point d'entrée Vite (remplace index.js)
├── App.jsx                   # Router + Routes uniquement
├── Firebase.js               # Inchangé
├── styles/
│   └── theme.css             # Design system — variables CSS globales
├── pages/
│   ├── HomePage.jsx          # Hub d'accueil (nouveau)
│   ├── HomePage.css
│   ├── GamePage.jsx          # Logique du jeu (extraite d'App.js)
│   ├── GamePage.css
│   ├── Scoreboard.jsx        # Existant — fixed + restyled
│   ├── scoreboard.css
│   ├── form.jsx              # Existant — restyled
│   └── form.css
└── data/
    └── countriesWithDifficulty_FR.json  # Inchangé
```

**Routes React Router :**
- `/` → `HomePage`
- `/game` → `GamePage`

**Fichiers supprimés :** `src/App.css`, `src/logo.svg`, `src/App.test.js` (si non utilisé)

---

## 4. Design System (`theme.css`)

```css
:root {
  --bg-primary:    #0f0f1a;
  --bg-secondary:  #1a1a2e;
  --bg-card:       #16213e;
  --accent-cyan:   #00d4ff;
  --accent-purple: #7b2ff7;
  --success:       #4ade80;
  --warning:       #fbbf24;
  --danger:        #ff4d4d;
  --text-primary:  #ffffff;
  --text-muted:    #888888;
  --border-color:  rgba(0, 212, 255, 0.2);
  --radius-sm:     6px;
  --radius-md:     10px;
  --radius-lg:     16px;
}
```

Font Inter chargée via `<link>` dans `index.html`.

---

## 5. HomePage (Hub d'accueil)

### Structure
- **Navbar** : logo `GEO GAME` (cyan + violet) à gauche, lien `🏆 Scores` à droite
- **Titre** : `Choisissez votre jeu` sous-titré `Explore • Découvre • Compète`
- **Grille 2×2** de cartes de jeux

### Cartes de jeux
Chaque carte contient : icône emoji + titre + description courte.

| Carte | Statut | Icône | Titre |
|---|---|---|---|
| 1 | **Actif** | 🌍 | Trouve le Pays |
| 2 | Coming soon | 🚩 | Trouve le Drapeau |
| 3 | Coming soon | 📍 | Placement Pays |
| 4 | Coming soon | ⚡ | Mode Vies |

La carte active affiche un sélecteur de difficulté (Facile → Hardcore) et deux boutons : **Jouer** et **Entraînement**. Au clic, on navigue vers `/game` en passant la difficulté et le mode via React Router state (`navigate('/game', { state: { difficulty, isTraining } })`).

Les cartes "coming soon" sont grises, non-cliquables, avec un badge `BIENTÔT`.

---

## 6. GamePage (Jeu actuel)

### Extraction depuis App.js
Toute la logique (états, refs, handlers, timer, score) est déplacée dans `GamePage.jsx`. `App.jsx` ne fait plus que router.

### HUD flottant (éléments `position: absolute` sur la carte)
La carte Leaflet occupe **100% de la hauteur de l'écran**.

| Élément | Position | Style |
|---|---|---|
| Score | Top-left | Carte glassmorphism, valeur en `--accent-cyan` |
| Timer | Top-right | Carte glassmorphism, couleur dynamique |
| Pays à trouver | Top-center | Pill semi-transparent avec blur |
| Boutons d'action | Bottom-center | `← Accueil` / `👁 Voir le pays` / `↺ Recommencer` |

**Timer dynamique :**
- `> 30s` → `--accent-cyan` (bleu)
- `15–30s` → `--warning` (orange)
- `< 15s` → `--danger` (rouge) + légère animation pulse

### Comportement inchangé
Toute la logique de jeu (score, erreurs consécutives, zoom pays, toast, etc.) reste identique. Seul le rendu visuel change.

---

## 7. Scoreboard — Bug Fixes

### Bug 1 : Tri par difficulté cassé
**Problème :** `scores.sort((a, b) => a.difficulty - b.difficulty)` — `difficulty` est une string, la soustraction retourne `NaN`.
**Fix :** Utiliser un tableau ordonné pour le tri.
```js
const DIFFICULTY_ORDER = ["Facile", "Moyen", "Difficile", "Impossible", "Hardcore"];
scores.sort((a, b) => DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty));
```

### Bug 2 : Grid 2 colonnes pour 3 champs
**Problème :** `grid-template-columns: 1fr 1fr` mais le scoreboardElement affiche nom + score + difficulté (3 champs).
**Fix :** `grid-template-columns: 1fr 1fr 1fr` + ajout d'un header de colonnes.

### Refonte visuelle
Scoreboard restyled dans le thème dark : tableau structuré avec rang (#1, #2...), médaille pour le top 3, filtre par difficulté conservé.

---

## 8. Autres Bug Fixes

| Bug | Fichier | Fix |
|---|---|---|
| `font-size: 27em` sur `.textContainer` | App.css | Corriger à `1em` (valeur cohérente) |
| `margin-top: 50%` sur `.app-title` | App.css | Supprimer (remplacé par le layout HomePage) |
| `mapRef.current` utilisé sur un state | App.js | Dans GamePage, `mapRef` reste en state (c'est correct via `whenReady`) — supprimer les checks `mapRef.current` incorrects dans les conditions |
| `<select>` avec `selected` au lieu de `defaultValue` | App.js | Passer à l'attribut React `defaultValue` sur le `<select>` |
| Timer color | App.js | Implémenté dans le HUD flottant (voir Section 6) |

---

## 9. Migration CRA → Vite

### Étapes
1. Supprimer `react-scripts` des dépendances
2. Ajouter `vite` + `@vitejs/plugin-react`
3. Créer `vite.config.js` à la racine
4. Déplacer `public/index.html` → `index.html` à la racine, adapter les chemins (`%PUBLIC_URL%` → chemins relatifs)
5. Renommer `src/index.js` → `src/main.jsx`, adapter le point d'entrée
6. Mettre à jour les scripts dans `package.json` (`start` → `vite`, `build` → `vite build`)
7. Les variables d'environnement `REACT_APP_*` → `VITE_*` (non utilisées ici, donc rien à changer)

### Impact
Aucun changement fonctionnel. Le build reste compatible Netlify (déjà configuré via `netlify.toml` — adapter si besoin la commande de build).

---

## 10. Hors scope

Les éléments du TODO suivants **ne sont pas inclus** dans cette itération :
- Mode multijoueur
- Bot Discord
- Système de vies avec jauge
- Bonus de série (streak)
- Scrolling sidebar des meilleurs scores
- Affichage du pays raté sur la carte (nom affiché)

Ces features seront traitées dans des itérations ultérieures.

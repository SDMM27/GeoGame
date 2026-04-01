# Mini-jeu "Trouve le Drapeau" — Design Spec

**Date :** 2026-04-01

## Vue d'ensemble

Nouveau mini-jeu dans GeoGame : l'utilisateur voit un drapeau affiché à l'écran et doit saisir le nom du pays correspondant au clavier. Le jeu partage le même système de difficulté, de scoring et de classement que le jeu existant "Trouve le Pays".

---

## Architecture

### Fichiers à créer

| Fichier | Rôle |
|---|---|
| `src/pages/FlagGamePage.jsx` | Page principale du jeu |
| `src/pages/FlagGamePage.css` | Styles de la page |
| `src/hooks/useFlagGameState.js` | Hook de logique (analogue à `useGameState.js`) |
| `enrich_iso_a2.py` | Script Python one-shot pour enrichir le JSON avec les codes ISO A2 |

### Fichiers à modifier

| Fichier | Modification |
|---|---|
| `src/App.jsx` | Ajouter la route `/flag-game` |
| `src/pages/HomePage.jsx` | Passer le jeu `flags` à `active: true` ; navigation vers `/flag-game` |
| `src/data/countriesWithDifficulty_FR.json` | Ajouter le champ `ISO_A2` sur chaque feature (via le script) |

### Dépendance npm à ajouter

```
country-flag-icons
```

Fournit les drapeaux SVG identifiés par code ISO A2 (alpha-2), bundlés avec l'application — **fonctionne hors-ligne**.

---

## Enrichissement des données

Le JSON actuel contient `ISO_A3` (code 3 lettres) mais `country-flag-icons` utilise les codes **ISO A2** (2 lettres).

Un script Python `enrich_iso_a2.py` (sur le modèle de `difficulte.py`) utilise la bibliothèque `pycountry` pour convertir chaque `ISO_A3` → `ISO_A2` et écrire le résultat dans le JSON.

Résultat : chaque feature gagne un champ `ISO_A2` (ex: `"ISO_A2": "FR"`).

Cas particuliers (territoires sans code ISO A2 standard) : laisser `"ISO_A2": null` — ces pays seront ignorés dans le jeu du drapeau.

---

## Layout (page FlagGamePage)

**Layout A — Centré vertical**, cohérent avec le style existant :

```
┌─────────────────────────────────┐
│  HUD : Score │ Timer │ Stats    │
├─────────────────────────────────┤
│                                 │
│        [  DRAPEAU SVG  ]        │
│                                 │
│   [ Saisie texte... ]  [ → ]    │
│                                 │
│  ← Accueil   👁 Voir   ↺ Restart│
└─────────────────────────────────┘
```

- Pas de label "Drapeau à identifier" — c'est implicite
- Le HUD reprend exactement la même structure que `GamePage.jsx` (score, timer, barre de progression, stats found/skipped/remaining)
- L'input prend le focus automatiquement à chaque nouveau drapeau

---

## Mécanique de jeu

### Flux principal

1. Un drapeau est tiré aléatoirement parmi les pays de la difficulté sélectionnée (même logique que `getRandomCountry`)
2. L'utilisateur saisit le nom et valide avec **Entrée** ou le bouton `→`
3. La réponse est normalisée et comparée au nom cible normalisé
4. Feedback immédiat via toast (même système react-toastify)
5. Passage au drapeau suivant

### Gestion des erreurs

| Erreurs consécutives | Comportement |
|---|---|
| 0 | — |
| 1 | Toast rouge "Dommage !", **première erreur tolérée pour le score** |
| 2 | Toast rouge "Dommage !" |
| 3 | Révèle le nom du pays en texte (sous le drapeau), compte comme "passé", passe au suivant après 2s |

### Bouton "Voir"

Révèle immédiatement le nom du pays, compte comme "passé" (aucun point). Même logique que dans le jeu actuel via `clickOnSeeCountry`.

### Fin de partie

Même overlay `Form` que le jeu actuel, avec `finalScore`, `difficulty` et `elapsedTime`.

---

## Scoring

Même `SCORE_TABLE` que le jeu actuel :

```js
const SCORE_TABLE = {
  Facile:     [3, 2, 1],
  Moyen:      [5, 3, 2],
  Difficile:  [7, 5, 3],
  Impossible: [9, 7, 5],
}
```

**Différence clé** : la première erreur est gratuite.

```js
incrementScore(difficulty, Math.max(0, consecutiveErrors - 1))
// 0 erreur  → index 0 (plein de points)
// 1 erreur  → index 0 (plein de points, tolérée)
// 2 erreurs → index 1 (points réduits)
// 3 erreurs → skipped, 0 point
```

Le temps est enregistré et sert de **départage** sur le classement quand deux joueurs ont le même score (comportement déjà en place via `elapsedTime` dans `Form`).

---

## Validation de la réponse

Normalisation appliquée **à la fois** sur l'input utilisateur et sur le nom cible :

```js
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[-']/g, ' ')    // tirets et apostrophes → espace
    .replace(/\s+/g, ' ')     // espaces multiples → un seul
    .trim()
}
```

Exemples :
- `"États-Unis d'Amérique"` → `"etats unis d amerique"`
- `"etats-unis d amerique"` → `"etats unis d amerique"` ✓
- `"etats-unis"` → `"etats unis"` ✗ sans alias (ne matche pas `"etats unis d amerique"`)

Pas de fuzzy matching. Pour les pays dont le nom courant diffère du nom officiel complet (ex: "États-Unis" pour "États-Unis d'Amérique", "Corée du Sud" pour "République de Corée"), un champ `aliases` est ajouté **manuellement** dans le JSON :

```json
{
  "ADMIN": "États-Unis d'Amérique",
  "ISO_A2": "US",
  "aliases": ["États-Unis", "USA", "Amérique"]
}
```

La validation accepte la réponse si elle correspond (après normalisation) au nom `ADMIN` **ou** à l'un des `aliases`. La liste d'aliases est construite au fur et à mesure des cas identifiés lors des tests.

---

## Mode entraînement

Timer affiché `∞`, pas de sauvegarde de score. Comportement identique au mode entraînement du jeu actuel.

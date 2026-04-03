# Mode Ascension — Design Spec

**Date :** 2026-04-03
**Jeux concernés :** Trouve le Pays, Trouve le Drapeau, Trouve la Capitale
**Statut :** Approuvé

---

## Vue d'ensemble

Le mode Ascension est un mode de jeu progressif disponible pour les 3 jeux existants. Le joueur configure un nombre de pays à trouver par niveau de difficulté (Facile → Moyen → Difficile → Impossible). Les pays sont tirés aléatoirement dans chaque phase. La progression est fluide : pas d'interruption entre les phases, juste un toast de transition.

---

## Presets prédéfinis

| Preset | Facile | Moyen | Difficile | Impossible | Total |
|--------|--------|-------|-----------|------------|-------|
| 🌱 Découverte | 10 | 5 | 1 | 0 | 16 |
| 📈 Progressif | 15 | 10 | 5 | 1 | 31 |
| ⚡ Challenge | 7 | 7 | 7 | 2 | 23 |
| 💀 Hardcore | 5 | 10 | 15 | 5 | 35 |

Seules les parties jouées avec une configuration correspondant exactement à un preset sont enregistrées au classement Ascension. La détection est automatique : à chaque changement de slider, la config courante est comparée aux 4 presets. Si elle correspond, le preset s'active visuellement et la partie sera classée.

---

## Architecture

### Hook partagé : `useAscensionState`

```
src/hooks/useAscensionState.js
```

Signature :
```js
useAscensionState(gameType, phases, isTraining)
// phases = { Facile: 15, Moyen: 10, Difficile: 5, Impossible: 1 }
// gameType = 'PLACEMENT' | 'FLAGS' | 'CAPITALS'
```

Responsabilités :
- Calculer la séquence de phases actives (phases avec count > 0, dans l'ordre Facile → Moyen → Difficile → Impossible)
- Gérer la phase courante et le décompte de pays restants dans cette phase
- Piocher les pays aléatoirement dans le pool de la phase courante (sans répétition)
- Déclencher le toast de transition quand une phase se termine
- Maintenir le timer global (continu sur toutes les phases)
- Enregistrer les stats par phase : `{ found, skipped, timeMs }`
- Retourner une interface compatible avec les hooks existants (targetCountry, score, stats, isGameOver, etc.)

### Intégration dans les pages de jeu

Les 3 pages existantes (`GamePage`, `FlagGamePage`, `CapitalsGamePage`) lisent `isAscension` depuis le state de navigation React Router :

```js
const { difficulty, isTraining, isAscension, phases, presetName } = location.state ?? {}
```

Si `isAscension === true`, la page utilise `useAscensionState(gameType, phases, isTraining)` au lieu du hook standard. L'interface retournée étant compatible, les changements dans les pages sont minimes.

### Pas de nouvelles routes

Les routes existantes (`/game`, `/flag-game`, `/capitals-game`) sont réutilisées. Le flag `isAscension` dans le state de navigation suffit.

---

## UI — Carte de jeu (HomePage)

### Onglets Standard / Ascension

Chaque `ActiveGameCard` gagne un état `mode: 'standard' | 'ascension'`. Deux onglets remplacent les boutons de sélection de difficulté actuels.

**Onglet Standard** : identique à l'UI actuelle (boutons de difficulté).

**Onglet Ascension** :
1. 4 boutons de presets (🌱 Découverte, 📈 Progressif, ⚡ Challenge, 💀 Hardcore)
2. 4 sliders (un par difficulté Facile / Moyen / Difficile / Impossible), bornés au maximum de pays disponibles pour ce jeu et cette difficulté — calculé via les fonctions existantes `getTotalCountries`, `getTotalFlagCountries`, `getTotalCapitalCountries` appelées avec chaque niveau individuel
3. Label dynamique : "Total : N pays · Preset : X" (ou "Config custom" si aucun preset ne correspond)
4. Boutons Jouer / Entraînement

> **Note :** Le niveau "Hardcore" de l'actuel système (méta-difficulté = tous les niveaux) n'existe pas en mode Ascension. Ascension utilise toujours les 4 niveaux individuels (Facile, Moyen, Difficile, Impossible) séparément.

### Navigation vers le jeu

```js
navigate(game.route, {
  state: {
    isAscension: true,
    phases: { Facile: 15, Moyen: 10, Difficile: 5, Impossible: 1 },
    presetName: 'Progressif', // null si config custom
    isTraining,
  }
})
```

---

## Indicateur de phase en jeu

Un bandeau affiché pendant la partie (au-dessus ou sous le HUD existant) :

```
Phase : Moyen    7 / 10 restants
[███░░░░░░░░░░░░] (barre de progression)
```

---

## Transition entre phases

Quand le dernier pays d'une phase est trouvé ou passé, deux toasts s'enchaînent :
1. Toast de confirmation du pays (comportement actuel)
2. Toast de transition : `"🚀 Phase Moyen commencée !"` (dans `topRightToast`)

Aucun écran interstitiel. La partie continue sans interruption.

---

## Fin de partie

### Écran de résumé

Affiché quand toutes les phases sont terminées. Contient :

**Stats globales :**
- Temps total (primaire)
- Score total
- Pays trouvés / total

**Détail par phase :**
| Phase | Trouvés | Passés | Temps |
|-------|---------|--------|-------|
| 🟢 Facile | 15/15 | 0 | 1m 02s |
| 🔵 Moyen | 9/10 | 1 | 1m 44s |
| 🟡 Difficile | 4/5 | 1 | 1m 12s |
| 🟠 Impossible | 0/1 | 1 | 0m 24s |

**Boutons :** Rejouer / Accueil

### Enregistrement du score

Conditions pour sauvegarder au classement :
- `isTraining === false`
- `presetName !== null` (config reconnue comme preset)

Collection Firebase : `ascensionScores`
Document key : `${gameType}_${presetName}` (ex: `PLACEMENT_Progressif`)

Champs enregistrés :
```js
{
  playerName: string,
  gameType: string,
  presetName: string,
  globalTimeMs: number,       // critère de tri principal
  globalScore: number,        // critère de tri secondaire
  totalFound: number,
  totalSkipped: number,
  phaseStats: [               // détail par phase
    { difficulty, count, found, skipped, timeMs }
  ],
  date: timestamp
}
```

---

## Classement Ascension

Page `/scores` — nouvel onglet "🚀 Ascension".

Filtres :
- **Jeu** (comme le classement standard) : Trouve le Pays / Trouve le Drapeau / Trouve la Capitale
- **Preset** : 🌱 Découverte / 📈 Progressif / ⚡ Challenge / 💀 Hardcore

Tri : temps global croissant. Égalité : score décroissant.

Les configs custom ne sont pas enregistrées et n'apparaissent pas dans le classement.

---

## Cas limites

| Cas | Comportement |
|-----|-------------|
| Slider à 0 | Phase ignorée, absente de la séquence |
| Slider au max | Borné au nombre de pays disponibles pour ce jeu/difficulté |
| Config identique à un preset (via sliders) | Détection auto → preset actif → classé |
| Mode Entraînement | Timer affiché "∞", pas de sauvegarde, toutes phases actives |
| Tous les pays d'une phase épuisés avant la fin | Impossible : le slider est borné au max disponible |

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/hooks/useAscensionState.js` | Nouveau |
| `src/pages/HomePage.jsx` | Onglets Standard/Ascension, sliders, presets |
| `src/pages/HomePage.css` | Styles onglets et sliders |
| `src/pages/GamePage.jsx` | Détection `isAscension`, indicateur de phase |
| `src/pages/FlagGamePage.jsx` | Idem |
| `src/pages/CapitalsGamePage.jsx` | Idem |
| `src/pages/ScoresPage.jsx` | Onglet Ascension + filtre preset |
| `src/pages/scoreboard.css` | Styles nouvel onglet |
| `src/Firebase.js` | Lecture/écriture collection `ascensionScores` |

# Refonte des difficultés — Design

**Date :** 2026-04-02
**Scope :** Reclassification des pays + passage du système cumulatif au système exclusif par tier

---

## Contexte

Le système actuel est **cumulatif** : sélectionner "Difficile" inclut les pays Facile + Moyen + Difficile.
L'objectif est de passer à un système **exclusif** : chaque difficulté n'affiche que les pays de son tier.
Hardcore devient le mode "tous les pays".

Le jeu est calibré pour un **joueur francophone**.

---

## Critères de difficulté

| Tier | Critère |
|------|---------|
| **Facile** | Pays à reconnaissance mondiale immédiate + forme iconique sur la carte |
| **Moyen** | Pays enseignés à l'école, dans l'actualité régulière, capitales connues |
| **Difficile** | Connaissance régionale requise, forme moins distinctive, moins médiatisés |
| **Impossible** | Microstats, territoires, îles isolées, zones disputées |
| **Hardcore** | Tous les pays valides (244) — affiché comme tel dans l'UI |

---

## Reclassification des pays

### Facile → Moyen
- Autriche (noyée dans l'Europe centrale, confondue avec Hongrie/Slovaquie)
- Suède (confondue avec la Norvège)

### Moyen → Facile
- Ukraine (omniprésente dans l'actualité depuis 2022)

### Moyen → Difficile
- Arménie, Azerbaïdjan (petits pays du Caucase méconnus)
- Costa Rica, Guatemala, Honduras, Panama (petits pays d'Amérique centrale peu distinctifs)
- Paraguay (enclavé, peu distinctif)
- Jamaïque (petite île dans les Caraïbes)
- Slovénie (petit pays des Balkans moins connu)

### Difficile → Moyen
- Islande (tourisme, Euro 2016 — bien connue des Français)
- Libye (Kadhafi, très médiatisée)
- Syrie (conflit, très médiatisée)
- Émirats arabes unis (Dubaï, PSG)
- Bulgarie (destination touristique Mer Noire)
- Luxembourg (travail frontalier, très connu)
- Biélorussie (Loukachenko, médiatisée)

### Difficile → Impossible
- Bermudes (minuscule île en Atlantique)
- Chypre du Nord (territoire disputé, quasi invisible)
- Sao Tomé-et-Principe (île obscure, presque impossible à pointer)

### Pays ignorés (sans tag de difficulté — 11 pays)
Terres australes, Bajo Nuevo Bank, Îles Cook, Îles de la mer de Corail, Territoires de l'océan Indien, Kiribati, Îles Spratly, Récif Scarborough, Banc Serranilla, Sainte-Hélène, Îles mineures éloignées des États-Unis.
→ Exclus du jeu pour l'instant.

---

## Counts après reclassification

| Tier | Avant | Après |
|------|-------|-------|
| Facile | 29 | 28 |
| Moyen | 54 | 53 |
| Difficile | 108 | 107 |
| Impossible | 53 | 56 |
| **Hardcore** | 53 (Impossible only) | **244 (tous)** |

---

## Changements techniques

### 1. Script de reclassification (`scripts/reclassify-difficulties.js`)
Script Node.js one-shot qui patch `countriesWithDifficulty_FR.json` en appliquant les changements ci-dessus par nom de pays. À supprimer après exécution.

### 2. Logique (`useGameState.js` et `useFlagGameState.js`)
```js
function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return [difficulty]
}
```

### 3. UI (`HomePage.jsx`)
- Mettre à jour les counts dans le tableau `DIFFICULTIES`
- Modifier le label Hardcore : `💀 Hardcore — Tous les pays (244)`

---

## Hors scope
- Reclassification des 11 pays sans tag
- Rééquilibrage parfait des counts par tier
- Nouveaux modes de jeu

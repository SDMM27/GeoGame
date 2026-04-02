# Difficulty Refonte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Passer le système de difficultés de cumulatif à exclusif, reclassifier les pays selon les critères validés, et mettre à jour l'UI.

**Architecture:** Un script Node.js one-shot patche le JSON en appliquant les reclassifications. Ensuite `getAvailableDifficulties` est simplifié dans les deux hooks pour retourner uniquement le tier sélectionné. Hardcore retourne tous les tiers. L'UI est mise à jour avec les nouveaux counts et le label Hardcore.

**Tech Stack:** Node.js (script), React, JSON (countriesWithDifficulty_FR.json)

---

## Fichiers touchés

- Create: `scripts/reclassify-difficulties.js` — script one-shot de reclassification du JSON
- Modify: `src/data/countriesWithDifficulty_FR.json` — mis à jour par le script
- Modify: `src/hooks/useGameState.js:24-27` — simplifier `getAvailableDifficulties`
- Modify: `src/hooks/useFlagGameState.js:17-20` — idem
- Modify: `src/pages/HomePage.jsx:7-13` — counts + label Hardcore

---

## Task 1 : Script de reclassification du JSON

**Files:**
- Create: `scripts/reclassify-difficulties.js`

- [ ] **Step 1 : Créer le script**

```js
// scripts/reclassify-difficulties.js
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../src/data/countriesWithDifficulty_FR.json')
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

const changes = {
  // Facile → Moyen
  'Autriche':                   'Moyen',
  'Suède':                      'Moyen',
  // Moyen → Facile
  'Ukraine':                    'Facile',
  // Moyen → Difficile
  'Arménie':                    'Difficile',
  'Azerbaïdjan':                'Difficile',
  'Costa Rica':                 'Difficile',
  'Guatemala':                  'Difficile',
  'Honduras':                   'Difficile',
  'Panama':                     'Difficile',
  'Paraguay':                   'Difficile',
  'Jamaïque':                   'Difficile',
  'Slovénie':                   'Difficile',
  // Difficile → Moyen
  'Islande':                    'Moyen',
  'Libye':                      'Moyen',
  'Syrie':                      'Moyen',
  'Émirats arabes unis':        'Moyen',
  'Bulgarie':                   'Moyen',
  'Luxembourg':                 'Moyen',
  'Biélorussie':                'Moyen',
  // Difficile → Impossible
  'Bermudes':                   'Impossible',
  'Chypre du Nord':             'Impossible',
  'Sao Tomé-et-Principe':       'Impossible',
}

let changed = 0
data.features.forEach(f => {
  const name = f.properties.name || f.properties.NAME || f.properties.ADMIN
  if (changes[name]) {
    console.log(`${name}: ${f.properties.Difficulty} → ${changes[name]}`)
    f.properties.Difficulty = changes[name]
    changed++
  }
})

fs.writeFileSync(filePath, JSON.stringify(data))
console.log(`\nDone. ${changed}/${Object.keys(changes).length} pays modifiés.`)
```

- [ ] **Step 2 : Exécuter le script**

```bash
node scripts/reclassify-difficulties.js
```

Expected output (22 lignes de changements) :
```
Autriche: Facile → Moyen
Suède: Facile → Moyen
Ukraine: Moyen → Facile
...
Done. 22/22 pays modifiés.
```

Si le count est inférieur à 22, vérifier les noms exacts dans le JSON avec :
```bash
node -e "const c = require('./src/data/countriesWithDifficulty_FR.json'); c.features.forEach(f => console.log(f.properties.name))" | grep -i "autriche"
```

- [ ] **Step 3 : Vérifier les counts résultants**

```bash
node -e "
const c = require('./src/data/countriesWithDifficulty_FR.json');
const d = {};
c.features.forEach(f => { const x = f.properties.Difficulty; d[x] = (d[x]||0)+1; });
console.log(d);
"
```

Expected :
```
{ Facile: 28, Moyen: 53, Difficile: 107, Impossible: 56, '': 11 }
```

- [ ] **Step 4 : Supprimer le script**

```bash
rm scripts/reclassify-difficulties.js
```

- [ ] **Step 5 : Commit**

```bash
git add src/data/countriesWithDifficulty_FR.json
git commit -m "data: reclassify country difficulties per validated spec"
```

---

## Task 2 : Logique — useGameState.js

**Files:**
- Modify: `src/hooks/useGameState.js:24-27`

- [ ] **Step 1 : Remplacer `getAvailableDifficulties`**

Remplacer les lignes 24-27 dans `src/hooks/useGameState.js` :

```js
// AVANT
function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Impossible']
  return DIFFICULTIES.slice(0, DIFFICULTIES.indexOf(difficulty) + 1)
}
```

par :

```js
// APRÈS
function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return [difficulty]
}
```

- [ ] **Step 2 : Lancer les tests existants**

```bash
npm test -- --watchAll=false
```

Expected : tous les tests passent (aucun test ne teste directement `getAvailableDifficulties` — vérifier dans `useGameState.test.js`).

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/useGameState.js
git commit -m "feat: make difficulty tiers exclusive in useGameState"
```

---

## Task 3 : Logique — useFlagGameState.js

**Files:**
- Modify: `src/hooks/useFlagGameState.js:17-20`

- [ ] **Step 1 : Remplacer `getAvailableDifficulties`**

Remplacer les lignes 17-20 dans `src/hooks/useFlagGameState.js` :

```js
// AVANT
function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Impossible']
  return DIFFICULTIES.slice(0, DIFFICULTIES.indexOf(difficulty) + 1)
}
```

par :

```js
// APRÈS
function getAvailableDifficulties(difficulty) {
  if (difficulty === 'Hardcore') return ['Facile', 'Moyen', 'Difficile', 'Impossible']
  return [difficulty]
}
```

- [ ] **Step 2 : Lancer les tests existants**

```bash
npm test -- --watchAll=false
```

Expected : tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/useFlagGameState.js
git commit -m "feat: make difficulty tiers exclusive in useFlagGameState"
```

---

## Task 4 : UI — HomePage.jsx

**Files:**
- Modify: `src/pages/HomePage.jsx:7-13`

- [ ] **Step 1 : Mettre à jour le tableau DIFFICULTIES**

Remplacer les lignes 7-13 dans `src/pages/HomePage.jsx` :

```js
// AVANT
const DIFFICULTIES = [
  { name: 'Facile',     count: 29,  color: '#4ade80' },
  { name: 'Moyen',      count: 83,  color: '#00d4ff' },
  { name: 'Difficile',  count: 191, color: '#fbbf24' },
  { name: 'Impossible', count: 244, color: '#f97316' },
  { name: 'Hardcore',   count: 53,  color: '#f87171' },
];
```

par :

```js
// APRÈS
const DIFFICULTIES = [
  { name: 'Facile',     count: 28,  color: '#4ade80' },
  { name: 'Moyen',      count: 53,  color: '#00d4ff' },
  { name: 'Difficile',  count: 107, color: '#fbbf24' },
  { name: 'Impossible', count: 56,  color: '#f97316' },
  { name: 'Hardcore',   count: 244, color: '#f87171' },
];
```

- [ ] **Step 2 : Mettre à jour le label Hardcore**

Trouver la ligne dans `src/pages/HomePage.jsx` qui rend le nom du bouton Hardcore :

```jsx
{d.name === 'Hardcore' ? '💀 Hardcore' : d.name}
```

Remplacer par :

```jsx
{d.name === 'Hardcore' ? '💀 Hardcore — Tous les pays' : d.name}
```

- [ ] **Step 3 : Vérifier visuellement**

Lancer l'app :
```bash
npm start
```

Vérifier sur la homepage :
- Chaque bouton de difficulté affiche le bon count
- Le bouton Hardcore affiche "💀 Hardcore — Tous les pays" avec "244 pays"

- [ ] **Step 4 : Commit**

```bash
git add src/pages/HomePage.jsx
git commit -m "feat: update difficulty counts and Hardcore label in UI"
```

---

## Task 5 : Vérification finale

- [ ] **Step 1 : Lancer tous les tests**

```bash
npm test -- --watchAll=false
```

Expected : tous les tests passent.

- [ ] **Step 2 : Test manuel Facile**

Lancer l'app, sélectionner Facile, jouer une partie. Vérifier que seuls des pays Facile apparaissent (France, Allemagne, Brésil, Ukraine...) — aucun pays Moyen/Difficile/Impossible ne doit apparaître.

- [ ] **Step 3 : Test manuel Hardcore**

Sélectionner Hardcore, lancer une partie. Vérifier que des pays de tous les tiers peuvent apparaître et que le total est 244.

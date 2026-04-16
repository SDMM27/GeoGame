# Ranking Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les 3 boutons Facile/Moyen/Difficile par un slider numérique (3–20) avec zones colorées dans le mode infini du jeu de classement.

**Architecture:** Le hook `useRankingGameState` reçoit un `countryCount` (number) au lieu d'un `difficulty` (string). `RankingGamePage` gère un état `countryCount` et rend un `<input type="range">` stylisé avec 3 zones colorées via CSS. Aucun composant séparé n'est créé.

**Tech Stack:** React, CSS custom properties, Vitest

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/hooks/useRankingGameState.js` | Modifier — `difficulty` → `countryCount`, `DAILY_COUNT` 6→5, supprimer `COUNTRY_COUNT` |
| `src/hooks/useRankingGameState.test.js` | Modifier — pas de nouveaux tests de pure functions (aucune nouvelle fonction pure exportée) |
| `src/pages/RankingGamePage.jsx` | Modifier — state + UI slider |
| `src/pages/RankingGamePage.css` | Modifier — supprimer styles difficulty, ajouter styles slider |

---

## Task 1 : Mettre à jour le hook

**Fichiers :**
- Modifier : `src/hooks/useRankingGameState.js`

- [ ] **Step 1 : Supprimer `COUNTRY_COUNT` et modifier la signature du hook**

Dans `src/hooks/useRankingGameState.js`, remplacer :

```js
const COUNTRY_COUNT = { Facile: 5, Moyen: 8, Difficile: 10 }
const DAILY_COUNT = 6
```

par :

```js
const DAILY_COUNT = 5
```

- [ ] **Step 2 : Mettre à jour `options` dans le hook**

Remplacer la ligne :

```js
const { difficulty = 'Facile' } = options
```

par :

```js
const { countryCount = 5 } = options
```

- [ ] **Step 3 : Mettre à jour `initInfiniteRound`**

Remplacer :

```js
const n = COUNTRY_COUNT[difficulty] ?? 5
```

par :

```js
const n = countryCount
```

- [ ] **Step 4 : Vérifier les tests existants passent toujours**

```bash
npm test
```

Expected : tous les tests passent (les tests existants ne testent que `computeTotalError` et `pickCriterionKey`, non affectés).

- [ ] **Step 5 : Commit**

```bash
git add src/hooks/useRankingGameState.js
git commit -m "refactor: remplacer difficulty string par countryCount number dans le hook ranking"
```

---

## Task 2 : Mettre à jour le JSX

**Fichiers :**
- Modifier : `src/pages/RankingGamePage.jsx`

- [ ] **Step 1 : Remplacer le state `difficulty` par `countryCount`**

Remplacer :

```jsx
const [difficulty, setDifficulty] = useState('Facile')
```

par :

```jsx
const [countryCount, setCountryCount] = useState(5)
```

- [ ] **Step 2 : Mettre à jour l'appel au hook**

Remplacer :

```jsx
} = useRankingGameState(mode, { difficulty })
```

par :

```jsx
} = useRankingGameState(mode, { countryCount })
```

- [ ] **Step 3 : Remplacer le bloc difficulty par le slider**

Remplacer le bloc entier :

```jsx
{/* Difficulty selector — infinite mode only, before submission */}
{mode === 'infinite' && !isSubmitted && (
  <div className="ranking-difficulty-row">
    {['Facile', 'Moyen', 'Difficile'].map((d) => (
      <button
        key={d}
        className={`ranking-difficulty-btn${difficulty === d ? ' ranking-difficulty-btn--active' : ''}`}
        onClick={() => setDifficulty(d)}
      >
        {d}
      </button>
    ))}
  </div>
)}
```

par :

```jsx
{/* Country count slider — infinite mode only, before choosing category */}
{mode === 'infinite' && status === 'choosing-category' && (
  <div className="ranking-slider-wrap">
    <div className="ranking-slider-value">{countryCount} pays</div>
    <input
      type="range"
      min={3}
      max={20}
      value={countryCount}
      onChange={(e) => setCountryCount(Number(e.target.value))}
      className="ranking-slider"
    />
    <div className="ranking-slider-labels">
      <span className={`ranking-slider-label ranking-slider-label--easy${countryCount <= 5 ? ' ranking-slider-label--active' : ''}`}>
        Facile<br />3–5
      </span>
      <span className={`ranking-slider-label ranking-slider-label--medium${countryCount >= 6 && countryCount <= 12 ? ' ranking-slider-label--active' : ''}`}>
        Moyen<br />6–12
      </span>
      <span className={`ranking-slider-label ranking-slider-label--hard${countryCount >= 13 ? ' ranking-slider-label--active' : ''}`}>
        Difficile<br />13–20
      </span>
    </div>
  </div>
)}
```

- [ ] **Step 4 : Vérifier le rendu en dev**

Lancer `npm run dev`, aller sur `/ranking`, passer en mode Infini. Le slider 3–20 doit s'afficher à la place des boutons. Bouger le slider doit mettre à jour le nombre affiché.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/RankingGamePage.jsx
git commit -m "feat: remplacer boutons difficulté par slider nombre de pays (mode infini)"
```

---

## Task 3 : Mettre à jour le CSS

**Fichiers :**
- Modifier : `src/pages/RankingGamePage.css`

- [ ] **Step 1 : Supprimer les styles difficulty existants**

Supprimer le bloc suivant dans `src/pages/RankingGamePage.css` :

```css
/* ── Difficulty ── */
.ranking-difficulty-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.ranking-difficulty-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-family: var(--font-main);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.ranking-difficulty-btn--active {
  color: var(--text-primary);
  border-color: var(--accent-cyan-border);
  background: rgba(0, 212, 255, 0.12);
}
```

- [ ] **Step 2 : Ajouter les styles du slider à la place**

Ajouter au même endroit :

```css
/* ── Country count slider ── */
.ranking-slider-wrap {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ranking-slider-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.ranking-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    to right,
    #4ade80 0%,
    #4ade80 14.7%,    /* (5-3)/17 = 14.7% — fin zone Facile */
    #facc15 14.7%,
    #facc15 55.9%,    /* (12.5-3)/17 = 55.9% — fin zone Moyen */
    #f87171 55.9%,
    #f87171 100%      /* zone Difficile 13–20 */
  );
}

.ranking-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-primary);
  border: 2px solid var(--bg-primary);
  cursor: pointer;
}

.ranking-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--text-primary);
  border: 2px solid var(--bg-primary);
  cursor: pointer;
}

.ranking-slider-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.ranking-slider-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.3;
  flex: 1;
  transition: color 0.15s, font-weight 0.15s;
}

.ranking-slider-label--active {
  font-weight: 800;
}

.ranking-slider-label--easy.ranking-slider-label--active  { color: #4ade80; }
.ranking-slider-label--medium.ranking-slider-label--active { color: #facc15; }
.ranking-slider-label--hard.ranking-slider-label--active   { color: #f87171; }
```

- [ ] **Step 3 : Vérifier visuellement**

Dans le navigateur :
- Slider doit avoir 3 zones colorées (vert / jaune / rouge)
- Le label de la zone active doit être en gras et coloré
- Le thumb doit être blanc/clair sur fond sombre
- Aucune régression visuelle sur le reste de la page

- [ ] **Step 4 : Commit**

```bash
git add src/pages/RankingGamePage.css
git commit -m "style: ajouter styles slider nombre de pays, supprimer styles difficulty"
```

---

## Task 4 : Vérification finale

- [ ] **Step 1 : Lancer les tests**

```bash
npm test
```

Expected : tous les tests passent.

- [ ] **Step 2 : Vérifier le flow complet en dev**

1. Mode Journalier → pas de slider, partie avec 5 pays ✓
2. Mode Infini → slider visible, défaut à 5
3. Bouger le slider à 3 → choisir une catégorie → 3 pays dans la liste ✓
4. Bouger le slider à 15 → choisir une catégorie → 15 pays dans la liste ✓
5. Lancer le round, soumettre → "Round suivant" → slider réapparaît ✓

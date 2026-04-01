# Game Over Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les boutons "Recommencer" et "Accueil" dans l'overlay de fin de partie, toujours visibles.

**Architecture:** Le bloc `game-over-overlay` dans `GamePage.jsx` est enveloppé dans un conteneur flex-colonne qui empile le `Form` au-dessus et les deux boutons en dessous. Les fonctions `restartGame` et `goHome` existent déjà dans `useGameState` et sont déjà destructurées dans `GamePage`. Un nouveau style CSS `.game-over-actions` aligne les boutons horizontalement.

**Tech Stack:** React, CSS modules inline (GamePage.css), classes `hud-btn` existantes

---

### Task 1 : Ajouter le style `.game-over-actions` dans `GamePage.css`

**Files:**
- Modify: `src/pages/GamePage.css`

> Note : Ce projet teste la logique pure (fonctions hors React), pas le rendu des composants. Le changement est purement visuel/JSX — les fonctions `restartGame` et `goHome` et la condition `isGameOver` sont déjà testées indirectement dans `useGameState.test.js`. Aucun nouveau test n'est donc nécessaire pour cette tâche.

- [ ] **Step 1 : Ajouter la règle CSS après le bloc `.game-over-overlay`**

Ouvre `src/pages/GamePage.css`. Repère la fin du bloc `.game-over-overlay` et ajoute immédiatement après :

```css
.game-over-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.game-over-actions {
  display: flex;
  gap: 12px;
}
```

- [ ] **Step 2 : Vérifier visuellement que le CSS est syntaxiquement valide**

Lance le serveur de dev :
```bash
npm run dev
```
Aucune erreur CSS dans la console. Arrête le serveur (`Ctrl+C`).

---

### Task 2 : Modifier l'overlay dans `GamePage.jsx`

**Files:**
- Modify: `src/pages/GamePage.jsx` (lignes 96–100)

- [ ] **Step 1 : Remplacer le bloc `game-over-overlay`**

Dans `src/pages/GamePage.jsx`, remplace :

```jsx
{isGameOver && (
  <div className="game-over-overlay">
    <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} />
  </div>
)}
```

par :

```jsx
{isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-content">
      <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} />
      <div className="game-over-actions">
        <button className="hud-btn hud-btn--restart" onClick={restartGame}>
          ↺ Recommencer
        </button>
        <button className="hud-btn hud-btn--home" onClick={goHome}>
          ← Accueil
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2 : Lancer les tests pour s'assurer qu'aucune régression**

```bash
npm test
```
Expected : tous les tests passent (vert). Aucun test ne doit échouer.

- [ ] **Step 3 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```
- Jouer une partie jusqu'à la fin (ou passer tous les pays avec "Voir")
- L'overlay apparaît avec le formulaire + les deux boutons dessous
- Cliquer "↺ Recommencer" : la partie repart avec les mêmes paramètres, l'overlay disparaît
- Cliquer "← Accueil" : navigation vers `/`
- Le formulaire reste fonctionnel (saisir un pseudo + sauvegarder fonctionne)

- [ ] **Step 4 : Commit**

```bash
git add src/pages/GamePage.jsx src/pages/GamePage.css
git commit -m "feat: add restart and home buttons to game-over overlay"
```

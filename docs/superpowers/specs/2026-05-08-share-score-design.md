# Share Score — Design Spec
Date: 2026-05-08

## Résumé

Ajouter un bouton "Partager mon score" sur l'écran de fin de chaque mode de jeu. Un clic génère une image PNG via Canvas API et la partage via Web Share API (fallback : téléchargement direct).

---

## Décisions clés

| Question | Réponse |
|---|---|
| Modes couverts | Tous (Placement, Drapeaux, Capitales, BorderGuess, Country Clue, Ranking, Voyage Voyage) |
| Contenu de la carte | Score + mode de jeu + difficulté + pseudo |
| Méthode de partage | Web Share API + fallback download |
| Moment d'apparition | Écran de fin, avant soumission du formulaire de score |
| Génération image | Canvas API natif (zéro dépendance) |

---

## Architecture

### Nouveaux fichiers

**`src/utils/shareScore.js`**
Fonction pure qui reçoit `{ score, gameType, difficulty, pseudo }` et retourne une `Promise<Blob>` (PNG).

- Crée un `<canvas>` 1200×630 hors-DOM
- Dessine le dégradé de fond (`#0f2027` → `#203a43` → `#2c5364`)
- Dessine les cercles décoratifs (rappel globe)
- Écrit les textes : branding, badge difficulté, nom du mode, score, pseudo, CTA
- Retourne `canvas.toBlob('image/png')`

**`src/components/ShareScoreButton.jsx`**
Composant React autonome.

Props : `score` (number), `gameType` (string), `difficulty` (string)

Comportement :
1. Affiche un champ pseudo (`<input>`) prérempli depuis `localStorage['geogame_pseudo']` — si vide, la carte affiche "Anonyme"
2. Bouton "📤 Partager mon score"
3. Au clic :
   - Mémorise le pseudo dans `localStorage['geogame_pseudo']`
   - Appelle `shareScore({ score, gameType, difficulty, pseudo })`
   - Si `navigator.canShare({ files })` → `navigator.share({ files: [new File([blob], 'geogame-score.png', { type: 'image/png' })] })`
   - Sinon → crée un `<a download="geogame-score.png">` et le clique programmatiquement

### Fichiers modifiés

Les 7 pages de jeu reçoivent `<ShareScoreButton>` juste avant `<Form>` dans leur bloc `isGameOver` :

- `src/pages/GamePage.jsx` — gameType: `"PLACEMENT"`
- `src/pages/FlagGamePage.jsx` — gameType: `"FLAGS"`
- `src/pages/CapitalsGamePage.jsx` — gameType: `"CAPITALS"`
- `src/pages/BorderGuessPage.jsx` — gameType: `"BORDER_GUESS"`
- `src/pages/CountryCluePage.jsx` — gameType: `"COUNTRY_CLUE"`
- `src/pages/RankingGamePage.jsx` — gameType: `"RANKING"`
- `src/pages/VoyageVoyagePage.jsx` — gameType: `"VOYAGE_VOYAGE"` (mode infini et daily — dans les deux cas le bouton s'insère avant `<Form>` / `<DailyForm>`)

---

## Design de la carte

**Dimensions :** 1200 × 630 px (ratio 1.9:1, standard OG/Twitter)

**Zones :**
```
┌────────────────────────────────────────┐
│  🌍 GEOGAME              [Difficile]   │  ← top: branding + badge difficulté
│                                        │
│           Jeu des Drapeaux             │
│                 42                     │  ← centre: mode + score en grand
│               POINTS                  │
│                                        │
│  joué par Pierre     peux-tu faire mieux ?  │  ← bas: pseudo + CTA
└────────────────────────────────────────┘
```

**Palette :**
- Fond : `linearGradient(135deg, #0f2027, #203a43, #2c5364)`
- Texte principal : `#ffffff`
- Texte secondaire : `rgba(255,255,255,0.45)`
- Badge difficulté : `rgba(255,255,255,0.10)` + border `rgba(255,255,255,0.15)`
- Déco : 2 cercles concentriques `rgba(255,255,255,0.05)` en haut-droite

**Typographie Canvas :**
- Score : 96px, weight 900
- Mode de jeu : 14px, uppercase, letter-spacing 2px
- Branding : 16px, uppercase, letter-spacing 4px, opacity 0.5
- Pseudo / CTA : 13px, opacity 0.45

---

## Libellés gameType → nom affiché

| gameType | Nom affiché sur la carte |
|---|---|
| `PLACEMENT` | Placement |
| `FLAGS` | Jeu des Drapeaux |
| `CAPITALS` | Capitales |
| `BORDER_GUESS` | BorderGuess |
| `COUNTRY_CLUE` | Country Clue |
| `RANKING` | Ranking |
| `VOYAGE_VOYAGE` | Voyage Voyage |

---

## Gestion d'erreurs

- `navigator.share()` rejeté (utilisateur annule) → rien, pas d'erreur visible
- `navigator.share()` non supporté → fallback download silencieux
- Canvas non supporté (très rare) → bouton caché via `try/catch` dans `shareScore.js`

---

## Ce qui n'est pas inclus

- Rang dans le classement (non disponible avant soumission)
- Carte du continent ou drapeau dans l'image
- Partage vers une URL permalien (pas de backend nécessaire)
- Mode multijoueur (les scores finaux y ont un format différent — à traiter séparément)

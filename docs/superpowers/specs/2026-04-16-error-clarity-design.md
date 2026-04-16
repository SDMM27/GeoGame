# Design : Clarté de l'erreur dans le jeu de classement

**Date :** 2026-04-16

## Contexte

Après soumission, l'écran de résultat affiche "Erreur totale : N positions" sans expliquer ce que cela signifie. Les utilisateurs ne comprennent pas comment ce chiffre est calculé.

L'erreur est calculée par `computeTotalError` dans `useRankingGameState.js` : somme des `|position_jouée − position_correcte|` pour chaque pays.

## Objectif

Rendre immédiatement compréhensible d'où vient le total d'erreur, sans modifier la formule ni le scoring existant.

## Modifications

### 1. Chips d'écart sous le score (`RankingGamePage.jsx`)

Juste sous la ligne `Erreur totale : {totalError} positions`, ajouter une ligne de chips horizontaux scrollables — un par pays.

**Contenu de chaque chip :**
- Nom court du pays (ou abréviation si trop long)
- Écart : `−N` (signe moins + valeur absolue de l'écart)
- Chip vert si écart = 0, rouge sinon (intensité proportionnelle à l'écart : −1 rouge clair, −5 rouge foncé via classes CSS)

**Ordre :** du plus grand écart au plus petit (les pires contributeurs en premier).

**Exemple visuel :**
```
Erreur totale : 16 positions
[Soudan −5] [Samoa −5] [Rép. Dom. −3] [Honduras −2] [Palaos −1] [Hongrie 0]
```

### 2. Écart dans les lignes de résultat (`RankingGamePage.jsx`)

Actuellement : `✗ tu avais mis #6`  
Nouveau : `✗ mis #6 (−5 pos.)`

Ajout de l'écart entre parenthèses sur la même ligne, même style rouge existant.

## Fichiers touchés

- `src/pages/RankingGamePage.jsx` — JSX des deux zones
- `src/pages/RankingGamePage.css` — styles des chips (`.ranking-error-chips`, `.ranking-error-chip`, `.ranking-error-chip--zero`, `.ranking-error-chip--low`, `.ranking-error-chip--mid`, `.ranking-error-chip--high`)

## Ce qui ne change pas

- Formule `computeTotalError` — inchangée
- Scoring `getRankingGamePoints` — inchangé
- Affichage "Erreur totale : N positions" — inchangé, les chips viennent en complément

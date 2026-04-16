# Ranking Game — Slider de nombre de pays

**Date :** 2026-04-16
**Scope :** Mode infini uniquement

## Contexte

Le sélecteur de difficulté actuel (3 boutons Facile / Moyen / Difficile) est remplacé par un slider numérique allant de 3 à 20 pays. Le mode journalier passe de 6 à 5 pays (fixe, pas de slider).

## Comportement

- Le slider s'affiche en mode **infini uniquement**, avant soumission (même condition que les boutons actuels).
- Il disparaît une fois la catégorie choisie et la partie lancée.
- Valeur par défaut : **5**.
- Plage : **3 à 20**.

## Zones indicatives

| Zone | Plage | Couleur |
|------|-------|---------|
| Facile | 3–5 | Vert |
| Moyen | 6–12 | Jaune |
| Difficile | 13–20 | Rouge |

Le label de la zone courante est affiché en gras sous la barre.

## Structure visuelle

```
[ 8 pays ]

[====●===========]

Facile   Moyen   Difficile
 3–5      6–12    13–20
```

- Barre colorée en 3 segments via `linear-gradient` sur le track CSS.
- Valeur courante affichée centrée au-dessus du slider.
- Implémenté inline dans `RankingGamePage.jsx` (pas de composant séparé).

## Changements par fichier

### `src/hooks/useRankingGameState.js`
- Supprimer `COUNTRY_COUNT` (`{ Facile: 5, Moyen: 8, Difficile: 10 }`)
- `options.difficulty` → `options.countryCount` (number)
- `DAILY_COUNT` : 6 → **5**
- `initInfiniteRound` : utilise directement `countryCount` au lieu de `COUNTRY_COUNT[difficulty]`

### `src/pages/RankingGamePage.jsx`
- State `difficulty` (string) → `countryCount` (number, défaut `5`)
- Remplacer la `ranking-difficulty-row` par le slider
- Passer `{ countryCount }` au hook

### `src/pages/RankingGamePage.css`
- Styles du slider : track coloré (3 zones), thumb, label valeur, labels zones
- Label actif en gras

## Scoring

Aucun changement. `getRankingGamePoints(error, countries.length)` s'adapte automatiquement au nombre de pays.

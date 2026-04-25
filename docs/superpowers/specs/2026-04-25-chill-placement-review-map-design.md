# ChillPlacementReview — Revue avec planisphère

**Date:** 2026-04-25  
**Scope:** Mode PLACEMENT du multi chill uniquement

---

## Contexte

La revue de manche chill affiche actuellement un résumé texte des erreurs (`ChillReview`). Pour le mode PLACEMENT (où les joueurs cliquent sur un pays), la revue doit montrer un planisphère pour localiser visuellement les erreurs.

---

## Architecture

### Nouveau composant : `ChillPlacementReview`

- Fichier : `src/components/multiplayer/chill/ChillPlacementReview.jsx`
- Reçoit les mêmes props que `ChillReview`
- Gère les deux étapes :
  - **Step 0** : résumé scores (identique à `ChillReview`, texte seul, pas de carte)
  - **Step ≥ 1** : carte plein écran + barre overlay en bas

### Modification de `ChillGame`

Dans la phase `review`, brancher selon le type :

```jsx
if (chillState.phase === 'review') {
  return gameConfig.type === GAME_TYPES.PLACEMENT
    ? <ChillPlacementReview ... />
    : <ChillReview ... />
}
```

`ChillReview` reste inchangé.

---

## Carte (step ≥ 1)

- **Librairie :** Leaflet + react-leaflet, GeoJSON (réutilise le setup de `ChillPlacementInput`)
- **Layers :** 3 couches GeoJSON (left/center/right) pour le défilement infini
- **Tile :** dark nolabels (même URL que `ChillPlacementInput`)
- **Vue :** monde entier, center `[20, 0]`, zoom 2 — pas de zoom automatique
- **Interaction :** read-only, aucun handler clic/hover

### Highlights par erreur

| Cas | Couleur |
|-----|---------|
| Pays correct | Vert `#22c55e` (fill + border) |
| Pays cliqué (wrong) | Rouge `#ef4444` (fill + border) |
| Aucune réponse donnée | Seul le pays correct est coloré |

Les highlights sont appliqués via `setStyle` sur toutes les copies du pays (left/center/right).  
À chaque changement d'erreur (`reviewStep`), tous les layers sont réinitialisés avant de recolorer.

---

## Barre overlay (step ≥ 1)

Overlay fixe en bas de la carte :

- **Fond :** `#0f172a` à 90% d'opacité
- **Disposition :** horizontale (flex row), centrée verticalement
- **Contenu :**
  - Badge `✗ Erreur X / N` (rouge)
  - Joueur : `{pseudo}` (gras)
  - Réponse donnée : `{clickedAdmin}` en rouge, ou `(rien)` si null
  - Flèche `→`
  - Réponse correcte : `{countryName}` en vert
  - Bouton hôte : `Suivant »` (bleu) ou `Continuer →` (vert) selon position
  - Non-hôte : texte "En attente de l'hôte…"

---

## Props de `ChillPlacementReview`

Identiques à `ChillReview` :

```ts
{
  mancheCountries: string[],   // ADMIN names pour PLACEMENT
  mancheStartIndex: number,
  playerAnswers: object,       // { [pid]: { [idx]: { correct, clickedAdmin } } }
  reviewStep: number,
  isHost: boolean,
  players: object,             // { [pid]: { pseudo } }
  gameType: string,            // toujours PLACEMENT ici
  onNext: () => void,
  onContinue: () => void,
}
```

---

## Ce qui ne change pas

- `ChillReview` : aucune modification
- `ChillGame` : une seule ligne de branchement ajoutée dans la phase `review`
- Logique Firebase / reviewStep : inchangée

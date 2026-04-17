# Zoom automatique sur le continent — Jeu de placement

**Date :** 2026-04-17

## Contexte

En mode continent du jeu de placement, la carte démarre actuellement centrée sur le monde entier (`center=[20, 0]`, `zoom=3`). L'objectif est de zoomer automatiquement sur le continent sélectionné au démarrage de la partie, pour que le joueur voie directement la zone de jeu sans avoir à naviguer manuellement.

## Comportement attendu

- Au démarrage d'une partie en mode continent, la carte se recadre instantanément sur le continent sélectionné.
- Le zoom se déclenche **une seule fois**, au chargement initial de la carte.
- Après le zoom initial, le joueur navigue **librement** sur toute la carte (aucune restriction de déplacement).
- L'animation est **instantanée** (pas de fly-to).
- En mode difficulté (pas de continent sélectionné), le comportement actuel est inchangé.

## Approche retenue

**`fitBounds` dynamique sur le GeoJSON du continent.**

Filtrer `countries.features` par continent, calculer les bounds via `L.geoJSON(filteredFeatures).getBounds()`, puis appeler `mapRef.fitBounds(bounds, { padding: [20, 20], animate: false })`.

Avantages :
- S'appuie sur les données déjà en mémoire
- Aucune valeur hardcodée par continent
- S'adapte automatiquement si de nouveaux pays sont ajoutés au dataset

## Design technique

### Fichier modifié

`src/pages/GamePage.jsx` — composant `PlacementGameLayout` uniquement.

### Flux d'exécution

1. La partie démarre avec `continent` dans le route state (déjà transmis via `useGameState`).
2. `PlacementGameLayout` reçoit `continent` en prop (déjà disponible via `gameState`).
3. `whenReady` initialise `mapRef` (logique existante inchangée).
4. Un `useEffect([mapRef, continent])` se déclenche une fois quand les deux sont disponibles :
   - Si `continent` est null → ne fait rien (mode difficulté, comportement actuel préservé).
   - Sinon → filtre `countries.features` pour ne garder que les features du continent, calcule les bounds Leaflet, appelle `mapRef.fitBounds(bounds, { padding: [20, 20], animate: false })`.

### Pseudocode

```js
useEffect(() => {
  if (!mapRef || !continent) return
  const features = countries.features.filter(
    f => f.properties.continent === continent
  )
  if (features.length === 0) return
  const bounds = L.geoJSON(features).getBounds()
  mapRef.fitBounds(bounds, { padding: [20, 20], animate: false })
}, [mapRef, continent])
```

### Padding

20px de padding sur chaque côté pour éviter que les frontières côtières soient collées aux bords de l'écran.

## Périmètre

- **Inclus :** modes Standard, Ascension, Multiplayer (tous passent par `PlacementGameLayout`).
- **Exclu :** mode difficulté (non affecté), jeu de drapeaux (composant différent), jeu de classement (composant différent).

## Critères de succès

- En mode continent, la carte affiche le continent sélectionné dès l'ouverture sans action du joueur.
- En mode difficulté, le comportement est identique à aujourd'hui.
- Le joueur peut dézoom et naviguer librement après le zoom initial.

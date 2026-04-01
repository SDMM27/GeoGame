# Country Color Persistence — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Problem

Two visual bugs exist in `useGameState.js`:

1. **Found countries (green) can lose their color** on hover — the existing check `layer.options.fillColor === '#4ade80'` is fragile because Leaflet doesn't always keep `layer.options` in sync after `setStyle()`.

2. **Revealed countries (red) always lose their color** on hover — `onCountryMouseOver` and `onCountryMouseOut` only protect green countries. Hovering a red country (shown via "Voir le pays" or 3 consecutive errors) turns it purple, then mouseout resets it to transparent.

## Goals

- Found countries remain green for the entire game session, regardless of hover.
- Countries revealed via "Voir le pays" or 3 consecutive errors remain red for the entire game session, regardless of hover.
- Behavior resets correctly on `restartGame()`.

## Non-Goals

- No change to scoring, game flow, or any other behavior.
- No change to any file other than `useGameState.js`.
- "Voir le pays" keeps its current behavior: red fill + zoom (option C, approved).

---

## Design

### New Refs

Add two Set-based refs to `useGameState`:

```js
const foundCountriesRef = useRef(new Set())  // countries correctly found (green)
const shownCountriesRef = useRef(new Set())  // countries revealed via Voir or 3 errors (red)
```

### Hover Handlers

Replace the `layer.options.fillColor` color checks with Set lookups:

```js
const onCountryMouseOver = (event) => {
  const layer = event.target
  const name = layer.feature.properties.ADMIN
  if (foundCountriesRef.current.has(name)) return
  if (shownCountriesRef.current.has(name)) return
  layer.setStyle({ fillColor: '#7b2ff7', weight: 2, fillOpacity: 0.4 })
}

const onCountryMouseOut = (event) => {
  const layer = event.target
  const name = layer.feature.properties.ADMIN
  if (foundCountriesRef.current.has(name)) return
  if (shownCountriesRef.current.has(name)) return
  layer.setStyle(COUNTRY_STYLE)
}
```

### Set Population

| Event | Set updated |
|-------|-------------|
| Player clicks correct country (`onCountryClick`, line ~190) | `foundCountriesRef.current.add(clickedName)` |
| Player clicks "Voir le pays" (`seeCountry`) | `shownCountriesRef.current.add(targetCountryRef.current)` |
| 3 consecutive errors effect (line ~111) | `shownCountriesRef.current.add(targetCountryRef.current)` |

Note: when a "shown" country is eventually clicked correctly, it moves from `shownCountriesRef` to `foundCountriesRef` and its color changes from red to green. Both sets must be updated at that point:
- `shownCountriesRef.current.delete(clickedName)`
- `foundCountriesRef.current.add(clickedName)`

### Reset

In `restartGame()`, clear both sets:

```js
foundCountriesRef.current.clear()
shownCountriesRef.current.clear()
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useGameState.js` | Add 2 refs, update hover handlers, populate/clear sets |

---

## Testing

- Find a country → it stays green when hovered, stays green across multiple subsequent questions.
- Click "Voir le pays" → country turns red, stays red when hovered, until correctly clicked (then turns green).
- Make 3 errors → country turns red, stays red when hovered.
- Restart → all colors reset, sets empty.

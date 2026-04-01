# Scoring System Redesign

**Date:** 2026-04-01
**Branch:** refonte-bis

## Context

The previous scoring system was inconsistent: using "Voir" (show hint) always cost -1 point regardless of difficulty, while 3 wrong guesses cost between -0.5 and -3 points depending on difficulty. This made it sometimes cheaper to reveal a country immediately than to attempt guessing it.

## Design

### Core Principle

Score is **gain-only** — no negative penalties. Each country awards points based on its difficulty and how many attempts the player needed. Both "Voir" and exhausting all 3 attempts award +0.

### Score Table

| Difficulté | 1re tentative | 2e tentative | 3e tentative | Voir / 3 échecs |
|------------|--------------|--------------|--------------|-----------------|
| Facile     | +3           | +2           | +1           | +0              |
| Moyen      | +5           | +3           | +2           | +0              |
| Difficile  | +7           | +5           | +3           | +0              |
| Impossible | +9           | +7           | +5           | +0              |

At every attempt level, harder difficulty always yields strictly more points than an easier one.

### Implementation Changes (all in `src/hooks/useGameState.js`)

**Remove:**
- `decrementScore(diff)` function — no longer needed
- `Math.max(0, ...)` guard in score state — score can only increase
- `decrementScore('Difficile')` call in `seeCountry()`
- `decrementScore(diff)` call in the 3-error branch of `onCountryClick`

**Replace:**
- `incrementScore(diff)` → `incrementScore(diff, errorCount)`
- Add a 2D score constant:
  ```js
  const SCORE_TABLE = {
    Facile:     [3, 2, 1],
    Moyen:      [5, 3, 2],
    Difficile:  [7, 5, 3],
    Impossible: [9, 7, 5],
  }
  ```
- `incrementScore` reads `SCORE_TABLE[diff][Math.min(errorCount, 2)]` and adds it to the score (0 if country was shown or errorCount >= 3)

**Unchanged:**
- `errorCount` state — already resets to 0 on each new country
- `seeCountry()` visual logic (zoom, red highlight, `shownCountriesRef`)
- 3-error reveal logic in `onCountryClick`
- Score display in `GamePage.jsx`
- Score submission in `form.jsx`

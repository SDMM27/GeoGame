# Daily Leaderboard Fix — Design Spec

**Date:** 2026-04-12
**Games concerned:** Country Clue, Border Guess
**Status:** Approved

---

## Problem

Three bugs in the current daily leaderboard system:

1. **Scores mélangés** — `DailyLeaderboard.jsx` query fetches all scores for a `gameType` without filtering by `dailyKey`, so scores from all past days appear mixed together.
2. **Leaderboard invisible après défaite** — The leaderboard is only displayed when `isSolved` is true (win state). Players who reveal the country (`status === 'lost'`) never see the leaderboard.
3. **Pas d'accès à l'historique** — No way to browse past daily leaderboards.

---

## Solution Overview

Single approach: fix the Firebase query, widen the display condition, and add an in-component date navigation UI.

---

## Architecture

### Files Modified

| File | Change |
|------|--------|
| `src/pages/DailyLeaderboard.jsx` | Fix query filter, add date navigation UI |
| `src/pages/CountryCluePage.jsx` | Widen display condition, pass `dailyKey` prop |
| `src/pages/BorderGuessPage.jsx` | Widen display condition, pass `dailyKey` prop |

No new files required.

---

## Section 1 — Firebase Query Fix

**File:** `src/pages/DailyLeaderboard.jsx`

Add `where('dailyKey', '==', selectedDate)` to the Firestore query so only scores for the selected day are fetched.

```js
// Before
query(collection(firestore, 'daily_scores'), where('gameType', '==', gameType))

// After
query(
  collection(firestore, 'daily_scores'),
  where('gameType', '==', gameType),
  where('dailyKey', '==', selectedDate)
)
```

`selectedDate` is internal state initialized from the `dailyKey` prop passed by the parent page.

---

## Section 2 — Display Condition After Loss

**Files:** `src/pages/CountryCluePage.jsx`, `src/pages/BorderGuessPage.jsx`

Change the condition controlling leaderboard visibility from `isSolved` to `status === 'won' || status === 'lost'`.

```jsx
// Before
{isSolved && mode === 'daily' && (
  <>
    <DailyForm ... />
    <DailyLeaderboard gameType={...} />
  </>
)}

// After
{(status === 'won' || status === 'lost') && mode === 'daily' && (
  <>
    {status === 'won' && <DailyForm ... />}
    <DailyLeaderboard gameType={...} dailyKey={dailyKey} />
  </>
)}
```

- `DailyForm` (score submission) stays conditioned to win only — a player who lost cannot submit a score.
- `DailyLeaderboard` is shown for both outcomes.
- `dailyKey` (the current day's key, e.g. `"2026-04-12"`) is passed as a new prop.

---

## Section 3 — Date Navigation UI

**File:** `src/pages/DailyLeaderboard.jsx`

### Internal state

```js
const [selectedDate, setSelectedDate] = useState(dailyKey); // today by default
const [showFullPicker, setShowFullPicker] = useState(false);
```

### UI — Quick access buttons (7 last days)

Display 7 buttons above the leaderboard table. Each button shows:
- `"Aujourd'hui"` for today
- `"Hier"` for yesterday
- Short locale date (e.g. `"10 avr"`) for older days

Clicking a button sets `selectedDate` to the corresponding `YYYY-MM-DD` key and refetches.

### UI — Full history toggle

Below the 7 buttons, a small link/button labelled **"Voir tout l'historique"**. Clicking it reveals a standard `<input type="date">` with:
- `max` = today (cannot browse future)
- No minimum limit (full historical access)

Changing the date picker value sets `selectedDate` and refetches.

### Empty state

If the Firebase query returns 0 results for a given date:

```jsx
<p>Aucun score pour ce jour.</p>
```

---

## Data Flow

```
Parent page (CountryCluePage / BorderGuessPage)
  ↓ dailyKey prop
DailyLeaderboard
  → internal selectedDate state (init = dailyKey)
  → Firestore query filtered by gameType + selectedDate
  → renders scores or empty state
  → date navigation UI (7 buttons + optional date picker)
```

---

## Out of Scope

- No changes to score submission logic (`DailyForm.jsx`)
- No changes to game state hooks
- No new routes or pages
- No leaderboard for non-daily game modes

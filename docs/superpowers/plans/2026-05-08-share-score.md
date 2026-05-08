# Share Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "📤 Partager mon score" button to every game's end screen that generates a 1200×630 PNG share card via Canvas API and shares it via Web Share API (fallback: download).

**Architecture:** A pure `generateShareCard()` utility draws the card onto an offscreen canvas and returns a PNG Blob; `exportShareCard()` wraps it with Web Share API / download fallback. A self-contained `<ShareScoreButton>` React component hosts a pseudo input (persisted in `localStorage`) and calls `exportShareCard` on click. Each of the 7 game pages imports `<ShareScoreButton>` and renders it just before the score submission form on their end-game screen.

**Tech Stack:** React 18, Canvas API (native, no new deps), Vitest + Testing Library, CSS Modules pattern (existing `.css` file per component).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/utils/shareScore.js` | Canvas generation + Web Share API / download |
| Create | `src/utils/shareScore.test.js` | Unit tests for above |
| Create | `src/components/ShareScoreButton.jsx` | React component: pseudo input + share button |
| Create | `src/components/ShareScoreButton.css` | Minimal styling for the component |
| Create | `src/components/ShareScoreButton.test.jsx` | Component tests |
| Modify | `src/pages/FlagGamePage.jsx` | Add `<ShareScoreButton>` before `<Form>` |
| Modify | `src/pages/GamePage.jsx` | Add `<ShareScoreButton>` before `<Form>` |
| Modify | `src/pages/CapitalsGamePage.jsx` | Add `<ShareScoreButton>` before `<Form>` |
| Modify | `src/pages/BorderGuessPage.jsx` | Add `<ShareScoreButton>` when `isComplete` |
| Modify | `src/pages/CountryCluePage.jsx` | Add `<ShareScoreButton>` when `isComplete` |
| Modify | `src/pages/RankingGamePage.jsx` | Add `<ShareScoreButton>` when `isSubmitted` |
| Modify | `src/pages/VoyageVoyagePage.jsx` | Add `<ShareScoreButton>` inside game-over modal |

---

## Task 1: `src/utils/shareScore.js` — canvas utility

**Files:**
- Create: `src/utils/shareScore.js`
- Test: `src/utils/shareScore.test.js`

- [ ] **Step 1.1 — Write the failing tests**

Create `src/utils/shareScore.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateShareCard, exportShareCard, GAME_LABELS } from './shareScore'

const makeMockCtx = () => ({
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  roundRect: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: '',
  globalAlpha: 1,
  lineWidth: 1,
})

describe('GAME_LABELS', () => {
  it('maps all 7 game types', () => {
    expect(GAME_LABELS.FLAGS).toBe('Jeu des Drapeaux')
    expect(GAME_LABELS.PLACEMENT).toBe('Placement')
    expect(GAME_LABELS.CAPITALS).toBe('Capitales')
    expect(GAME_LABELS.BORDER_GUESS).toBe('BorderGuess')
    expect(GAME_LABELS.COUNTRY_CLUE).toBe('Country Clue')
    expect(GAME_LABELS.RANKING).toBe('Ranking')
    expect(GAME_LABELS.VOYAGE_VOYAGE).toBe('Voyage Voyage')
  })
})

describe('generateShareCard', () => {
  let mockCtx

  beforeEach(() => {
    mockCtx = makeMockCtx()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb =>
      cb(new Blob(['png'], { type: 'image/png' }))
    )
  })

  afterEach(() => vi.restoreAllMocks())

  it('returns an image/png Blob', async () => {
    const blob = await generateShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'Pierre' })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('draws the score as text', async () => {
    await generateShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'Pierre' })
    const texts = mockCtx.fillText.mock.calls.map(c => c[0])
    expect(texts).toContain('42')
  })

  it('rounds fractional scores', async () => {
    await generateShareCard({ score: 7.6, gameType: 'VOYAGE_VOYAGE', difficulty: 'Daily', pseudo: 'X' })
    const texts = mockCtx.fillText.mock.calls.map(c => c[0])
    expect(texts).toContain('8')
  })

  it('displays Anonyme when pseudo is empty', async () => {
    await generateShareCard({ score: 10, gameType: 'FLAGS', difficulty: 'Facile', pseudo: '' })
    const texts = mockCtx.fillText.mock.calls.map(c => String(c[0]))
    expect(texts.some(t => t.includes('Anonyme'))).toBe(true)
  })

  it('uses custom scoreLabel when provided', async () => {
    await generateShareCard({ score: 5, gameType: 'BORDER_GUESS', difficulty: 'Daily', pseudo: '', scoreLabel: 'ESSAIS' })
    const texts = mockCtx.fillText.mock.calls.map(c => String(c[0]))
    expect(texts.some(t => t.includes('ESSAIS'))).toBe(true)
  })
})

describe('exportShareCard', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(makeMockCtx())
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(cb =>
      cb(new Blob(['png'], { type: 'image/png' }))
    )
  })

  afterEach(() => vi.restoreAllMocks())

  it('calls navigator.share when canShare is supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { value: vi.fn().mockReturnValue(true), configurable: true })
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true })
    await exportShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: 'P' })
    expect(mockShare).toHaveBeenCalledOnce()
  })

  it('falls back to URL.createObjectURL when canShare is unsupported', async () => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    const createObj = vi.fn(() => 'blob:fake')
    URL.createObjectURL = createObj
    URL.revokeObjectURL = vi.fn()
    const a = { href: '', download: '', click: vi.fn(), style: {} }
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockImplementation(tag =>
      tag === 'a' ? a : document.createElement.wrappedMethod?.(tag)
    )
    await exportShareCard({ score: 42, gameType: 'FLAGS', difficulty: 'Difficile', pseudo: '' })
    expect(createObj).toHaveBeenCalled()
  })
})
```

- [ ] **Step 1.2 — Run tests to verify they fail**

```bash
npx vitest run src/utils/shareScore.test.js
```

Expected: FAIL — `Cannot find module './shareScore'`

- [ ] **Step 1.3 — Implement `src/utils/shareScore.js`**

```js
export const GAME_LABELS = {
  PLACEMENT: 'Placement',
  FLAGS: 'Jeu des Drapeaux',
  CAPITALS: 'Capitales',
  BORDER_GUESS: 'BorderGuess',
  COUNTRY_CLUE: 'Country Clue',
  RANKING: 'Ranking',
  VOYAGE_VOYAGE: 'Voyage Voyage',
}

export function generateShareCard({ score, gameType, difficulty, pseudo, scoreLabel = 'POINTS' }) {
  return new Promise((resolve, reject) => {
    try {
      const W = 1200, H = 630
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, '#0f2027')
      grad.addColorStop(0.5, '#203a43')
      grad.addColorStop(1, '#2c5364')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Decorative circles (top-right corner)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(W + 60, -60, 260, 0, Math.PI * 2)
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(W + 30, -30, 160, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      const padX = 72
      const padY = 50

      // Branding (top-left)
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 16px "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('🌍 GEOGAME', padX, padY + 16)
      ctx.restore()

      // Difficulty badge (top-right)
      const badgeText = difficulty ?? ''
      if (badgeText) {
        ctx.save()
        ctx.font = '13px "Segoe UI", sans-serif'
        const bW = ctx.measureText(badgeText).width + 28
        const bX = W - padX - bW
        const bY = padY - 4
        ctx.fillStyle = 'rgba(255,255,255,0.10)'
        ctx.beginPath()
        ctx.roundRect(bX, bY, bW, 28, 14)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.globalAlpha = 0.8
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.fillText(badgeText, bX + bW / 2, bY + 18)
        ctx.restore()
      }

      // Game mode label (center, above score)
      const label = GAME_LABELS[gameType] ?? gameType
      const centerY = H / 2
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label.toUpperCase(), W / 2, centerY - 60)
      ctx.restore()

      // Score (large, center)
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 96px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(Math.round(score ?? 0)), W / 2, centerY + 28)
      ctx.restore()

      // Score label (below score)
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.fillStyle = '#ffffff'
      ctx.font = '13px "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(scoreLabel, W / 2, centerY + 60)
      ctx.restore()

      // Pseudo (bottom-left)
      const bottomY = H - padY
      const displayPseudo = pseudo?.trim() || 'Anonyme'
      ctx.save()
      ctx.font = '13px "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.globalAlpha = 0.45
      ctx.fillStyle = '#ffffff'
      const prefixW = ctx.measureText('joué par ').width
      ctx.fillText('joué par ', padX, bottomY)
      ctx.globalAlpha = 1
      ctx.font = '600 13px "Segoe UI", sans-serif'
      ctx.fillText(displayPseudo, padX + prefixW, bottomY)
      ctx.restore()

      // CTA (bottom-right)
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#ffffff'
      ctx.font = 'italic 12px "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('peux-tu faire mieux ?', W - padX, bottomY)
      ctx.restore()

      canvas.toBlob(resolve, 'image/png')
    } catch (err) {
      reject(err)
    }
  })
}

export async function exportShareCard(data) {
  const blob = await generateShareCard(data)
  const file = new File([blob], 'geogame-score.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Mon score GeoGame' })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'geogame-score.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```bash
npx vitest run src/utils/shareScore.test.js
```

Expected: all 8 tests PASS

- [ ] **Step 1.5 — Commit**

```bash
git add src/utils/shareScore.js src/utils/shareScore.test.js
git commit -m "feat: add shareScore canvas utility with Web Share API"
```

---

## Task 2: `src/components/ShareScoreButton.jsx` — React component

**Files:**
- Create: `src/components/ShareScoreButton.jsx`
- Create: `src/components/ShareScoreButton.css`
- Test: `src/components/ShareScoreButton.test.jsx`

- [ ] **Step 2.1 — Write the failing tests**

Create `src/components/ShareScoreButton.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareScoreButton from './ShareScoreButton'

vi.mock('../utils/shareScore', () => ({
  exportShareCard: vi.fn().mockResolvedValue(undefined),
}))

import { exportShareCard } from '../utils/shareScore'

describe('ShareScoreButton', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders a pseudo input and a share button', () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByPlaceholderText('Ton pseudo (optionnel)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument()
  })

  it('prefills pseudo from localStorage', () => {
    localStorage.setItem('geogame_pseudo', 'Alice')
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    expect(screen.getByPlaceholderText('Ton pseudo (optionnel)')).toHaveValue('Alice')
  })

  it('saves pseudo to localStorage when share is clicked', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Bob' } })
    fireEvent.click(screen.getByRole('button', { name: /partager/i }))
    await waitFor(() => expect(exportShareCard).toHaveBeenCalled())
    expect(localStorage.getItem('geogame_pseudo')).toBe('Bob')
  })

  it('calls exportShareCard with all props', async () => {
    render(<ShareScoreButton score={42} gameType="FLAGS" difficulty="Difficile" />)
    fireEvent.change(screen.getByPlaceholderText('Ton pseudo (optionnel)'), { target: { value: 'Pierre' } })
    fireEvent.click(screen.getByRole('button', { name: /partager/i }))
    await waitFor(() =>
      expect(exportShareCard).toHaveBeenCalledWith({
        score: 42,
        gameType: 'FLAGS',
        difficulty: 'Difficile',
        pseudo: 'Pierre',
        scoreLabel: 'POINTS',
      })
    )
  })

  it('forwards a custom scoreLabel to exportShareCard', async () => {
    render(<ShareScoreButton score={5} gameType="BORDER_GUESS" difficulty="Daily" scoreLabel="ESSAIS" />)
    fireEvent.click(screen.getByRole('button', { name: /partager/i }))
    await waitFor(() =>
      expect(exportShareCard).toHaveBeenCalledWith(expect.objectContaining({ scoreLabel: 'ESSAIS' }))
    )
  })
})
```

- [ ] **Step 2.2 — Run tests to verify they fail**

```bash
npx vitest run src/components/ShareScoreButton.test.jsx
```

Expected: FAIL — `Cannot find module './ShareScoreButton'`

- [ ] **Step 2.3 — Implement `src/components/ShareScoreButton.css`**

```css
.share-score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}

.share-pseudo-input {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  padding: 8px 14px;
  width: 240px;
  text-align: center;
}

.share-pseudo-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.share-pseudo-input:focus {
  outline: none;
  border-color: var(--accent-cyan, #22d3ee);
}

.share-score-btn {
  background: linear-gradient(135deg, #0f2027, #2c5364);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  transition: opacity 0.15s;
}

.share-score-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.share-score-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2.4 — Implement `src/components/ShareScoreButton.jsx`**

```jsx
import React, { useState } from 'react'
import { exportShareCard } from '../utils/shareScore'
import './ShareScoreButton.css'

export default function ShareScoreButton({ score, gameType, difficulty, scoreLabel = 'POINTS' }) {
  const [pseudo, setPseudo] = useState(() => localStorage.getItem('geogame_pseudo') ?? '')
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    localStorage.setItem('geogame_pseudo', pseudo)
    setSharing(true)
    try {
      await exportShareCard({ score, gameType, difficulty, pseudo, scoreLabel })
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="share-score-block">
      <input
        className="share-pseudo-input"
        type="text"
        placeholder="Ton pseudo (optionnel)"
        value={pseudo}
        onChange={e => setPseudo(e.target.value)}
        maxLength={30}
      />
      <button
        className="share-score-btn"
        onClick={handleShare}
        disabled={sharing}
      >
        {sharing ? '...' : '📤 Partager mon score'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2.5 — Run tests to verify they pass**

```bash
npx vitest run src/components/ShareScoreButton.test.jsx
```

Expected: all 5 tests PASS

- [ ] **Step 2.6 — Commit**

```bash
git add src/components/ShareScoreButton.jsx src/components/ShareScoreButton.css src/components/ShareScoreButton.test.jsx
git commit -m "feat: add ShareScoreButton component"
```

---

## Task 3: Integrate into FlagGamePage, GamePage, CapitalsGamePage

These three pages share the same pattern: `isGameOver` → overlay → `{onGameFinished ? ... : isAscension ? ... : <Form>}`. The share button goes just before `<Form>` in the standard (non-multiplayer, non-ascension) branch.

**Files:**
- Modify: `src/pages/FlagGamePage.jsx`
- Modify: `src/pages/GamePage.jsx`
- Modify: `src/pages/CapitalsGamePage.jsx`

- [ ] **Step 3.1 — Edit `src/pages/FlagGamePage.jsx`**

Add the import after the existing imports (around line 11):

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find this block (around line 150):

```jsx
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="FLAGS" continent={continent} />
            )}
```

Replace with:

```jsx
            ) : (
              <>
                <ShareScoreButton score={score} gameType="FLAGS" difficulty={difficulty} />
                <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="FLAGS" continent={continent} />
              </>
            )}
```

- [ ] **Step 3.2 — Edit `src/pages/GamePage.jsx`**

Add import after existing imports (around line 14):

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find this block (around line 223):

```jsx
            ) : (
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="PLACEMENT" continent={continent} />
            )}
```

Replace with:

```jsx
            ) : (
              <>
                <ShareScoreButton score={score} gameType="PLACEMENT" difficulty={difficulty} />
                <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="PLACEMENT" continent={continent} />
              </>
            )}
```

- [ ] **Step 3.3 — Edit `src/pages/CapitalsGamePage.jsx`**

Add import after existing imports:

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find the block with (around line 186):

```jsx
              <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="CAPITALS" continent={continent} />
```

This is inside the same ternary pattern (`onGameFinished ? ... : isAscension ? ... : ...`). Replace the final branch:

```jsx
              <>
                <ShareScoreButton score={score} gameType="CAPITALS" difficulty={difficulty} />
                <Form finalScore={score} difficulty={difficulty} elapsedTime={timer} gameType="CAPITALS" continent={continent} />
              </>
```

- [ ] **Step 3.4 — Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 3.5 — Commit**

```bash
git add src/pages/FlagGamePage.jsx src/pages/GamePage.jsx src/pages/CapitalsGamePage.jsx
git commit -m "feat: add share button to FlagGame, Placement, Capitals end screens"
```

---

## Task 4: Integrate into BorderGuessPage and CountryCluePage

These pages use `isComplete` (not `isGameOver`) and `<DailyForm>`. The share button appears when `isComplete`, regardless of the mode (daily/infinite). Score = number of guesses; scoreLabel = 'ESSAIS'.

**Files:**
- Modify: `src/pages/BorderGuessPage.jsx`
- Modify: `src/pages/CountryCluePage.jsx`

- [ ] **Step 4.1 — Edit `src/pages/BorderGuessPage.jsx`**

Add import after existing imports:

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find the result block (around line 203):

```jsx
            <div className={`border-guess-result${isSolved ? ' border-guess-result--win' : isLost ? ' border-guess-result--lose' : ''}`}>
```

Just before that `<div>`, add:

```jsx
            {isComplete && (
              <ShareScoreButton
                score={guesses.length}
                gameType="BORDER_GUESS"
                difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
                scoreLabel="ESSAIS"
              />
            )}
```

- [ ] **Step 4.2 — Edit `src/pages/CountryCluePage.jsx`**

Add import after existing imports:

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find this block (around line 161):

```jsx
            {isComplete && (
              <CountryClueMap guesses={guesses} answerName={answerName} isLost={isLost} />
```

Just after the closing `)}` of that `CountryClueMap` block, add:

```jsx
            {isComplete && (
              <ShareScoreButton
                score={guesses.length}
                gameType="COUNTRY_CLUE"
                difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
                scoreLabel="ESSAIS"
              />
            )}
```

- [ ] **Step 4.3 — Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 4.4 — Commit**

```bash
git add src/pages/BorderGuessPage.jsx src/pages/CountryCluePage.jsx
git commit -m "feat: add share button to BorderGuess and CountryClue end screens"
```

---

## Task 5: Integrate into RankingGamePage

RankingGamePage uses `isSubmitted` (status === 'submitted') and has a `score` variable. Score label = 'POINTS'.

**Files:**
- Modify: `src/pages/RankingGamePage.jsx`

- [ ] **Step 5.1 — Edit `src/pages/RankingGamePage.jsx`**

Add import after existing imports:

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find the `isSubmitted` block (around line 298):

```jsx
        {isSubmitted && (
          <>
            {/* Score */}
            <div className="ranking-score">
```

Just before the `<div className="ranking-score">` line (inside the `isSubmitted &&` block), add:

```jsx
            <ShareScoreButton
              score={score}
              gameType="RANKING"
              difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
            />
```

- [ ] **Step 5.2 — Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 5.3 — Commit**

```bash
git add src/pages/RankingGamePage.jsx
git commit -m "feat: add share button to Ranking end screen"
```

---

## Task 6: Integrate into VoyageVoyagePage

VoyageVoyagePage shows a modal when `isGameOver && showModal`. The score is a float (from `score?.toFixed(1)` usage in the page). scoreLabel = 'PTS'.

**Files:**
- Modify: `src/pages/VoyageVoyagePage.jsx`

- [ ] **Step 6.1 — Edit `src/pages/VoyageVoyagePage.jsx`**

Add import after existing imports:

```jsx
import ShareScoreButton from '../components/ShareScoreButton'
```

Find the modal block (around line 287). Look for the content just before `{mode === 'daily' && (`:

```jsx
            {mode === 'daily' && (
              <>
                <DailyForm
```

Just before that `{mode === 'daily' && (` line, add:

```jsx
            <ShareScoreButton
              score={score ?? 0}
              gameType="VOYAGE_VOYAGE"
              difficulty={mode === 'daily' ? 'Daily' : 'Infini'}
              scoreLabel="PTS"
            />
```

- [ ] **Step 6.2 — Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6.3 — Run the dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:5173. Play any game to completion. Verify:
- "📤 Partager mon score" button appears before the score submission form
- Typing a pseudo and clicking the button triggers the native share sheet (or downloads a PNG on desktop)
- The PNG card shows the correct score, game mode, difficulty, and pseudo
- The pseudo is remembered between games (check `localStorage.getItem('geogame_pseudo')` in DevTools)
- Playing a second game prefills the pseudo from localStorage

- [ ] **Step 6.4 — Final commit**

```bash
git add src/pages/VoyageVoyagePage.jsx
git commit -m "feat: add share button to VoyageVoyage end screen"
```

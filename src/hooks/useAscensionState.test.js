import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useAscensionState from './useAscensionState'
import { GAME_TYPES } from '../utils/gameTypes'
import { saveSnapshot } from '../utils/multiplayerSnapshot'
import { reportEloAnswer } from '../utils/eloReport'
import { FIXTURE_COUNTRIES, byName } from './testUtils/countriesFixture'

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-i18next', () => {
  const value = { t: (key) => key, i18n: { language: 'fr' } }
  return { useTranslation: () => value }
})
vi.mock('../utils/multiplayerSnapshot', () => ({ saveSnapshot: vi.fn() }))
vi.mock('../utils/eloReport', () => ({ reportEloAnswer: vi.fn(), flushElo: vi.fn() }))

const FACILE = FIXTURE_COUNTRIES.filter((c) => c.properties.Difficulty === 'Facile').map((c) => c.properties.ADMIN)
const MOYEN = FIXTURE_COUNTRIES.filter((c) => c.properties.Difficulty === 'Moyen').map((c) => c.properties.ADMIN)

function renderAscension(gameType, phases, { isTraining = false, overrides = null, snapshot = null, snapshotKey = null } = {}) {
  return renderHook(() => useAscensionState(gameType, phases, isTraining, true, overrides, snapshot, snapshotKey))
}

// Nom du pays à trouver, quel que soit le jeu (PLACEMENT garde le nom, FLAGS/CAPITALS la feature)
const targetName = (result) => {
  const target = result.current.targetCountry
  return typeof target === 'string' ? target : target?.properties.ADMIN
}

// FLAGS : saisir une réponse puis valider (deux rendus : handleSubmit lit la saisie courante)
function answer(result, text) {
  act(() => result.current.setInputValue(text))
  act(() => result.current.handleSubmit())
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAscensionState — démarrage', () => {
  it('starts on the first phase with a country of that difficulty', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 2, Moyen: 1 })
    expect(result.current.currentPhase).toBe('Facile')
    expect(result.current.phaseCountRemaining).toBe(2)
    expect(result.current.totalPhaseCount).toBe(2)
    expect(result.current.stats).toMatchObject({ found: 0, skipped: 0, total: 3 })
    expect(FACILE).toContain(targetName(result))
  })

  it('goes back home when no phase has any country', () => {
    renderAscension(GAME_TYPES.FLAGS, { Facile: 0 })
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it('keeps the target as a plain name in placement and as a feature in flags', () => {
    const placement = renderAscension(GAME_TYPES.PLACEMENT, { Facile: 1 })
    expect(typeof placement.result.current.targetCountry).toBe('string')
    const flags = renderAscension(GAME_TYPES.FLAGS, { Facile: 1 })
    expect(flags.result.current.targetCountry.properties).toBeDefined()
  })

  it('only draws capitals game countries that have a capital', () => {
    const { result } = renderAscension(GAME_TYPES.CAPITALS, { Facile: 1 })
    expect(result.current.targetCountry.properties.capital).toBeTruthy()
  })
})

describe('useAscensionState — drapeaux / capitales', () => {
  it('scores a right answer and moves to another country', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 3 })
    const first = targetName(result)
    answer(result, first)
    expect(result.current.score).toBe(3)
    expect(result.current.stats.found).toBe(1)
    expect(result.current.stats.foundFirstTry).toBe(1)
    expect(result.current.phaseCountRemaining).toBe(2)
    expect(targetName(result)).not.toBe(first)
    expect(result.current.inputValue).toBe('')
  })

  it('accepts the English name of the country', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 1 }, { overrides: { Facile: [byName('Allemagne')] } })
    answer(result, 'Germany')
    expect(result.current.stats.found).toBe(1)
  })

  it('accepts the capital in the capitals game', () => {
    const { result } = renderAscension(GAME_TYPES.CAPITALS, { Facile: 1 }, { overrides: { Facile: [byName('Italie')] } })
    answer(result, 'Rome')
    expect(result.current.score).toBe(3)
    expect(result.current.isGameOver).toBe(true)
  })

  it('does not take the first error into account, then lowers the points', () => {
    const oneError = renderAscension(GAME_TYPES.FLAGS, { Facile: 2 })
    answer(oneError.result, 'Atlantide')
    answer(oneError.result, targetName(oneError.result))
    expect(oneError.result.current.score).toBe(3)
    expect(oneError.result.current.stats.foundFirstTry).toBe(0)

    const twoErrors = renderAscension(GAME_TYPES.FLAGS, { Facile: 2 })
    answer(twoErrors.result, 'Atlantide')
    answer(twoErrors.result, 'Mordor')
    answer(twoErrors.result, targetName(twoErrors.result))
    expect(twoErrors.result.current.score).toBe(2)
  })

  it('reveals the answer after 3 errors and moves on 2 s later, counted as skipped', () => {
    vi.useFakeTimers()
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 2 })
    const first = targetName(result)
    answer(result, 'Atlantide')
    answer(result, 'Mordor')
    answer(result, 'Narnia')
    expect(result.current.revealedName).toBe(first)

    // Plus de réponse possible pendant la révélation
    answer(result, first)
    expect(result.current.score).toBe(0)

    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.revealedName).toBeNull()
    expect(result.current.stats).toMatchObject({ found: 0, skipped: 1 })
    expect(result.current.score).toBe(0)
    expect(targetName(result)).not.toBe(first)
  })

  it('gives no points for a country found after « voir la réponse »', () => {
    vi.useFakeTimers()
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 2 })
    act(() => result.current.seeCountry())
    expect(result.current.revealedName).toBe(targetName(result))
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.score).toBe(0)
    expect(result.current.stats.skipped).toBe(1)
  })
})

describe('useAscensionState — placement', () => {
  it('scores a click on the right country', () => {
    const { result } = renderAscension(GAME_TYPES.PLACEMENT, { Facile: 2 })
    const first = targetName(result)
    act(() => result.current.onCountryNameClick(first))
    expect(result.current.score).toBe(3)
    expect(result.current.foundCountriesRef.current.has(first)).toBe(true)
  })

  it('lowers the points with each wrong click (placement has no free error)', () => {
    const { result } = renderAscension(GAME_TYPES.PLACEMENT, { Facile: 2 })
    const target = targetName(result)
    const wrong = FACILE.find((name) => name !== target)
    act(() => result.current.onCountryNameClick(wrong))
    act(() => result.current.onCountryNameClick(target))
    expect(result.current.score).toBe(2)
  })

  it('counts the country as skipped after 3 wrong clicks', () => {
    const { result } = renderAscension(GAME_TYPES.PLACEMENT, { Facile: 2 })
    const target = targetName(result)
    const wrong = FACILE.find((name) => name !== target)
    for (let i = 0; i < 3; i++) act(() => result.current.onCountryNameClick(wrong))
    expect(result.current.shownCountriesRef.current.has(target)).toBe(true)
    act(() => result.current.onCountryNameClick(target))
    expect(result.current.score).toBe(0)
    expect(result.current.stats).toMatchObject({ found: 0, skipped: 1 })
  })

  it('counts the country as skipped after « voir le pays »', () => {
    const { result } = renderAscension(GAME_TYPES.PLACEMENT, { Facile: 2 })
    const target = targetName(result)
    act(() => result.current.seeCountry())
    act(() => result.current.onCountryNameClick(target))
    expect(result.current.score).toBe(0)
    expect(result.current.stats.skipped).toBe(1)
  })
})

describe('useAscensionState — phases', () => {
  it('moves to the next difficulty, records each phase, then ends the game', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 2, Moyen: 1 })
    answer(result, targetName(result))
    answer(result, 'Atlantide')
    answer(result, 'Mordor')
    answer(result, targetName(result))

    expect(result.current.currentPhase).toBe('Moyen')
    expect(result.current.phaseCountRemaining).toBe(1)
    expect(MOYEN).toContain(targetName(result))
    expect(result.current.phaseStats).toEqual([
      expect.objectContaining({ difficulty: 'Facile', count: 2, found: 2, skipped: 0 }),
    ])

    answer(result, targetName(result))
    expect(result.current.isGameOver).toBe(true)
    expect(result.current.score).toBe(3 + 2 + 5)
    expect(result.current.phaseStats.map((p) => p.difficulty)).toEqual(['Facile', 'Moyen'])
  })

  it('never asks the same country twice in a game', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 4 })
    const seen = []
    while (!result.current.isGameOver) {
      seen.push(targetName(result))
      answer(result, targetName(result))
    }
    expect(new Set(seen).size).toBe(4)
  })

  it('restarts from scratch', () => {
    vi.useFakeTimers()
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 1 })
    answer(result, targetName(result))
    expect(result.current.isGameOver).toBe(true)

    act(() => result.current.restartGame())
    act(() => vi.runOnlyPendingTimers())
    expect(result.current.isGameOver).toBe(false)
    expect(result.current.score).toBe(0)
    expect(result.current.stats).toMatchObject({ found: 0, skipped: 0, total: 1 })
    expect(result.current.currentPhase).toBe('Facile')
    expect(FACILE).toContain(targetName(result))
  })

  it('shows ∞ instead of the timer in training', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 1 }, { isTraining: true })
    expect(result.current.displayTimer).toBe('∞')
  })
})

describe('useAscensionState — multijoueur', () => {
  const overrides = { Facile: ['France', 'Espagne', 'Italie'].map(byName), Moyen: ['Japon'].map(byName) }

  it('plays the imposed countries in order', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 3, Moyen: 1 }, { overrides })
    const order = []
    while (!result.current.isGameOver) {
      order.push(targetName(result))
      answer(result, targetName(result))
    }
    expect(order).toEqual(['France', 'Espagne', 'Italie', 'Japon'])
  })

  it('resumes a refreshed game at the right country, score and phase', () => {
    const snapshot = { found: 2, skipped: 1, score: 6, elapsedMs: 12000, foundFirstTry: 2, consecutiveErrors: 0 }
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 3, Moyen: 1 }, { overrides, snapshot, snapshotKey: 'room:1' })
    expect(targetName(result)).toBe('Japon')
    expect(result.current.currentPhase).toBe('Moyen')
    expect(result.current.phaseCountRemaining).toBe(1)
    expect(result.current.score).toBe(6)
    expect(result.current.stats).toMatchObject({ found: 2, skipped: 1, total: 4 })
    expect(result.current.timer).toBe(12000)
  })

  it('saves a snapshot after each answer', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 3 }, { overrides, snapshotKey: 'room:1' })
    saveSnapshot.mockClear()
    answer(result, 'France')
    expect(saveSnapshot).toHaveBeenLastCalledWith('room:1', expect.objectContaining({ found: 1, skipped: 0, score: 3, countryIndex: 1 }))
  })
})

describe('useAscensionState — Elo', () => {
  it('reports each country under the underlying game, with the errors made on it', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 2 })
    const first = targetName(result)
    answer(result, 'Atlantide')
    answer(result, 'Mordor')
    answer(result, first)
    expect(reportEloAnswer).toHaveBeenCalledWith('FLAGS', first, { found: true, errors: 2 })
    const second = targetName(result)
    answer(result, second)
    expect(reportEloAnswer).toHaveBeenCalledWith('FLAGS', second, { found: true, errors: 0 })
  })

  it('reports a country shown on the map as not found', () => {
    const { result } = renderAscension(GAME_TYPES.PLACEMENT, { Facile: 2 })
    const first = targetName(result)
    act(() => result.current.seeCountry())
    act(() => result.current.onCountryNameClick(first))
    expect(reportEloAnswer).toHaveBeenCalledWith('PLACEMENT', first, { found: false, errors: 0 })
  })

  it('reports nothing in a room (override lists)', () => {
    const { result } = renderAscension(GAME_TYPES.FLAGS, { Facile: 1 }, { overrides: { Facile: [byName('Allemagne')] } })
    answer(result, 'Allemagne')
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})

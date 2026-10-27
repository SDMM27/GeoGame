import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useFlagGameState, { getTotalFlagCountries, getTotalMissingFlagCountries } from './useFlagGameState'
import { GAME_TYPES } from '../utils/gameTypes'
import { reportEloAnswer, flushElo } from '../utils/eloReport'
import { FIXTURE_COUNTRIES, byName } from './testUtils/countriesFixture'

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-i18next', () => {
  const value = { t: (key) => key, i18n: { language: 'fr' } }
  return { useTranslation: () => value }
})
vi.mock('../utils/multiplayerSnapshot', () => ({ saveSnapshot: vi.fn() }))
vi.mock('../utils/eloReport', () => ({ reportEloAnswer: vi.fn(), flushElo: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

// Mirror of the scoring logic in useFlagGameState — first error is free.
function computeFlagScore(diff, errorCount) {
  const table = {
    Facile:     [3, 2, 1],
    Moyen:      [5, 3, 2],
    Difficile:  [7, 5, 3],
    Impossible: [9, 7, 5],
  }
  const row = table[diff]
  if (!row) return 0
  const adjustedErrors = Math.max(0, errorCount - 1)
  const idx = Math.min(adjustedErrors, 2)
  return row[idx]
}

describe('computeFlagScore — première erreur tolérée', () => {
  it('Facile, 0 erreur = 3', () => expect(computeFlagScore('Facile', 0)).toBe(3))
  it('Facile, 1 erreur = 3 (tolérée)', () => expect(computeFlagScore('Facile', 1)).toBe(3))
  it('Facile, 2 erreurs = 2', () => expect(computeFlagScore('Facile', 2)).toBe(2))

  it('Moyen, 0 erreur = 5', () => expect(computeFlagScore('Moyen', 0)).toBe(5))
  it('Moyen, 1 erreur = 5 (tolérée)', () => expect(computeFlagScore('Moyen', 1)).toBe(5))
  it('Moyen, 2 erreurs = 3', () => expect(computeFlagScore('Moyen', 2)).toBe(3))

  it('Difficile, 0 erreur = 7', () => expect(computeFlagScore('Difficile', 0)).toBe(7))
  it('Difficile, 1 erreur = 7 (tolérée)', () => expect(computeFlagScore('Difficile', 1)).toBe(7))
  it('Difficile, 2 erreurs = 5', () => expect(computeFlagScore('Difficile', 2)).toBe(5))

  it('Impossible, 0 erreur = 9', () => expect(computeFlagScore('Impossible', 0)).toBe(9))
  it('Impossible, 1 erreur = 9 (tolérée)', () => expect(computeFlagScore('Impossible', 1)).toBe(9))
  it('Impossible, 2 erreurs = 7', () => expect(computeFlagScore('Impossible', 2)).toBe(7))

  it('difficulté inconnue retourne 0', () => expect(computeFlagScore('Hardcore', 0)).toBe(0))
})

const typed = (result, text) => {
  act(() => result.current.setInputValue(text))
  act(() => result.current.handleSubmit())
}

describe('useFlagGameState — Elo', () => {
  it('reports a country found on the first try', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false))
    const name = result.current.targetCountry.properties.ADMIN
    typed(result, name)
    expect(reportEloAnswer).toHaveBeenCalledWith('FLAGS', name, { found: true, errors: 0 })
  })

  it('reports the errors made before the country was found', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false))
    const name = result.current.targetCountry.properties.ADMIN
    typed(result, 'Atlantide')
    typed(result, 'Mordor')
    typed(result, name)
    expect(reportEloAnswer).toHaveBeenCalledTimes(1)
    expect(reportEloAnswer).toHaveBeenCalledWith('FLAGS', name, { found: true, errors: 2 })
  })

  it('reports a country revealed after 3 errors or with "see" as not found', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false))
    const first = result.current.targetCountry.properties.ADMIN
    ;['a1', 'a2', 'a3'].forEach((text) => typed(result, text))
    expect(reportEloAnswer).toHaveBeenCalledWith('FLAGS', first, { found: false, errors: 3 })
    reportEloAnswer.mockClear()
    const other = renderHook(() => useFlagGameState('Facile', false))
    const second = other.result.current.targetCountry.properties.ADMIN
    act(() => other.result.current.seeCountry())
    expect(reportEloAnswer).toHaveBeenCalledWith('FLAGS', second, { found: false, errors: 0 })
  })

  it('reports nothing in a room (override list)', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false, [byName('France'), byName('Espagne')], null, 'room-key'))
    typed(result, 'France')
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})

describe('useFlagGameState — One tap', () => {
  it('counts a country found on the first try', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false))
    typed(result, result.current.targetCountry.properties.ADMIN)
    expect(result.current.stats).toMatchObject({ found: 1, foundFirstTry: 1 })
  })

  it('does not count a country found after an error', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false))
    const name = result.current.targetCountry.properties.ADMIN
    typed(result, 'Atlantide')
    typed(result, name)
    expect(result.current.stats.found).toBe(1)
    expect(result.current.stats.foundFirstTry ?? 0).toBe(0)
  })
})

describe('useFlagGameState — Drapeau incomplet', () => {
  const difficultyOf = (country, property) => country.properties[property]

  it('picks countries by DifficultyMissingFlag, not DifficultyFlag', () => {
    for (let i = 0; i < 10; i++) {
      const { result } = renderHook(() => useFlagGameState('Facile', false, null, null, null, null, GAME_TYPES.MISSING_FLAG))
      expect(difficultyOf(result.current.targetCountry, 'DifficultyMissingFlag')).toBe('Facile')
    }
  })

  it('counts the countries of the mode by DifficultyMissingFlag', () => {
    const count = (property, level) => FIXTURE_COUNTRIES.filter((c) => c.properties[property] === level && c.properties.ISO_A2).length
    expect(getTotalMissingFlagCountries('Facile')).toBe(count('DifficultyMissingFlag', 'Facile'))
    expect(getTotalMissingFlagCountries('Facile')).not.toBe(getTotalFlagCountries('Facile'))
    expect(getTotalFlagCountries('Facile')).toBe(count('DifficultyFlag', 'Facile'))
  })

  it('reports the answers under the MISSING_FLAG mode', () => {
    const { result } = renderHook(() => useFlagGameState('Facile', false, null, null, null, null, GAME_TYPES.MISSING_FLAG))
    const name = result.current.targetCountry.properties.ADMIN
    typed(result, name)
    expect(reportEloAnswer).toHaveBeenCalledWith('MISSING_FLAG', name, { found: true, errors: 0 })
  })
})

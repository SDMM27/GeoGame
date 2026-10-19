import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import useCapitalsGameState from './useCapitalsGameState'
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

const typed = (result, text) => {
  act(() => result.current.setInputValue(text))
  act(() => result.current.handleSubmit())
}

describe('useCapitalsGameState — Elo', () => {
  it('reports the country (not the capital) with its errors', () => {
    const { result } = renderHook(() => useCapitalsGameState('Facile', false))
    const { ADMIN, capital } = result.current.targetCountry.properties
    typed(result, 'Atlantis')
    typed(result, 'Mordor')
    typed(result, capital)
    expect(reportEloAnswer).toHaveBeenCalledWith('CAPITALS', ADMIN, { found: true, errors: 2 })
  })

  it('reports a revealed capital as not found', () => {
    const { result } = renderHook(() => useCapitalsGameState('Facile', false))
    const { ADMIN } = result.current.targetCountry.properties
    act(() => result.current.seeCountry())
    expect(reportEloAnswer).toHaveBeenCalledWith('CAPITALS', ADMIN, { found: false, errors: 0 })
  })

  it('reports nothing in a room (override list)', () => {
    const { result } = renderHook(() => useCapitalsGameState('Facile', false, [byName('France'), byName('Espagne')], null, 'room-key'))
    typed(result, 'Paris')
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})

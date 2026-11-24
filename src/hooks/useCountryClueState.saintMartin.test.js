import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { toast } from 'react-toastify'
import useCountryClueState from './useCountryClueState'
import { saintMartinByName } from './testUtils/saintMartinFixture'

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), dailyKey: '2026-10-08', language: 'fr' }))

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/saintMartinFixture'))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-i18next', () => {
  const value = { t: (key) => key, i18n: { get language() { return mocks.language } } }
  return { useTranslation: () => value }
})
vi.mock('./useDailyKey', () => ({ default: (enabled = true) => (enabled ? mocks.dailyKey : null) }))

function guess(result, text) {
  act(() => result.current.setInputValue(text))
  act(() => result.current.handleSubmit())
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.dailyKey = '2026-10-08'
  mocks.language = 'fr'
})

describe('useCountryClueState — Saint-Martin (MF) vs Sint Maarten (SX)', () => {
  it('« Saint-Martin » propose Saint-Martin (MF), pas la partie néerlandaise', () => {
    const { result } = renderHook(() => useCountryClueState('infinite', { overrideCountry: saintMartinByName('France') }))
    guess(result, 'Saint-Martin')
    expect(result.current.guesses).toHaveLength(1)
    expect(result.current.guesses[0]).toMatchObject({ value: 'Saint-Martin', isoA2: 'MF', isCorrect: false })
  })

  it('le scénario signalé : partie néerlandaise puis « Saint-Martin » donnent deux propositions distinctes', () => {
    const { result } = renderHook(() => useCountryClueState('infinite', { overrideCountry: saintMartinByName('France') }))
    guess(result, 'Saint-Martin (partie néerlandaise)')
    guess(result, 'Saint-Martin')

    expect(result.current.guesses).toHaveLength(2)
    expect(result.current.guesses[0]).toMatchObject({ value: 'Sint Maarten', isoA2: 'SX' })
    expect(result.current.guesses[1]).toMatchObject({ value: 'Saint-Martin', isoA2: 'MF' })

    // Re-saisir « Saint-Martin » est bien « déjà proposé » (il l'a été, sous le bon pays cette fois)
    guess(result, 'Saint-Martin')
    expect(result.current.guesses).toHaveLength(2)
    expect(toast.info).toHaveBeenLastCalledWith('toasts.already_proposed', expect.anything())
  })

  it('deux noms du même pays ne comptent pas comme deux propositions', () => {
    const { result } = renderHook(() => useCountryClueState('infinite', { overrideCountry: saintMartinByName('France') }))
    guess(result, 'Sint Maarten')
    guess(result, 'Saint-Martin (partie néerlandaise)')
    expect(result.current.guesses).toHaveLength(1)
    expect(toast.info).toHaveBeenLastCalledWith('toasts.already_proposed', expect.anything())
  })

  it('quand la réponse est Sint Maarten, « Saint-Martin » reste accepté (alias de la cible)', () => {
    const { result } = renderHook(() => useCountryClueState('infinite', { overrideCountry: saintMartinByName('Sint Maarten') }))
    guess(result, 'Saint-Martin')
    expect(result.current.isSolved).toBe(true)
  })
})

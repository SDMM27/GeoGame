import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { toast } from 'react-toastify'
import useCountryClueState from './useCountryClueState'
import { FIXTURE_COUNTRIES, byName } from './testUtils/countriesFixture'

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), dailyKey: '2026-10-08' }))

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-i18next', () => {
  const value = { t: (key) => key, i18n: { language: 'fr' } }
  return { useTranslation: () => value }
})
vi.mock('./useDailyKey', () => ({ default: (enabled = true) => (enabled ? mocks.dailyKey : null) }))

const NAMES = FIXTURE_COUNTRIES.map((c) => c.properties.ADMIN)
const STORAGE_KEY = 'country-clue-daily:2026-10-08'

function guess(result, text) {
  act(() => result.current.setInputValue(text))
  act(() => result.current.handleSubmit())
}

const otherThan = (name) => NAMES.find((n) => n !== name)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.dailyKey = '2026-10-08'
})

describe('useCountryClueState — défi du jour', () => {
  it('picks the same country for everyone on a given day', () => {
    const first = renderHook(() => useCountryClueState('daily'))
    const second = renderHook(() => useCountryClueState('daily'))
    expect(first.result.current.dailyKey).toBe('2026-10-08')
    expect(NAMES).toContain(first.result.current.answerName)
    expect(second.result.current.answerName).toBe(first.result.current.answerName)
  })

  it('waits for the day (server time) before choosing a country', () => {
    mocks.dailyKey = null
    const { result } = renderHook(() => useCountryClueState('daily'))
    expect(result.current.answerName).toBe('')
    expect(result.current.dailyKey).toBeNull()
    guess(result, 'France')
    expect(result.current.guesses).toEqual([])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('gives distance, direction and comparison hints for a wrong guess', () => {
    const { result } = renderHook(() => useCountryClueState('daily'))
    act(() => result.current.startGame())
    const wrong = otherThan(result.current.answerName)
    guess(result, wrong)

    const [record] = result.current.guesses
    expect(record).toMatchObject({ value: wrong, isCorrect: false })
    expect(record.distanceKm).toBeGreaterThan(0)
    expect(record.direction).toMatch(/Nord|Sud|Est|Ouest|Tout près/)
    expect(record.directionArrow).not.toBe('•')
    for (const hint of [record.hemisphereHint, record.areaHint, record.populationHint]) {
      expect(['match', 'higher', 'lower']).toContain(hint.tone)
    }
    expect(result.current.isComplete).toBe(false)
    expect(result.current.inputValue).toBe('')
  })

  it('compares population: a less populated guess says the answer is more populated', () => {
    // Allemagne (84 M) contre Canada (40 M), tous deux dans le jeu de test
    mocks.dailyKey = null
    const { result } = renderHook(() => useCountryClueState('infinite', { overrideCountry: byName('Allemagne') }))
    guess(result, 'Canada')
    expect(result.current.guesses[0].populationHint.tone).toBe('higher')
    expect(result.current.guesses[0].hemisphereHint.tone).toBe('match')
  })

  it('wins with the right country and stops the clock', () => {
    const { result } = renderHook(() => useCountryClueState('daily'))
    act(() => result.current.startGame())
    guess(result, result.current.answerName)
    expect(result.current.isSolved).toBe(true)
    expect(result.current.isComplete).toBe(true)
    expect(result.current.guesses[0]).toMatchObject({ isCorrect: true, distanceKm: 0 })
    expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0)
    expect(toast.success).toHaveBeenCalled()

    // Partie finie : plus de proposition possible
    guess(result, otherThan(result.current.answerName))
    expect(result.current.guesses).toHaveLength(1)
  })

  it('accepts names typed in English', () => {
    const { result } = renderHook(() => useCountryClueState('infinite', { overrideCountry: byName('Allemagne') }))
    guess(result, 'Germany')
    expect(result.current.isSolved).toBe(true)
  })

  it('rejects unknown countries and repeated guesses without counting them', () => {
    const { result } = renderHook(() => useCountryClueState('daily'))
    guess(result, 'Atlantide')
    expect(toast.error).toHaveBeenCalled()
    expect(result.current.guesses).toHaveLength(0)

    const wrong = otherThan(result.current.answerName)
    guess(result, wrong)
    guess(result, wrong.toUpperCase())
    expect(result.current.guesses).toHaveLength(1)
    expect(toast.info).toHaveBeenLastCalledWith('toasts.already_proposed', expect.anything())
  })

  it('saves the progress of the day and restores it', () => {
    const first = renderHook(() => useCountryClueState('daily'))
    act(() => first.result.current.startGame())
    const answerName = first.result.current.answerName
    guess(first.result, otherThan(answerName))
    first.unmount()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved).toMatchObject({ targetName: answerName, status: 'playing' })
    expect(saved.guesses).toHaveLength(1)

    const second = renderHook(() => useCountryClueState('daily'))
    expect(second.result.current.answerName).toBe(answerName)
    expect(second.result.current.guesses).toHaveLength(1)
    expect(second.result.current.hasStarted).toBe(true)
  })

  it('keeps the saved country even if the daily draw changes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ targetName: 'Japon', guesses: [], status: 'won', startedAt: 1, elapsedTime: 5000 }))
    const { result } = renderHook(() => useCountryClueState('daily'))
    expect(result.current.answerName).toBe('Japon')
    expect(result.current.isSolved).toBe(true)
    expect(result.current.elapsedTime).toBe(5000)
  })

  it('reveals the country on give-up', () => {
    const { result } = renderHook(() => useCountryClueState('daily'))
    act(() => result.current.revealCountry())
    expect(result.current.isLost).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).status).toBe('lost')
  })
})

describe('useCountryClueState — infini et multijoueur', () => {
  it('draws a new country for each infinite round, without saving anything', () => {
    const { result } = renderHook(() => useCountryClueState('infinite'))
    const first = result.current.answerName
    expect(result.current.dailyKey).toBeNull()
    act(() => result.current.revealCountry())
    act(() => result.current.startNextInfiniteRound())
    expect(result.current.answerName).not.toBe(first)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.guesses).toEqual([])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('plays the imposed country in multiplayer, already started, without saving', () => {
    const { result } = renderHook(() => useCountryClueState('daily', { overrideCountry: byName('Brésil') }))
    expect(result.current.answerName).toBe('Brésil')
    expect(result.current.hasStarted).toBe(true)
    expect(result.current.dailyKey).toBeNull()
    guess(result, 'France')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('goes back home on an unknown mode', () => {
    renderHook(() => useCountryClueState('weekly'))
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })
})

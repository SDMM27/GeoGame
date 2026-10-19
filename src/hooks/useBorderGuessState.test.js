import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { toast } from 'react-toastify'
import useBorderGuessState, { ROOM_MAX_ATTEMPTS, roomRoundErrors } from './useBorderGuessState'
import { FIXTURE_COUNTRIES, byName } from './testUtils/countriesFixture'
import { reportEloAnswer } from '../utils/eloReport'

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), dailyKey: '2026-10-08' }))

vi.mock('../data/countriesWithDifficulty_FR.json', async () => import('./testUtils/countriesFixture'))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-i18next', () => {
  const value = { t: (key) => key, i18n: { language: 'fr' } }
  return { useTranslation: () => value }
})
vi.mock('../utils/eloReport', () => ({ reportEloAnswer: vi.fn(), flushElo: vi.fn() }))
vi.mock('./useDailyKey', () => ({ default: (enabled = true) => (enabled ? mocks.dailyKey : null) }))

const NAMES = FIXTURE_COUNTRIES.map((c) => c.properties.ADMIN)
const STORAGE_KEY = 'border-guess-daily:2026-10-08'

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

describe('useBorderGuessState — défi du jour', () => {
  it('picks the same country for everyone on a given day', () => {
    const first = renderHook(() => useBorderGuessState('daily'))
    const second = renderHook(() => useBorderGuessState('daily'))
    expect(first.result.current.dailyKey).toBe('2026-10-08')
    expect(NAMES).toContain(first.result.current.answerName)
    expect(second.result.current.answerName).toBe(first.result.current.answerName)
    expect(first.result.current.currentCountryISO).toBe(first.result.current.currentCountry.properties.ISO_A2)
  })

  it('waits for the day (server time) before choosing a country', () => {
    mocks.dailyKey = null
    const { result } = renderHook(() => useBorderGuessState('daily'))
    expect(result.current.currentCountry).toBeNull()
    guess(result, 'France')
    expect(result.current.guesses).toEqual([])
  })

  it('gives the distance and direction of a wrong guess', () => {
    const { result } = renderHook(() => useBorderGuessState('infinite', { overrideCountry: byName('Japon') }))
    guess(result, 'France')
    const [record] = result.current.guesses
    expect(record).toMatchObject({ value: 'France', iso: 'FR', isCorrect: false, direction: 'Est', directionArrow: '→' })
    expect(record.distanceKm).toBeGreaterThan(8000)
    expect(record.distanceKm).toBeLessThan(11000)
    expect(toast.error).toHaveBeenCalledWith('toasts.wrong', expect.anything())
  })

  it('wins with the right country (in any supported language)', () => {
    const { result } = renderHook(() => useBorderGuessState('infinite', { overrideCountry: byName('Espagne') }))
    guess(result, 'Spain')
    expect(result.current.isSolved).toBe(true)
    expect(result.current.status).toBe('won')
    expect(result.current.guesses[0]).toMatchObject({ isCorrect: true, distanceKm: 0, direction: null })
    expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0)
  })

  it('rejects unknown countries and repeated guesses', () => {
    const { result } = renderHook(() => useBorderGuessState('daily'))
    guess(result, 'Atlantide')
    expect(toast.error).toHaveBeenCalledWith('survival.not_a_country', expect.anything())
    const wrong = otherThan(result.current.answerName)
    guess(result, wrong)
    guess(result, ` ${wrong.toLowerCase()} `)
    expect(result.current.guesses).toHaveLength(1)
  })

  it('suggests matching names as the player types', () => {
    const { result } = renderHook(() => useBorderGuessState('daily'))
    act(() => result.current.setInputValue('al'))
    expect(result.current.filteredCountrySuggestions).toEqual(expect.arrayContaining(['Allemagne', 'Australie', 'Italie']))
    expect(result.current.filteredCountrySuggestions).not.toContain('France')
  })

  it('saves the progress of the day and restores it', () => {
    const first = renderHook(() => useBorderGuessState('daily'))
    act(() => first.result.current.startGame())
    const answerName = first.result.current.answerName
    guess(first.result, answerName)
    first.unmount()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved).toMatchObject({ targetName: answerName, status: 'won' })

    const second = renderHook(() => useBorderGuessState('daily'))
    expect(second.result.current.isSolved).toBe(true)
    expect(second.result.current.hasStarted).toBe(true)
    expect(second.result.current.guesses).toHaveLength(1)
  })

  it('reveals the country on give-up', () => {
    const { result } = renderHook(() => useBorderGuessState('daily'))
    act(() => result.current.revealCountry())
    expect(result.current.isLost).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).status).toBe('lost')
  })
})

describe('useBorderGuessState — infini et multijoueur', () => {
  it('draws a different country for the next infinite round', () => {
    const { result } = renderHook(() => useBorderGuessState('infinite'))
    const first = result.current.answerName
    act(() => result.current.startNextInfiniteRound())
    expect(result.current.answerName).not.toBe(first)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('restores the guesses of a multiplayer round once, then starts the next rounds empty', () => {
    const restored = [{ value: 'France', iso: 'FR', normalizedInput: 'france', isCorrect: false }]
    const { result, rerender } = renderHook(
      ({ country }) => useBorderGuessState('daily', { overrideCountry: country, initialGuesses: restored }),
      { initialProps: { country: byName('Japon') } }
    )
    expect(result.current.guesses).toEqual(restored)
    expect(result.current.hasStarted).toBe(true)

    rerender({ country: byName('Canada') })
    expect(result.current.answerName).toBe('Canada')
    expect(result.current.guesses).toEqual([])
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('ends a multiplayer round once the guesses run out', () => {
    const { result } = renderHook(() =>
      useBorderGuessState('daily', { overrideCountry: byName('Japon'), maxAttempts: ROOM_MAX_ATTEMPTS })
    )
    expect(result.current.attemptsLeft).toBe(3)
    guess(result, 'France')
    guess(result, 'Espagne')
    expect(result.current.attemptsLeft).toBe(1)
    expect(result.current.isComplete).toBe(false)
    guess(result, 'Canada')
    expect(result.current.isLost).toBe(true)
    expect(result.current.attemptsLeft).toBe(0)
    guess(result, 'Japon')
    expect(result.current.guesses).toHaveLength(3)
  })

  it('has no guess limit outside multiplayer', () => {
    const { result } = renderHook(() => useBorderGuessState('infinite', { overrideCountry: byName('Japon') }))
    ;['France', 'Espagne', 'Canada', 'Brésil'].forEach((name) => guess(result, name))
    expect(result.current.isComplete).toBe(false)
    expect(result.current.attemptsLeft).toBeNull()
  })

  it('counts a country not found (passed or out of guesses) as the most errors a round allows', () => {
    const wrong = { isCorrect: false }
    const right = { isCorrect: true }
    expect(roomRoundErrors([], false)).toBe(ROOM_MAX_ATTEMPTS)
    expect(roomRoundErrors([wrong], false)).toBe(ROOM_MAX_ATTEMPTS)
    expect(roomRoundErrors([wrong, wrong, wrong], false)).toBe(ROOM_MAX_ATTEMPTS)
    expect(roomRoundErrors([right], true)).toBe(0)
    expect(roomRoundErrors([wrong, wrong, right], true)).toBe(2)
  })

  it('goes back home on an unknown mode', () => {
    renderHook(() => useBorderGuessState('weekly'))
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })
})

describe('useBorderGuessState — Elo', () => {
  it('reports the free mode with the wrong guesses made before the answer', () => {
    const { result } = renderHook(() => useBorderGuessState('infinite'))
    const answer = result.current.answerName
    const wrong = NAMES.filter((n) => n !== answer).slice(0, 2)
    wrong.forEach((name) => guess(result, name))
    guess(result, answer)
    expect(reportEloAnswer).toHaveBeenCalledWith('BORDER_GUESS', answer, { found: true, errors: 2 })
  })

  it('reports a revealed country as not found', () => {
    const { result } = renderHook(() => useBorderGuessState('infinite'))
    const answer = result.current.answerName
    guess(result, NAMES.find((n) => n !== answer))
    act(() => result.current.revealCountry())
    expect(reportEloAnswer).toHaveBeenCalledWith('BORDER_GUESS', answer, { found: false, errors: 1 })
  })

  it('reports nothing for the daily or in a room', () => {
    const daily = renderHook(() => useBorderGuessState('daily'))
    guess(daily.result, daily.result.current.answerName)
    const room = renderHook(() => useBorderGuessState('infinite', { overrideCountry: byName('Japon') }))
    guess(room.result, 'Japon')
    expect(reportEloAnswer).not.toHaveBeenCalled()
  })
})

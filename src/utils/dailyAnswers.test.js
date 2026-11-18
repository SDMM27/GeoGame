import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDocs, setDoc } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  collection: (_db, ...path) => path.join('/'),
  doc: (_db, ...path) => path.join('/'),
  limit: (count) => count,
  query: (ref, ...constraints) => [ref, ...constraints],
  where: (...constraint) => constraint,
  getDocs: vi.fn(),
  setDoc: vi.fn(),
}))
vi.mock('../Firebase', () => ({ firestore: {} }))

const { answersAccess, answersOf, answersEntryId, fetchDailyAnswers } = await import('./dailyAnswers')

describe('fetchDailyAnswers', () => {
  const day = '2026-11-18'
  const game = 'COUNTRY_CLUE'
  const denied = { code: 'permission-denied' }

  beforeEach(() => {
    getDocs.mockReset().mockRejectedValueOnce(denied)
    setDoc.mockReset().mockResolvedValue(undefined)
  })

  it('restores access from a score saved before answers were stored separately', async () => {
    const guesses = ['A', 'B']
    getDocs
      .mockResolvedValueOnce({ docs: [{ id: 'old-score', data: () => ({ guesses }) }] })
      .mockResolvedValueOnce({ docs: [{ data: () => ({ scoreId: 'other-score', guesses: ['C', 'B'] }) }] })

    const answers = await fetchDailyAnswers(game, day, 'alice')

    expect(getDocs).toHaveBeenNthCalledWith(2, [
      'daily_scores', ['uid', '==', 'alice'], ['gameType', '==', game], ['dailyKey', '==', day], 1,
    ])
    expect(setDoc).toHaveBeenCalledWith(`daily_answers/${day}/${game}/alice`, { scoreId: 'old-score', uid: 'alice', guesses })
    expect(getDocs).toHaveBeenNthCalledWith(3, `daily_answers/${day}/${game}`)
    expect(answers.get('other-score').guesses).toEqual(['C', 'B'])
  })

  it('keeps the answers locked when the player has no score for that game and day', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] })

    await expect(fetchDailyAnswers(game, day, 'alice')).resolves.toBeNull()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('keeps the answers locked when Firestore still refuses the read after repair', async () => {
    getDocs
      .mockResolvedValueOnce({ docs: [{ id: 'saved-score', data: () => ({}) }] })
      .mockRejectedValueOnce(denied)

    await expect(fetchDailyAnswers(game, day, 'alice')).resolves.toBeNull()
    expect(setDoc).toHaveBeenCalledWith(`daily_answers/${day}/${game}/alice`, { scoreId: 'saved-score', uid: 'alice' })
    expect(getDocs).toHaveBeenCalledTimes(3)
  })
})

describe('answersAccess', () => {
  it('opens a past day to everyone', () => {
    expect(answersAccess('2026-11-17', '2026-11-18', undefined)).toBe('open')
    expect(answersAccess('2026-11-17', '2026-11-18', 'alice')).toBe('open')
  })

  it("locks today without an account, with nothing to ask", () => {
    expect(answersAccess('2026-11-18', '2026-11-18', undefined)).toBe('signed-out')
  })

  it("leaves today to Firestore for a signed-in player", () => {
    expect(answersAccess('2026-11-18', '2026-11-18', 'alice')).toBe('check')
  })

  it('does not lock without a day to show', () => {
    expect(answersAccess('', '2026-11-18', undefined)).toBe('open')
    expect(answersAccess('2026-11-18', '', undefined)).toBe('open')
  })
})

describe('answersEntryId', () => {
  it("is the account's uid, or v_ and the score's id for a visitor", () => {
    expect(answersEntryId('s1', 'alice')).toBe('alice')
    expect(answersEntryId('s1', undefined)).toBe('v_s1')
  })
})

describe('answersOf', () => {
  const answers = new Map([['s1', { guesses: ['A', 'B'], playerOrder: undefined }]])

  it('shows nothing when locked, even the fields an old app saved in the score', () => {
    expect(answersOf({ id: 's1', guesses: ['X'], playerOrder: ['Y'] }, { locked: true, answers })).toBeNull()
  })

  it("prefers the daily_answers entry of the score", () => {
    expect(answersOf({ id: 's1', guesses: ['X'] }, { locked: false, answers })).toEqual({ guesses: ['A', 'B'], playerOrder: undefined })
  })

  it('falls back to the fields saved in the score when there is no entry', () => {
    expect(answersOf({ id: 's2', guesses: ['X'], playerOrder: ['Y'] }, { locked: false, answers })).toEqual({ guesses: ['X'], playerOrder: ['Y'] })
    expect(answersOf({ guesses: ['X'] }, { locked: false, answers: null })).toEqual({ guesses: ['X'], playerOrder: undefined })
  })
})

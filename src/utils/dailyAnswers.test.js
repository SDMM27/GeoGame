import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({}))
vi.mock('../Firebase', () => ({ firestore: {} }))

const { answersAccess, answersOf, answersEntryId } = await import('./dailyAnswers')

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

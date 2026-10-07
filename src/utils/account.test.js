import { describe, it, expect } from 'vitest'
import { accountErrorKey, normalizeUsername, validateUsername } from './account'

describe('validateUsername', () => {
  it('accepts letters, digits, spaces and _ - .', () => {
    expect(validateUsername('Sacha_27')).toBeNull()
    expect(validateUsername('Jean-Éric G.')).toBeNull()
    expect(validateUsername('Иван')).toBeNull()
  })

  it('rejects names that are too short or too long', () => {
    expect(validateUsername('ab')).toBe('username_length')
    expect(validateUsername('   ab   ')).toBe('username_length')
    expect(validateUsername('a'.repeat(21))).toBe('username_length')
  })

  it('rejects other characters and a leading symbol', () => {
    expect(validateUsername('hello!')).toBe('username_chars')
    expect(validateUsername('_hello')).toBe('username_chars')
    expect(validateUsername('a<b>c')).toBe('username_chars')
  })
})

describe('normalizeUsername', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeUsername('  Le   Voyageur ')).toBe('Le Voyageur')
  })
})

describe('accountErrorKey', () => {
  it('maps Firebase errors to translation keys', () => {
    expect(accountErrorKey({ code: 'auth/email-already-in-use' })).toBe('email_in_use')
    expect(accountErrorKey({ code: 'auth/invalid-credential' })).toBe('wrong_credentials')
    expect(accountErrorKey({ code: 'permission-denied' })).toBe('not_enabled')
    expect(accountErrorKey({ code: 'something/else' })).toBe('generic')
  })
})

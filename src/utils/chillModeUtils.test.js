import { describe, test, expect } from 'vitest'
import {
  CHILL_COUNTDOWN_MS,
  getCountdownMs,
  evaluateTextAnswer,
  evaluateGuessAnswer,
  evaluatePlacement,
  flattenAscensionCountries,
} from './chillModeUtils'

describe('getCountdownMs', () => {
  test('retourne les durées exactes par difficulté', () => {
    expect(getCountdownMs('Facile')).toBe(6000)
    expect(getCountdownMs('Moyen')).toBe(8000)
    expect(getCountdownMs('Difficile')).toBe(10000)
    expect(getCountdownMs('Impossible')).toBe(15000)
  })
  test('retourne 10000 pour une difficulté inconnue', () => {
    expect(getCountdownMs('Hardcore')).toBe(10000)
    expect(getCountdownMs(undefined)).toBe(10000)
  })
})

describe('evaluateTextAnswer', () => {
  test('correct sur correspondance exacte', () => {
    const r = evaluateTextAnswer('France', 'France', [], 'Facile')
    expect(r.correct).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
  test('correct sur alias', () => {
    const r = evaluateTextAnswer('Francia', 'France', ['Francia'], 'Moyen')
    expect(r.correct).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
  test('correct insensible à la casse et aux accents', () => {
    const r = evaluateTextAnswer('france', 'France', [], 'Facile')
    expect(r.correct).toBe(true)
  })
  test('incorrect sur mauvaise réponse', () => {
    const r = evaluateTextAnswer('Allemagne', 'France', [], 'Facile')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
  test('incorrect sur réponse vide', () => {
    expect(evaluateTextAnswer('', 'France', [], 'Facile').correct).toBe(false)
    expect(evaluateTextAnswer(null, 'France', [], 'Facile').correct).toBe(false)
  })
})

describe('evaluateGuessAnswer', () => {
  test('correct donne 3 pts (getGuessGamePoints(0))', () => {
    const r = evaluateGuessAnswer('France', 'France', [])
    expect(r.correct).toBe(true)
    expect(r.score).toBe(3)
  })
  test('correct sur alias', () => {
    const r = evaluateGuessAnswer('Francia', 'France', ['Francia'])
    expect(r.correct).toBe(true)
    expect(r.score).toBe(3)
  })
  test('incorrect donne 0 pt', () => {
    const r = evaluateGuessAnswer('Belgique', 'France', [])
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
})

describe('evaluatePlacement', () => {
  test('correct quand les noms correspondent', () => {
    const r = evaluatePlacement('France', 'France', 'Moyen')
    expect(r.correct).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })
  test('correct insensible à la casse', () => {
    const r = evaluatePlacement('france', 'France', 'Moyen')
    expect(r.correct).toBe(true)
  })
  test('incorrect quand les noms ne correspondent pas', () => {
    const r = evaluatePlacement('Allemagne', 'France', 'Moyen')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
  test('incorrect si clickedAdmin est null', () => {
    const r = evaluatePlacement(null, 'France', 'Moyen')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
  })
})

describe('flattenAscensionCountries', () => {
  test("aplatit dans l'ordre Facile→Moyen→Difficile→Impossible", () => {
    const overrides = {
      Facile: [{ ADMIN: 'A' }, { ADMIN: 'B' }],
      Moyen: [{ ADMIN: 'C' }],
      Difficile: [],
      Impossible: [{ ADMIN: 'D' }],
    }
    const result = flattenAscensionCountries(overrides)
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ country: { ADMIN: 'A' }, difficulty: 'Facile' })
    expect(result[2]).toEqual({ country: { ADMIN: 'C' }, difficulty: 'Moyen' })
    expect(result[3]).toEqual({ country: { ADMIN: 'D' }, difficulty: 'Impossible' })
  })
  test('retourne [] pour un objet vide', () => {
    expect(flattenAscensionCountries({})).toEqual([])
  })
})

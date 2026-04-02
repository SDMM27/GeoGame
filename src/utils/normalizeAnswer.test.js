import { describe, it, expect } from 'vitest'
import { normalize, checkAnswer } from './normalizeAnswer'

describe('normalize', () => {
  it('lowercases the string', () => {
    expect(normalize('France')).toBe('france')
  })
  it('removes accents', () => {
    expect(normalize('États-Unis')).toBe('etats unis')
  })
  it('converts hyphens to spaces', () => {
    expect(normalize('Guinée-Bissau')).toBe('guinee bissau')
  })
  it("converts apostrophes to spaces", () => {
    expect(normalize("Côte d'Ivoire")).toBe('cote d ivoire')
  })
  it('collapses multiple spaces', () => {
    expect(normalize('A  B   C')).toBe('a b c')
  })
  it('trims leading and trailing spaces', () => {
    expect(normalize('  france  ')).toBe('france')
  })
})

describe('checkAnswer', () => {
  it('accepts exact match (normalized)', () => {
    expect(checkAnswer('france', 'France', [])).toBe(true)
  })
  it('accepts accent-free input', () => {
    expect(checkAnswer('etats-unis d amerique', "États-Unis d'Amérique", [])).toBe(true)
  })
  it('rejects partial match with no alias', () => {
    expect(checkAnswer('etats-unis', "États-Unis d'Amérique", [])).toBe(false)
  })
  it('accepts input matching an alias', () => {
    expect(checkAnswer('etats-unis', "États-Unis d'Amérique", ['États-Unis'])).toBe(true)
  })
  it('rejects wrong country', () => {
    expect(checkAnswer('espagne', 'France', [])).toBe(false)
  })
  it('is case-insensitive', () => {
    expect(checkAnswer('FRANCE', 'France', [])).toBe(true)
  })
})

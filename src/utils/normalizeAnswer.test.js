import { describe, it, expect } from 'vitest'
import { normalize, checkAnswer, typoDistance, getTypoTolerance, matchAnswer } from './normalizeAnswer'

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
    expect(normalize('Côte d’Ivoire')).toBe('cote d ivoire')
    expect(normalize('Мʼянма')).toBe(normalize("М'янма"))
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

describe('typoDistance', () => {
  it('counts substitutions, insertions and deletions', () => {
    expect(typoDistance('bresil', 'bresl')).toBe(1)
    expect(typoDistance('bresil', 'bresill')).toBe(1)
    expect(typoDistance('bresil', 'brasil')).toBe(1)
  })
  it('counts an adjacent swap as a single error', () => {
    expect(typoDistance('bogota', 'bogtoa')).toBe(1)
  })
  it('stops early above the max', () => {
    expect(typoDistance('france', 'kazakhstan', 2)).toBe(3)
  })
})

describe('getTypoTolerance', () => {
  it('is strict for short names and grows with length', () => {
    expect(getTypoTolerance(4)).toBe(0)
    expect(getTypoTolerance(5)).toBe(1)
    expect(getTypoTolerance(8)).toBe(1)
    expect(getTypoTolerance(9)).toBe(2)
  })
})

describe('matchAnswer', () => {
  const known = ['Gambie', 'Zambie', 'Niger', 'Nigeria', 'Iran', 'Irak', 'Slovénie', 'Slovaquie', 'Ouagadougou', 'Lima', 'Lomé']

  it('returns exact for a normalized exact match', () => {
    expect(matchAnswer('brésil', ['Brésil'], known)).toEqual({ match: 'exact', name: 'Brésil' })
  })
  it('accepts one typo on a medium-length name and returns the correct spelling', () => {
    expect(matchAnswer('Gambbie', ['Gambie'], known)).toEqual({ match: 'typo', name: 'Gambie' })
  })
  it('accepts two typos on a long name', () => {
    expect(matchAnswer('Ouagadogouu', ['Ouagadougou'], known)?.match).toBe('typo')
  })
  it('accepts swapped letters', () => {
    expect(matchAnswer('Tegucigapla', ['Tegucigalpa'], known)?.match).toBe('typo')
  })
  it('stays strict on short names', () => {
    expect(matchAnswer('Irn', ['Iran'], known)).toBeNull()
    expect(matchAnswer('Irak', ['Iran'], known)).toBeNull()
    expect(matchAnswer('Lomé', ['Lima'], known)).toBeNull()
  })
  it('rejects another real answer within tolerance', () => {
    expect(matchAnswer('Zambie', ['Gambie'], known)).toBeNull()
    expect(matchAnswer('Niger', ['Nigeria'], known)).toBeNull()
    expect(matchAnswer('Slovaquie', ['Slovénie'], known)).toBeNull()
  })
  it('rejects input as close to another answer as to the target', () => {
    expect(matchAnswer('Nigeri', ['Nigeria'], known)).toBeNull()
  })
  it('accepts a typo on an alias', () => {
    expect(matchAnswer('Etats Unix', ["États-Unis d'Amérique", 'États-Unis'], known)).toEqual({ match: 'typo', name: 'États-Unis' })
  })
  it('rejects empty input and too many typos', () => {
    expect(matchAnswer('  ', ['France'], known)).toBeNull()
    expect(matchAnswer('Frnaec', ['France'], known)).toBeNull()
  })

  describe('whileTyping', () => {
    it('does not accept an unfinished word', () => {
      expect(matchAnswer('Ouagadoug', ['Ouagadougou'], known, { whileTyping: true })).toBeNull()
      expect(matchAnswer('Gambi', ['Gambie'], known, { whileTyping: true })).toBeNull()
    })
    it('accepts a typo once the word is at least as long as the answer', () => {
      expect(matchAnswer('Gambbie', ['Gambie'], known, { whileTyping: true })?.match).toBe('typo')
      expect(matchAnswer('Tegucigapla', ['Tegucigalpa'], known, { whileTyping: true })?.match).toBe('typo')
    })
    it('still accepts exact matches and keeps the anti-confusion rule', () => {
      expect(matchAnswer('ouagadougou', ['Ouagadougou'], known, { whileTyping: true })?.match).toBe('exact')
      expect(matchAnswer('Zambie', ['Gambie'], known, { whileTyping: true })).toBeNull()
    })
  })
})

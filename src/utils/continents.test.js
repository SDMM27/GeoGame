import { describe, it, expect } from 'vitest'

// Pure filter logic — same as what the hooks will use
function countByContinent(features, continent, extraChecks = []) {
  return features.filter(f => {
    if (f.properties.continent !== continent) return false
    return extraChecks.every(check => check(f.properties))
  }).length
}

const FAKE = [
  { properties: { ADMIN: 'France', continent: 'Europe', ISO_A2: 'FR', capital: 'Paris' } },
  { properties: { ADMIN: 'Germany', continent: 'Europe', ISO_A2: 'DE', capital: 'Berlin' } },
  { properties: { ADMIN: 'Japan', continent: 'Asie', ISO_A2: 'JP', capital: 'Tokyo' } },
  { properties: { ADMIN: 'TestNoIso', continent: 'Europe', ISO_A2: null, capital: null } },
]

describe('countByContinent', () => {
  it('counts all countries in a continent', () => {
    expect(countByContinent(FAKE, 'Europe')).toBe(3)
  })

  it('counts only countries with ISO_A2 (flags)', () => {
    expect(countByContinent(FAKE, 'Europe', [p => !!p.ISO_A2])).toBe(2)
  })

  it('counts only countries with ISO_A2 and capital (capitals game)', () => {
    expect(countByContinent(FAKE, 'Europe', [p => !!p.ISO_A2, p => !!p.capital])).toBe(2)
  })

  it('returns 0 for unknown continent', () => {
    expect(countByContinent(FAKE, 'Antarctique')).toBe(0)
  })
})

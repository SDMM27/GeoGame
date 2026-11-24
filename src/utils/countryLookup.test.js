import { describe, it, expect } from 'vitest'
import { buildCountryLookup } from './countryLookup'
import { normalize } from './normalizeAnswer'

const saintMartin = {
  type: 'Feature',
  properties: { ADMIN: 'Saint-Martin', ISO_A2: 'MF', ISO_A3: 'MAF', aliases: [] },
  geometry: null,
}
const sintMaarten = {
  type: 'Feature',
  properties: {
    ADMIN: 'Sint Maarten',
    ISO_A2: 'SX',
    ISO_A3: 'SXM',
    aliases: ['Saint-Martin (partie néerlandaise)', 'Saint-Martin néerlandais', 'Saint-Martin'],
  },
  geometry: null,
}

describe('buildCountryLookup — priorité du nom canonique sur les alias', () => {
  // Même ordre que le vrai dataset : MF avant SX
  const lookup = buildCountryLookup([saintMartin, sintMaarten])

  it('« Saint-Martin » résout vers Saint-Martin (MF), pas vers Sint Maarten (SX)', () => {
    expect(lookup.get(normalize('Saint-Martin'))?.properties.ISO_A2).toBe('MF')
  })

  it('Sint Maarten reste joignable par son nom canonique et ses autres alias', () => {
    expect(lookup.get(normalize('Sint Maarten'))?.properties.ISO_A2).toBe('SX')
    expect(lookup.get(normalize('Saint-Martin (partie néerlandaise)'))?.properties.ISO_A2).toBe('SX')
    expect(lookup.get(normalize('Saint-Martin néerlandais'))?.properties.ISO_A2).toBe('SX')
  })

  it('les noms en anglais ne changent pas la priorité (St. Martin -> MF)', () => {
    expect(lookup.get(normalize('St. Martin'))?.properties.ISO_A2).toBe('MF')
  })
})

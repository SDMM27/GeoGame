// src/utils/multiplayerSeed.test.js
import { describe, it, expect } from 'vitest'
import {
  getSeededPlacementCountries,
  getSeededFlagCountries,
  getSeededCapitalCountries,
  getSeededBorderGuessCountries,
  getSeededCountryClueCountries,
  getSeededAscensionOverrides,
  getSeededCountriesForGame,
} from './multiplayerSeed'
import { GAME_TYPES } from './gameTypes'

describe('getSeededPlacementCountries', () => {
  it('returns same list for same seed+gameIndex', () => {
    const a = getSeededPlacementCountries('Moyen', 42, 0)
    const b = getSeededPlacementCountries('Moyen', 42, 0)
    expect(a).toEqual(b)
  })

  it('returns different list for different seed', () => {
    const a = getSeededPlacementCountries('Moyen', 42, 0)
    const b = getSeededPlacementCountries('Moyen', 99, 0)
    expect(a).not.toEqual(b)
  })

  it('returns different list for different gameIndex', () => {
    const a = getSeededPlacementCountries('Moyen', 42, 0)
    const b = getSeededPlacementCountries('Moyen', 42, 1)
    expect(a).not.toEqual(b)
  })

  it('returns strings (ADMIN names)', () => {
    const list = getSeededPlacementCountries('Facile', 1, 0)
    expect(list.length).toBeGreaterThan(0)
    expect(typeof list[0]).toBe('string')
  })
})

describe('getSeededFlagCountries', () => {
  it('returns feature objects with ISO_A2', () => {
    const list = getSeededFlagCountries('Facile', 1, 0)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]).toHaveProperty('properties')
    expect(list[0].properties.ISO_A2).toBeTruthy()
  })

  it('is deterministic', () => {
    expect(getSeededFlagCountries('Moyen', 7, 2)).toEqual(getSeededFlagCountries('Moyen', 7, 2))
  })
})

describe('getSeededBorderGuessCountries', () => {
  it('returns exactly countryCount features', () => {
    const list = getSeededBorderGuessCountries(10, 42, 0)
    expect(list).toHaveLength(10)
  })

  it('is deterministic', () => {
    expect(getSeededBorderGuessCountries(5, 1, 0)).toEqual(getSeededBorderGuessCountries(5, 1, 0))
  })
})

describe('getSeededCountryClueCountries', () => {
  it('returns exactly countryCount features', () => {
    expect(getSeededCountryClueCountries(3, 42, 0)).toHaveLength(3)
  })
})

describe('getSeededAscensionOverrides', () => {
  it('returns an object keyed by difficulty', () => {
    const phases = { Facile: 5, Moyen: 3 }
    const overrides = getSeededAscensionOverrides(phases, GAME_TYPES.PLACEMENT, 42, 0)
    expect(overrides).toHaveProperty('Facile')
    expect(overrides).toHaveProperty('Moyen')
    expect(overrides.Facile.length).toBeGreaterThanOrEqual(5)
  })

  it('is deterministic', () => {
    const phases = { Facile: 4 }
    expect(getSeededAscensionOverrides(phases, GAME_TYPES.FLAGS, 42, 0))
      .toEqual(getSeededAscensionOverrides(phases, GAME_TYPES.FLAGS, 42, 0))
  })
})

describe('getSeededCountriesForGame', () => {
  it('dispatches to correct function based on type', () => {
    const bgResult = getSeededCountriesForGame({ type: GAME_TYPES.BORDER_GUESS, countryCount: 5 }, 1, 0)
    expect(bgResult).toHaveLength(5)
    const plResult = getSeededCountriesForGame({ type: GAME_TYPES.PLACEMENT, mode: 'standard', difficulty: 'Facile' }, 1, 0)
    expect(plResult.length).toBeGreaterThan(0)
    expect(typeof plResult[0]).toBe('string')
  })
})

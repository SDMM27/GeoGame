import { describe, expect, it } from 'vitest'
import { getBorderGuessDailyCountry } from '../hooks/useBorderGuessState'
import { getCountryClueDailyCountry } from '../hooks/useCountryClueState'
import {
  COUNTRY_OF_DAY_COUNTRIES,
  COUNTRY_OF_DAY_MAX_SCORE,
  countryOfDayScore,
  countryOfDayShareLine,
  findCountryOfDay,
  getCountryOfDay,
  getStepChoices,
  stepPoints,
} from './countryOfDay'

const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10))

describe('getCountryOfDay', () => {
  it('is the same country for a day, with a flag and a capital', () => {
    const country = getCountryOfDay('2026-11-05')
    expect(getCountryOfDay('2026-11-05')).toBe(country)
    expect(country.properties.ISO_A2).toBeTruthy()
    expect(country.properties.capital).toBeTruthy()
  })

  it('is never the country of Border Guess or Country Clue that day', () => {
    for (const day of days) {
      const admin = getCountryOfDay(day).properties.ADMIN
      expect(admin).not.toBe(getBorderGuessDailyCountry(day).properties.ADMIN)
      expect(admin).not.toBe(getCountryClueDailyCountry(day).properties.ADMIN)
    }
  })

  it('changes from day to day', () => {
    expect(new Set(days.map((day) => getCountryOfDay(day).properties.ADMIN)).size).toBeGreaterThan(40)
  })
})

describe('getStepChoices', () => {
  const day = '2026-11-05'
  const country = getCountryOfDay(day)

  it.each([
    ['choice', 'borders', 4],
    ['choice', 'flag', 4],
    ['choice', 'capital', 4],
    ['free', 'flag', 8],
  ])('%s mode, %s step: %i different answers, the right one included', (mode, step, count) => {
    const choices = getStepChoices(country, step, mode, day)
    expect(choices).toHaveLength(count)
    expect(choices).toContain(country)
    expect(new Set(choices.map((c) => c.properties.ADMIN)).size).toBe(count)
    expect(getStepChoices(country, step, mode, day)).toEqual(choices)
  })

  it('offers nothing for typed or map steps', () => {
    expect(getStepChoices(country, 'borders', 'free', day)).toBeNull()
    expect(getStepChoices(country, 'capital', 'free', day)).toBeNull()
    expect(getStepChoices(country, 'placement', 'choice', day)).toBeNull()
  })

  it('offers look-alike flags first', () => {
    const chad = findCountryOfDay('Tchad')
    const isos = getStepChoices(chad, 'flag', 'choice', day).map((c) => c.properties.ISO_A2)
    expect(isos).toContain('RO')
  })

  it('offers countries of the same continent for the borders', () => {
    for (const d of days.slice(0, 20)) {
      const target = getCountryOfDay(d)
      const others = getStepChoices(target, 'borders', 'choice', d).filter((c) => c !== target)
      expect(others.every((c) => c.properties.continent === target.properties.continent)).toBe(true)
    }
  })

  it('always finds enough answers, whatever the country', () => {
    for (const target of COUNTRY_OF_DAY_COUNTRIES) {
      expect(getStepChoices(target, 'flag', 'free', day)).toHaveLength(8)
      expect(getStepChoices(target, 'capital', 'choice', day)).toHaveLength(4)
    }
  })
})

describe('score', () => {
  it('gives 100/60/30 per step, 1.5 times that in typed mode', () => {
    expect([0, 1, 2, 3].map((tries) => stepPoints(tries, 'choice'))).toEqual([0, 100, 60, 30])
    expect([0, 1, 2, 3].map((tries) => stepPoints(tries, 'free'))).toEqual([0, 150, 90, 45])
    expect(countryOfDayScore([2, 1, 1, 0], 'free')).toBe(390)
    expect(COUNTRY_OF_DAY_MAX_SCORE).toEqual({ choice: 400, free: 600 })
  })

  it('shares the tries of each step', () => {
    expect(countryOfDayShareLine([2, 1, 3, 0])).toBe('🧭 2/3 · 🏳️ 1/3 · 🏛️ 3/3 · 📍 ❌')
  })
})

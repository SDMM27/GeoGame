import { describe, expect, it } from 'vitest'
import {
  ELO_START,
  duelResult,
  errorFactor,
  expectedScore,
  ratingOf,
  ratingsForSeason,
  seasonKeyAt,
  seasonReset,
  soloResult,
} from './eloRating'

describe('expectedScore', () => {
  it('is even between equal ratings and favors the higher one', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5)
    expect(expectedScore(1400, 1000)).toBeCloseTo(0.909, 3)
  })
})

describe('errorFactor', () => {
  it('keeps the whole gain on the first try, then 20 % less per error, never under 20 %', () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(errorFactor)).toEqual([1, 0.8, 0.6, 0.4, 0.2, 0.2, 0.2])
  })
})

describe('soloResult', () => {
  const base = { rating: 1000, question: 1000, alreadyWon: false, rateQuestion: true }

  it('gains half of K against an equal question on the first try, and the question drops', () => {
    expect(soloResult({ ...base, found: true, errors: 0 })).toEqual({ gain: 16, question: 992 })
  })

  it('gains less with errors, down to the floor', () => {
    expect(soloResult({ ...base, found: true, errors: 1 }).gain).toBe(12.8)
    expect(soloResult({ ...base, found: true, errors: 9 }).gain).toBe(3.2)
  })

  it('never loses: nothing when not found, and the question gets harder', () => {
    expect(soloResult({ ...base, found: false, errors: 3 })).toEqual({ gain: 0, question: 1008 })
  })

  it('pays a country once per season, and rates the question once per player', () => {
    expect(soloResult({ ...base, found: true, errors: 0, alreadyWon: true, rateQuestion: false })).toEqual({ gain: 0, question: 1000 })
  })

  it('gains little on a question far below the player', () => {
    expect(soloResult({ ...base, rating: 1800, question: 800, found: true, errors: 0 }).gain).toBeLessThan(1)
  })
})

describe('duelResult', () => {
  it('moves both ratings by the same amount', () => {
    expect(duelResult(1000, 1000, 1)).toEqual({ a: 1016, b: 984 })
    expect(duelResult(1000, 1000, 0.5)).toEqual({ a: 1000, b: 1000 })
    expect(duelResult(1200, 1000, 0).a).toBeCloseTo(1175.7, 1)
  })
})

describe('seasons', () => {
  it('are calendar quarters in Paris time', () => {
    expect(seasonKeyAt(new Date('2026-10-18T12:00:00Z'))).toBe('2026-Q4')
    // 31 March 23:30 UTC is already 1 April in Paris.
    expect(seasonKeyAt(new Date('2027-03-31T23:30:00Z'))).toBe('2027-Q2')
    expect(seasonKeyAt(new Date('2026-12-31T22:59:00Z'))).toBe('2026-Q4')
  })

  it('pull ratings halfway back to the start', () => {
    expect(seasonReset(1400)).toBe(1200)
    expect(seasonReset(800)).toBe(900)
  })

  it('carry a document into a new season', () => {
    const doc = {
      season: '2026-Q3',
      duel: { rating: 1200, games: 12, wins: 8 },
      solo: { FLAGS: { rating: 1300, found: 50 } },
      carry: { CAPITALS: 1400 },
    }
    const next = ratingsForSeason(doc, '2026-Q4')
    expect(next).toEqual({ duel: null, solo: {}, carry: { duel: 1100, FLAGS: 1150, CAPITALS: 1200 } })
    expect(ratingOf(next, 'duel')).toBe(1100)
    expect(ratingOf(next, 'PLACEMENT')).toBe(ELO_START)
    const same = ratingsForSeason(doc, '2026-Q3')
    expect(ratingOf(same, 'FLAGS')).toBe(1300)
    expect(ratingOf(same, 'CAPITALS')).toBe(1400)
    expect(ratingOf(ratingsForSeason(null, '2026-Q4'), 'duel')).toBe(ELO_START)
  })
})

import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from './gameTypes'
import {
  ALL_SURVIVAL_ROUND_TYPES,
  SURVIVAL_MAX_ROUNDS,
  SURVIVAL_ROUND_TYPES,
  buildSurvivalRounds,
  checkCapitalName,
  checkCountryName,
  livesLeft,
  normalizeSurvivalModes,
  parseSurvivalModes,
  survivalDifficulty,
  SURVIVAL_RAMPS,
  matchSurvivalRamp,
  normalizeSurvivalRamp,
  survivalModesKey,
} from './survival'
import { sortSurvivalScores } from './leaderboards'

const { PLACEMENT, FLAGS, CAPITALS, BORDER_GUESS, COUNTRY_CLUE, QUIZ } = GAME_TYPES
const ALL = [PLACEMENT, FLAGS, CAPITALS, BORDER_GUESS]
const TIERS = ['Facile', 'Moyen', 'Difficile', 'Impossible']

const roundKey = (round) => `${round.type}:${round.country?.properties.ADMIN ?? round.question.usedKeys.join(',')}`

describe('survivalModesKey', () => {
  it('keeps the setup order and drops unknown or repeated games', () => {
    expect(survivalModesKey([CAPITALS, FLAGS, 'NOPE', FLAGS])).toBe('FLAGS+CAPITALS')
    expect(parseSurvivalModes('CAPITALS+FLAGS+NOPE')).toEqual([FLAGS, CAPITALS])
    expect(parseSurvivalModes(null)).toEqual([])
  })

  it('hides the Geo Quiz from the choices but keeps it in the full list', () => {
    expect(SURVIVAL_ROUND_TYPES).toEqual(ALL)
    expect(ALL_SURVIVAL_ROUND_TYPES).toEqual([...ALL, QUIZ])
    // The "all games" key no longer holds the quiz
    expect(survivalModesKey(SURVIVAL_ROUND_TYPES)).toBe('PLACEMENT+FLAGS+CAPITALS+BORDER_GUESS')
    expect(survivalModesKey([FLAGS, QUIZ])).toBe('FLAGS')
  })

  it('falls back to every available game when only hidden games are left', () => {
    expect(normalizeSurvivalModes([QUIZ])).toEqual(SURVIVAL_ROUND_TYPES)
    expect(parseSurvivalModes('QUIZ')).toEqual(SURVIVAL_ROUND_TYPES)
    // Nothing chosen, or unknown games only: still nothing
    expect(normalizeSurvivalModes([])).toEqual([])
    expect(normalizeSurvivalModes(['NOPE'])).toEqual([])
  })

  it('has no Country Clue rounds', () => {
    expect(survivalModesKey([FLAGS, COUNTRY_CLUE])).toBe('FLAGS')
    expect(buildSurvivalRounds([COUNTRY_CLUE], 1)).toEqual([])
  })
})

describe('buildSurvivalRounds', () => {
  it('gives every player the same rounds for a seed', () => {
    const a = buildSurvivalRounds(ALL, 42, 60).map(roundKey)
    const b = buildSurvivalRounds(ALL, 42, 60).map(roundKey)
    expect(a).toEqual(b)
    expect(buildSurvivalRounds(ALL, 43, 60).map(roundKey)).not.toEqual(a)
  })

  it('plays every chosen game once per cycle', () => {
    const rounds = buildSurvivalRounds([FLAGS, BORDER_GUESS, CAPITALS], 7, 30)
    for (let cycle = 0; cycle < 10; cycle++) {
      const types = rounds.slice(cycle * 3, cycle * 3 + 3).map((round) => round.type).sort()
      expect(types).toEqual([BORDER_GUESS, CAPITALS, FLAGS])
    }
  })

  it('never plays the same game twice in a row', () => {
    const rounds = buildSurvivalRounds([FLAGS, CAPITALS, PLACEMENT], 12, 90)
    rounds.slice(1).forEach((round, index) => expect(round.type).not.toBe(rounds[index].type))
  })

  it('gets harder with the round number as the ramp says, whatever the game', () => {
    const gentle = SURVIVAL_RAMPS.gentle
    expect([0, 9, 10, 24, 25, 44, 45, 200].map((index) => survivalDifficulty(index, gentle)))
      .toEqual(['Facile', 'Facile', 'Moyen', 'Moyen', 'Difficile', 'Difficile', 'Impossible', 'Impossible'])
    expect([0, 2, 3, 6, 7, 11, 12].map((index) => survivalDifficulty(index, SURVIVAL_RAMPS.express)))
      .toEqual(['Facile', 'Facile', 'Moyen', 'Moyen', 'Difficile', 'Difficile', 'Impossible'])
    expect([0, 14, 15, 99].map((index) => survivalDifficulty(index, SURVIVAL_RAMPS.expert)))
      .toEqual(['Difficile', 'Difficile', 'Impossible', 'Impossible'])
    expect(survivalDifficulty(0, SURVIVAL_RAMPS.hardcore)).toBe('Impossible')
    // A custom ramp may skip a difficulty
    expect([0, 1, 2, 3].map((index) => survivalDifficulty(index, { Facile: 2, Moyen: 0, Difficile: 1 })))
      .toEqual(['Facile', 'Facile', 'Difficile', 'Impossible'])
    const rounds = buildSurvivalRounds(ALL, 8, 70, gentle)
    rounds.forEach((round, index) => {
      const expected = TIERS.indexOf(survivalDifficulty(index, gentle))
      // A game without a new country (or question) at that difficulty asks an easier one: Border Guess has only a
      // few Impossible countries left once the tiny ones are removed
      expect(TIERS.indexOf(round.difficulty)).toBeLessThanOrEqual(expected)
      if (round.type !== BORDER_GUESS) expect(round.difficulty).toBe(survivalDifficulty(index, gentle))
    })
  })

  it('knows the presets and keeps custom ramps within bounds', () => {
    expect(matchSurvivalRamp({ Facile: 3, Moyen: 4, Difficile: 5 })).toBe('express')
    expect(matchSurvivalRamp({ Facile: 3, Moyen: 4, Difficile: 6 })).toBe(null)
    expect(normalizeSurvivalRamp(null)).toEqual(SURVIVAL_RAMPS.normal)
    expect(normalizeSurvivalRamp({ Facile: -3, Moyen: 2.6, Difficile: 999, Impossible: 4 })).toEqual({ Facile: 0, Moyen: 3, Difficile: 50 })
  })

  it('tags each country round with the difficulty of its country in that game', () => {
    const field = { PLACEMENT: 'Difficulty', FLAGS: 'DifficultyFlag', CAPITALS: 'DifficultyCapitals' }
    for (const round of buildSurvivalRounds([PLACEMENT, FLAGS, CAPITALS], 4, 60)) {
      expect(round.country.properties[field[round.type]]).toBe(round.difficulty)
    }
  })

  it('never asks the same country twice in a game, and plays the others once a difficulty runs out', () => {
    const rounds = buildSurvivalRounds([FLAGS], 3, undefined, SURVIVAL_RAMPS.gentle)
    const names = rounds.map((round) => round.country.properties.ADMIN)
    expect(new Set(names).size).toBe(names.length)
    expect(rounds.slice(0, 10).every((round) => round.difficulty === 'Facile')).toBe(true)
    expect(rounds.slice(45, 60).every((round) => round.difficulty === 'Impossible')).toBe(true)
  })

  it('ends when a single game runs out of countries, and never exceeds the cap', () => {
    const flags = buildSurvivalRounds([FLAGS], 3)
    expect(flags.length).toBeGreaterThan(100)
    expect(flags.length).toBeLessThan(SURVIVAL_MAX_ROUNDS)
    expect(buildSurvivalRounds(ALL, 3)).toHaveLength(SURVIVAL_MAX_ROUNDS)
  })

  it('only offers capitals of countries that have one', () => {
    for (const round of buildSurvivalRounds([CAPITALS], 9, 50)) expect(round.country.properties.capital).toBeTruthy()
  })

  it('plays no quiz rounds while the Geo Quiz is hidden', () => {
    const rounds = buildSurvivalRounds([QUIZ, FLAGS], 11, 12)
    expect(rounds).toHaveLength(12)
    expect(rounds.every((round) => round.type === FLAGS)).toBe(true)
    // A quiz-only link plays the available games instead
    expect(buildSurvivalRounds([QUIZ], 11, 12).every((round) => round.type !== QUIZ)).toBe(true)
  })

  it('has no rounds without a game', () => {
    expect(buildSurvivalRounds([], 1)).toEqual([])
  })

  it('can skip, in every game, a country already used by an earlier round (distinctCountries)', () => {
    const rounds = buildSurvivalRounds([PLACEMENT, FLAGS, CAPITALS], 21, 60, null, { distinctCountries: true })
    const names = rounds.map((round) => round.country.properties.ADMIN)
    expect(rounds).toHaveLength(60)
    expect(new Set(names).size).toBe(60)
    // Same rounds as before without the option: a country may come back in another game
    const free = buildSurvivalRounds([PLACEMENT, FLAGS, CAPITALS], 21, 60).map((round) => round.country.properties.ADMIN)
    expect(new Set(free).size).toBeLessThan(60)
  })

  it('keeps the same rounds for a seed with or without distinctCountries when a single game is played', () => {
    const key = (list) => list.map(roundKey)
    expect(key(buildSurvivalRounds([FLAGS], 6, 40, null, { distinctCountries: true }))).toEqual(key(buildSurvivalRounds([FLAGS], 6, 40)))
  })
})

describe('typed answers', () => {
  const [{ country }] = buildSurvivalRounds([CAPITALS], 5, 1)

  it('accepts the country name in any language, and the capital', () => {
    expect(checkCountryName(country, country.properties.ADMIN)).toBe(true)
    expect(checkCountryName(country, 'zzzz')).toBe(false)
    expect(checkCountryName(country, '  ')).toBe(false)
    expect(checkCapitalName(country, country.properties.capital)).toBe(true)
    expect(checkCapitalName(country, country.properties.ADMIN === 'France' ? 'Lyon' : 'Paris')).toBe(false)
  })
})

describe('livesLeft / sortSurvivalScores', () => {
  it('counts down to zero', () => {
    expect(livesLeft(3, 1)).toBe(2)
    expect(livesLeft(3, 5)).toBe(0)
  })

  it('ranks the most rounds first, then the fastest', () => {
    const sorted = sortSurvivalScores([
      { name: 'a', score: 5, elapsedTime: 9000 },
      { name: 'b', score: 8, elapsedTime: 20000 },
      { name: 'c', score: 5, elapsedTime: 4000 },
    ])
    expect(sorted.map((s) => s.name)).toEqual(['b', 'c', 'a'])
  })
})

import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from './gameTypes'
import {
  SURVIVAL_MAX_ROUNDS,
  buildSurvivalRounds,
  checkCapitalName,
  checkCountryName,
  livesLeft,
  parseSurvivalModes,
  survivalModesKey,
} from './survival'
import { sortSurvivalScores } from './leaderboards'

const { PLACEMENT, FLAGS, CAPITALS, BORDER_GUESS, COUNTRY_CLUE, QUIZ } = GAME_TYPES
const ALL = [PLACEMENT, FLAGS, CAPITALS, BORDER_GUESS, COUNTRY_CLUE, QUIZ]
const TIERS = ['Facile', 'Moyen', 'Difficile', 'Impossible']

const roundKey = (round) => `${round.type}:${round.country?.properties.ADMIN ?? round.question.usedKeys.join(',')}`

describe('survivalModesKey', () => {
  it('keeps the setup order and drops unknown or repeated games', () => {
    expect(survivalModesKey([QUIZ, FLAGS, 'NOPE', FLAGS])).toBe('FLAGS+QUIZ')
    expect(parseSurvivalModes('QUIZ+FLAGS+NOPE')).toEqual([FLAGS, QUIZ])
    expect(parseSurvivalModes(null)).toEqual([])
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
    const rounds = buildSurvivalRounds([FLAGS, BORDER_GUESS, QUIZ], 7, 30)
    for (let cycle = 0; cycle < 10; cycle++) {
      const types = rounds.slice(cycle * 3, cycle * 3 + 3).map((round) => round.type).sort()
      expect(types).toEqual([BORDER_GUESS, FLAGS, QUIZ])
    }
  })

  it('never plays the same game twice in a row', () => {
    const rounds = buildSurvivalRounds([FLAGS, CAPITALS, QUIZ], 12, 90)
    rounds.slice(1).forEach((round, index) => expect(round.type).not.toBe(rounds[index].type))
  })

  it('never asks the same country twice in a game and starts with the easy ones', () => {
    const rounds = buildSurvivalRounds([FLAGS], 3)
    const names = rounds.map((round) => round.country.properties.ADMIN)
    expect(new Set(names).size).toBe(names.length)
    const tiers = rounds.map((round) => TIERS.indexOf(round.country.properties.DifficultyFlag))
    expect(tiers).toEqual([...tiers].sort((x, y) => x - y))
    expect(tiers[0]).toBe(0)
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

  it('asks multiple-choice quiz questions', () => {
    const quiz = buildSurvivalRounds([QUIZ], 11, 12)
    expect(quiz).toHaveLength(12)
    for (const round of quiz) {
      expect(round.question.choices.length).toBeGreaterThan(1)
      expect(round.question.choices.some((choice) => choice.id === round.question.correctId)).toBe(true)
    }
  })

  it('has no rounds without a game', () => {
    expect(buildSurvivalRounds([], 1)).toEqual([])
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

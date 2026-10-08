// getRoomContent runs the website's seeded draws on the app's own country bundle (assets/data/countries.json,
// built by scripts/build-countries.mjs): these tests catch a bundle that no longer feeds the shared code.
import { GAME_TYPES } from '@shared/utils/gameTypes'

import { getRoomContent, rankRoomResults, scoringMode } from './content'
import type { PlayerResult, RoomGame } from './room'

jest.mock('@shared/Firebase', () => ({ firestore: {} }))
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), serverTimestamp: jest.fn(), writeBatch: jest.fn(), Timestamp: { fromMillis: jest.fn() } }))

const SEED = 20261008

const game = (id: RoomGame['id'], type: string, extra: Partial<RoomGame> = {}): RoomGame => ({ id, type, ...extra })
const names = (list: any[]) => list.map((country) => country.properties?.ADMIN ?? country)

describe('getRoomContent', () => {
  it('draws the same countries, in the same order, for the same seed', () => {
    const flags = game('flags', GAME_TYPES.FLAGS, { difficulty: 'Moyen' })
    const a = getRoomContent(flags, SEED)
    const b = getRoomContent(flags, SEED)
    expect(a.list?.length).toBeGreaterThan(0)
    expect(names(a.list!)).toEqual(names(b.list!))
    expect(a.total).toBe(a.list!.length)
    expect(a.byDifficulty).toBeNull()
  })

  it('draws a different order for another seed', () => {
    const placement = game('placement', GAME_TYPES.PLACEMENT, { difficulty: 'Facile' })
    expect(names(getRoomContent(placement, 1).list!)).not.toEqual(names(getRoomContent(placement, 2).list!))
  })

  it('draws each country of the flag difficulty once, with a flag code for Flags', () => {
    const { list } = getRoomContent(game('flags', GAME_TYPES.FLAGS, { difficulty: 'Facile' }), SEED)
    const found = names(list!)
    expect(new Set(found).size).toBe(found.length)
    expect(list!.every((country) => country.properties.DifficultyFlag === 'Facile' && country.properties.ISO_A2)).toBe(true)
  })

  it('keeps a continent game on that continent, and Capitals on countries with a capital', () => {
    const { list } = getRoomContent(game('capitals', GAME_TYPES.CAPITALS, { continent: 'Europe' }), SEED)
    expect(list!.length).toBeGreaterThan(30)
    expect(list!.every((c) => c.properties.continent === 'Europe' && c.properties.capital)).toBe(true)
  })

  it('splits an Ascension game per difficulty and counts every phase', () => {
    const ascension = game('placement', GAME_TYPES.PLACEMENT, { phases: { Facile: 3, Moyen: 2 } })
    const content = getRoomContent(ascension, SEED)
    expect(content.list).toBeNull()
    expect(Object.keys(content.byDifficulty!).sort()).toEqual(['Facile', 'Moyen'])
    expect(content.byDifficulty!.Facile).toHaveLength(3)
    expect(content.byDifficulty!.Moyen).toHaveLength(2)
    expect(content.total).toBe(5)
  })

  it('draws `count` countries for Border Guess and Country Clue (10 by default)', () => {
    const border = getRoomContent(game('border_guess', GAME_TYPES.BORDER_GUESS, { count: 5 }), SEED)
    expect(border.list).toHaveLength(5)
    expect(border.total).toBe(5)
    expect(getRoomContent(game('country_clue', GAME_TYPES.COUNTRY_CLUE), SEED).list).toHaveLength(10)
  })

  it('leaves the Quiz questions to the game: no list, only the number of questions', () => {
    expect(getRoomContent(game('quiz', GAME_TYPES.QUIZ, { count: 12 }), SEED)).toEqual({ list: null, byDifficulty: null, total: 12 })
    expect(getRoomContent(game('quiz', GAME_TYPES.QUIZ), SEED).total).toBe(10)
  })
})

describe('scoringMode', () => {
  it('ranks Border Guess and Country Clue on countries found, the others on score', () => {
    expect(scoringMode(game('border_guess', GAME_TYPES.BORDER_GUESS))).toBe('solved')
    expect(scoringMode(game('country_clue', GAME_TYPES.COUNTRY_CLUE))).toBe('solved')
    for (const [id, type] of [['placement', GAME_TYPES.PLACEMENT], ['flags', GAME_TYPES.FLAGS], ['capitals', GAME_TYPES.CAPITALS], ['quiz', GAME_TYPES.QUIZ]] as const) {
      expect(scoringMode(game(id, type))).toBe('weighted')
    }
  })
})

describe('rankRoomResults', () => {
  const result = (playerId: string, extra: Partial<PlayerResult>): PlayerResult => ({
    playerId,
    pseudo: playerId,
    weightedScore: 0,
    countriesSolved: 0,
    attempts: 0,
    elapsedTime: 0,
    total: 10,
    ...extra,
  })

  it('ranks a weighted game on score, then on the shorter time', () => {
    const ranked = rankRoomResults(game('flags', GAME_TYPES.FLAGS), [
      result('slow', { weightedScore: 80, elapsedTime: 90 }),
      result('best', { weightedScore: 95, elapsedTime: 120 }),
      result('fast', { weightedScore: 80, elapsedTime: 60 }),
    ])
    expect(ranked.map((r) => [r.playerId, r.rank])).toEqual([['best', 1], ['fast', 2], ['slow', 3]])
  })

  it('ranks a "solved" game on countries found, then fewer attempts, then time', () => {
    const ranked = rankRoomResults(game('border_guess', GAME_TYPES.BORDER_GUESS), [
      result('b', { countriesSolved: 8, attempts: 14, elapsedTime: 50 }),
      result('a', { countriesSolved: 8, attempts: 12, elapsedTime: 99 }),
      result('c', { countriesSolved: 9, attempts: 30, elapsedTime: 200 }),
    ])
    expect(ranked.map((r) => r.playerId)).toEqual(['c', 'a', 'b'])
  })

  it('returns nothing for an empty room', () => {
    expect(rankRoomResults(game('flags', GAME_TYPES.FLAGS), [])).toEqual([])
  })
})

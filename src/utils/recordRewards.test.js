import { describe, it, expect } from 'vitest'
import { PERFECT_SCORES } from './perfectScores'
import { PERFECT_XP, PERFECT_FRAGMENTS, RECORD_XP, RECORDS_PER_DAY,bestScoresOf, grantRecords, readRecords, rewardText, splitKey, tierOf } from './recordRewards'

const DAY = '2026-10-19'
const seededState = (best = {}, extra = {}) => readRecords({ records: { best, perfect: [], day: DAY, dayPaid: [], ...extra } }, DAY)
const PERFECT = PERFECT_SCORES.PLACEMENT_Facile

describe('keys', () => {
  it('splits MISSING_FLAG on the game, not the first underscore', () => {
    expect(splitKey('MISSING_FLAG_Europe')).toEqual({ game: 'MISSING_FLAG', mode: 'Europe' })
    expect(splitKey('PLACEMENT_Facile')).toEqual({ game: 'PLACEMENT', mode: 'Facile' })
    expect(tierOf('MISSING_FLAG_Hardcore')).toBe('Hardcore')
    expect(tierOf('FLAGS_Europe')).toBe('continent')
  })
})

describe('bestScoresOf', () => {
  it('keeps the best numeric score of the known cells', () => {
    expect(
      bestScoresOf([
        { gameType: 'PLACEMENT', difficulty: 'Facile', score: 10 },
        { gameType: 'PLACEMENT', difficulty: 'Facile', score: 30 },
        { gameType: 'PLACEMENT', difficulty: 'Facile', score: '99' },
        { gameType: 'QUIZ', difficulty: 'Facile', score: 5 },
        { gameType: 'PLACEMENT', difficulty: 'Nowhere', score: 5 },
      ])
    ).toEqual({ PLACEMENT_Facile: 30 })
  })
})

describe('readRecords', () => {
  it('is not seeded without the field, and resets the paid cells on a new day', () => {
    expect(readRecords({}, DAY)).toMatchObject({ seeded: false, best: {}, perfect: [], dayPaid: [] })
    const state = readRecords({ records: { best: { A: 1 }, perfect: ['A'], day: '2026-10-18', dayPaid: ['A'] } }, DAY)
    expect(state).toMatchObject({ seeded: true, best: { A: 1 }, perfect: ['A'], day: DAY, dayPaid: [] })
  })
})

describe('grantRecords', () => {
  it('seeds the bests and pays the perfect cells only, once', () => {
    const grant = grantRecords(readRecords({}, DAY), { PLACEMENT_Facile: PERFECT, PLACEMENT_Moyen: 10 }, DAY)
    expect(grant.rewards).toHaveLength(1)
    expect(grant.rewards[0]).toMatchObject({ kind: 'perfect', key: 'PLACEMENT_Facile', previous: null, xp: PERFECT_XP.Facile, fragments: PERFECT_FRAGMENTS.Facile })
    expect(grant.gained).toBe(PERFECT_XP.Facile)
    expect(grant.changed).toBe(true)
    expect(grant.state.best).toEqual({ PLACEMENT_Facile: PERFECT, PLACEMENT_Moyen: 10 })
    const again = grantRecords(readRecords({ records: grant.state }, DAY), { PLACEMENT_Facile: PERFECT, PLACEMENT_Moyen: 10 }, DAY)
    expect(again).toMatchObject({ gained: 0, fragments: 0, rewards: [], changed: false })
  })

  it('pays nothing for the first score of a cell, but remembers it', () => {
    const grant = grantRecords(seededState(), { PLACEMENT_Moyen: 10 }, DAY)
    expect(grant).toMatchObject({ gained: 0, rewards: [], changed: true })
    expect(grant.state.best.PLACEMENT_Moyen).toBe(10)
  })

  it('pays a record once a cell a day, and again the next day', () => {
    const first = grantRecords(seededState({ PLACEMENT_Moyen: 10 }), { PLACEMENT_Moyen: 20 }, DAY)
    expect(first.rewards).toEqual([
      { kind: 'record', key: 'PLACEMENT_Moyen', game: 'PLACEMENT', mode: 'Moyen', score: 20, previous: 10, xp: RECORD_XP.Moyen, fragments: 0 },
    ])
    expect(first.state.dayPaid).toEqual(['PLACEMENT_Moyen'])
    const second = grantRecords(readRecords({ records: first.state }, DAY), { PLACEMENT_Moyen: 25 }, DAY)
    expect(second.rewards).toEqual([])
    expect(second.state.best.PLACEMENT_Moyen).toBe(25)
    expect(second.changed).toBe(true)
    const nextDay = grantRecords(readRecords({ records: second.state }, '2026-10-20'), { PLACEMENT_Moyen: 26 }, '2026-10-20')
    expect(nextDay.gained).toBe(RECORD_XP.Moyen)
  })

  it('pays at most RECORDS_PER_DAY records a day, all cells together', () => {
    const keys = ['PLACEMENT_Moyen', 'FLAGS_Moyen', 'CAPITALS_Moyen', 'HARDCORE_Moyen', 'MISSING_FLAG_Moyen']
    const before = Object.fromEntries(keys.map((key) => [key, 10]))
    const after = Object.fromEntries(keys.map((key) => [key, 20]))
    const grant = grantRecords(seededState(before), after, DAY)
    expect(grant.rewards).toHaveLength(RECORDS_PER_DAY)
    expect(grant.state.best).toEqual(after)
  })

  it('pays the perfect score once ever, and not together with a record', () => {
    const grant = grantRecords(seededState({ PLACEMENT_Facile: 10 }), { PLACEMENT_Facile: PERFECT }, DAY)
    expect(grant.rewards.map((reward) => reward.kind)).toEqual(['perfect'])
    expect(grant.state.perfect).toEqual(['PLACEMENT_Facile'])
    expect(grant.state.dayPaid).toEqual([])
    const again = grantRecords(readRecords({ records: grant.state }, DAY), { PLACEMENT_Facile: PERFECT + 1 }, DAY)
    // A perfect cell pays nothing more, even beaten (scoring change or forged score)
    expect(again.rewards).toEqual([])
    expect(again.state.best.PLACEMENT_Facile).toBe(PERFECT + 1)
  })

  it('splits a MISSING_FLAG key', () => {
    const key = 'MISSING_FLAG_Europe'
    const grant = grantRecords(seededState({ [key]: 1 }), { [key]: PERFECT_SCORES[key] }, DAY)
    expect(grant.rewards[0]).toMatchObject({ kind: 'perfect', game: 'MISSING_FLAG', mode: 'Europe', xp: PERFECT_XP.continent, fragments: PERFECT_FRAGMENTS.continent })
  })
})

describe('rewardText', () => {
  it('translates the game and the mode', () => {
    const t = (key, params) => `${key}${params ? JSON.stringify(params) : ''}`
    expect(rewardText(t, { kind: 'record', game: 'MISSING_FLAG', mode: 'Europe', xp: 25, fragments: 0 })).toBe(
      'records.reward_record{"game":"games.missing_flag.title","mode":"continents.Europe","xp":25}'
    )
    expect(rewardText(t, { kind: 'perfect', game: 'FLAGS', mode: 'Facile', xp: 75, fragments: 1 })).toContain('"mode":"difficulties.Facile","xp":75,"count":1')
  })
})

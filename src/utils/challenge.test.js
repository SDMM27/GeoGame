import { describe, it, expect } from 'vitest'
import { buildChallengeUrl, compareToChallenge, parseChallenge, resolveMode } from './challenge'

describe('buildChallengeUrl / parseChallenge', () => {
  it('round-trips a challenge through the URL', () => {
    const url = buildChallengeUrl({
      route: '/border-guess', pseudo: ' Sacha & co ', score: 4, dailyKey: '2026-10-05', solved: true, origin: 'https://geo.test',
    })
    expect(url.startsWith('https://geo.test/border-guess?mode=daily&')).toBe(true)
    expect(parseChallenge(new URL(url).search)).toEqual({
      challenger: 'Sacha & co', score: 4, day: '2026-10-05', solved: true, mapAssist: false,
    })
  })

  it('omits an empty pseudo and keeps unsolved state', () => {
    const url = buildChallengeUrl({ route: '/country-clue', pseudo: '', score: 8, dailyKey: '2026-10-05', solved: false, origin: '' })
    const parsed = parseChallenge(url.split('?')[1])
    expect(parsed.challenger).toBeNull()
    expect(parsed.solved).toBe(false)
  })

  it('carries the map assist flag only when it is used', () => {
    const withMap = buildChallengeUrl({ route: '/border-guess', score: 4, dailyKey: '2026-10-05', solved: true, mapAssist: true, origin: '' })
    expect(withMap).toContain('map=1')
    expect(parseChallenge(withMap.split('?')[1]).mapAssist).toBe(true)
    const without = buildChallengeUrl({ route: '/border-guess', score: 4, dailyKey: '2026-10-05', solved: true, mapAssist: false, origin: '' })
    expect(without).not.toContain('map=')
    expect(parseChallenge(without.split('?')[1]).mapAssist).toBe(false)
  })

  it('rounds decimal scores to one digit', () => {
    const url = buildChallengeUrl({ route: '/voyage-voyage', score: 7.25, origin: '' })
    expect(parseChallenge(url.split('?')[1]).score).toBe(7.3)
  })

  it('rejects missing or invalid scores and bad days', () => {
    expect(parseChallenge('?mode=daily')).toBeNull()
    expect(parseChallenge('?score=abc')).toBeNull()
    expect(parseChallenge('?score=-1')).toBeNull()
    expect(parseChallenge('?score=3&day=yesterday').day).toBeNull()
  })
})

describe('resolveMode', () => {
  it('prefers navigation state', () => {
    expect(resolveMode({ state: { mode: 'infinite' }, search: '?score=3' }, 'daily')).toBe('infinite')
  })
  it('forces daily for challenge links', () => {
    expect(resolveMode({ state: null, search: '?score=3' }, 'infinite')).toBe('daily')
  })
  it('reads ?mode= and falls back otherwise', () => {
    expect(resolveMode({ search: '?mode=daily' }, 'infinite')).toBe('daily')
    expect(resolveMode({ search: '?mode=weird' }, 'infinite')).toBe('infinite')
  })
})

describe('compareToChallenge', () => {
  it('attempt games: solving without the map beats solving with it, whatever the attempts', () => {
    expect(compareToChallenge('BORDER_GUESS', { score: 10, solved: true }, { score: 3, solved: true, mapAssist: true })).toBe('win')
    expect(compareToChallenge('COUNTRY_CLUE', { score: 3, solved: true, mapAssist: true }, { score: 10, solved: true })).toBe('lose')
    expect(compareToChallenge('BORDER_GUESS', { score: 3, solved: true, mapAssist: true }, { score: 5, solved: true, mapAssist: true })).toBe('win')
    expect(compareToChallenge('BORDER_GUESS', { score: 4, solved: true, mapAssist: true }, { score: 4, solved: false })).toBe('win')
  })

  it('attempt games: fewer attempts wins, solving beats not solving', () => {
    expect(compareToChallenge('BORDER_GUESS', { score: 3, solved: true }, { score: 5, solved: true })).toBe('win')
    expect(compareToChallenge('BORDER_GUESS', { score: 5, solved: true }, { score: 3, solved: true })).toBe('lose')
    expect(compareToChallenge('COUNTRY_CLUE', { score: 9, solved: true }, { score: 2, solved: false })).toBe('win')
    expect(compareToChallenge('COUNTRY_CLUE', { score: 2, solved: false }, { score: 9, solved: true })).toBe('lose')
    expect(compareToChallenge('COUNTRY_CLUE', { score: 6, solved: false }, { score: 4, solved: false })).toBe('tie')
    // Quiz du jour : essais + indices, le plus petit total gagne
    expect(compareToChallenge('QUIZ', { score: 2, solved: true }, { score: 4, solved: true })).toBe('win')
  })

  it('the Daily Challenge: more right answers wins, a 0 is a score like another', () => {
    expect(compareToChallenge('DAILY_CHALLENGE', { score: 9, solved: true }, { score: 7, solved: true })).toBe('win')
    expect(compareToChallenge('DAILY_CHALLENGE', { score: 0, solved: true }, { score: 4, solved: true })).toBe('lose')
    expect(compareToChallenge('DAILY_CHALLENGE', { score: 6, solved: true }, { score: 6, solved: true })).toBe('tie')
  })

  it('point games: higher score wins', () => {
    expect(compareToChallenge('RANKING', { score: 80 }, { score: 60 })).toBe('win')
    expect(compareToChallenge('VOYAGE_VOYAGE', { score: 6.5 }, { score: 7 })).toBe('lose')
    expect(compareToChallenge('VOYAGE_VOYAGE', { score: 7.04 }, { score: 7 })).toBe('tie')
  })
})

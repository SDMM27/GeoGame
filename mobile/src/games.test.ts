import i18n from '@shared/i18n'
import { LANGUAGE_CODES } from '@shared/i18n/languages'

import { DIFFICULTIES, DIFFICULTY_COLORS, GAMES, MULTI_GAMES, getGame, getGameByType } from './games'
import './i18n'
import { gameColors } from './theme'

describe('GAMES', () => {
  it('has unique ids and shared game types', () => {
    for (const key of ['id', 'type'] as const) {
      const values = GAMES.map((game) => game[key])
      expect(new Set(values).size).toBe(values.length)
    }
    // Hardcore reuses Placement's screen and distinguishes itself with route parameters.
    expect(GAMES.filter((game) => game.route === '/game/placement').map((game) => game.id)).toEqual(['placement', 'hardcore'])
  })

  it('covers every game colour of the theme, with that colour', () => {
    expect(GAMES.map((game) => game.id).sort()).toEqual(Object.keys(gameColors).sort())
    for (const game of GAMES) expect(game.color).toBe(gameColors[game.id])
  })

  it('has an absolute route for each game', () => {
    for (const game of GAMES) expect(game.route).toMatch(/^\/game\/[a-z-]+$/)
  })

  it('has its title and description translated in every language', () => {
    for (const lng of LANGUAGE_CODES) {
      for (const game of GAMES) {
        expect(i18n.exists(game.titleKey, { lng })).toBe(true)
        expect(i18n.exists(game.descKey, { lng })).toBe(true)
      }
    }
  })
})

describe('lookups', () => {
  it('finds a game by id and by shared type', () => {
    expect(getGame('voyage_voyage')?.route).toBe('/game/voyage')
    expect(getGameByType('BORDER_GUESS')?.id).toBe('border_guess')
    for (const game of GAMES) {
      expect(getGame(game.id)).toBe(game)
      expect(getGameByType(game.type)).toBe(game)
    }
  })

  it('returns undefined for unknown ids and types', () => {
    expect(getGame('nope')).toBeUndefined()
    expect(getGameByType('nope')).toBeUndefined()
    expect(getGame('PLACEMENT')).toBeUndefined()
  })

  it('keeps solo-only games out of multiplayer', () => {
    expect(MULTI_GAMES.map((game) => game.id)).toEqual(['placement', 'flags', 'capitals', 'border_guess', 'country_clue', 'quiz', 'survival'])
    expect(getGame('voyage_voyage')?.multi).toBe(false)
    expect(getGame('ranking')?.multi).toBe(false)
    expect(getGame('daily_challenge')?.multi).toBe(false)
  })

  it('puts the Daily Challenge first among the dailies, without an infinite mode', () => {
    const dailies = GAMES.filter((game) => game.kind === 'daily')
    expect(dailies[0].id).toBe('daily_challenge')
    expect(dailies[0].route).toBe('/game/challenge')
    expect(getGameByType('DAILY_CHALLENGE')?.id).toBe('daily_challenge')
    expect(GAMES.filter((game) => game.dailyOnly).map((game) => game.id)).toEqual(['daily_challenge'])
  })

  it('offers setup sheets to all configurable solo games', () => {
    expect(GAMES.filter((game) => game.kind === 'setup').map((game) => game.id)).toEqual(['placement', 'flags', 'capitals', 'hardcore', 'missing_flag'])
  })

  it('offers no Ascension to Missing Flag', () => {
    expect(GAMES.filter((game) => game.noAscension).map((game) => game.id)).toEqual(['missing_flag'])
  })
})

describe('difficulties', () => {
  it('has a colour per difficulty', () => {
    expect(Object.keys(DIFFICULTY_COLORS).sort()).toEqual([...DIFFICULTIES].sort())
    for (const color of Object.values(DIFFICULTY_COLORS)) expect(color).toMatch(/^#[0-9A-F]{6}$/)
  })
})

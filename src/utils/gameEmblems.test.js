import { describe, expect, it } from 'vitest'
import { GAME_EMBLEMS, emblemId, gameEmblem } from './gameEmblems'
import { GAME_TYPES } from './gameTypes'

describe('game emblems', () => {
  it('gives every game type an emblem', () => {
    for (const type of Object.values(GAME_TYPES)) expect(gameEmblem(type), type).not.toBeNull()
  })

  it('reads room ids, app ids and game types alike', () => {
    expect(emblemId('border_guess')).toBe('border_guess')
    expect(emblemId('BORDER_GUESS')).toBe('border_guess')
    expect(emblemId('nope')).toBeNull()
    expect(emblemId(undefined)).toBeNull()
  })

  it('uses a distinct three-letter code per game', () => {
    const codes = Object.values(GAME_EMBLEMS).map((emblem) => emblem.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(code).toMatch(/^[A-Z]{3}$/)
  })
})

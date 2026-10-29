import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from './gameTypes'
import { LISTED_ROOM_GAMES, ROOM_GAMES } from './roomGames'

describe('room games', () => {
  it('keeps the hidden Geo Quiz in the catalog (rooms already created) but not in the pickers', () => {
    expect(ROOM_GAMES.some((game) => game.type === GAME_TYPES.QUIZ)).toBe(true)
    expect(LISTED_ROOM_GAMES.some((game) => game.type === GAME_TYPES.QUIZ)).toBe(false)
    expect(LISTED_ROOM_GAMES).toHaveLength(ROOM_GAMES.length - 1)
  })
})

import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from '../../utils/gameTypes'
import { GAMES } from './gameData'

describe('home games', () => {
  it('shows the Country of the Day second among the daily cards, and not the hidden Geo Quiz', () => {
    const daily = GAMES.filter((game) => game.active && game.kind === 'daily').map((game) => game.id)
    expect(daily).toEqual([
      GAME_TYPES.DAILY_CHALLENGE,
      GAME_TYPES.COUNTRY_OF_DAY,
      GAME_TYPES.BORDER_GUESS,
      GAME_TYPES.COUNTRY_CLUE,
      GAME_TYPES.VOYAGE_VOYAGE,
      'ranking',
    ])
    expect(GAMES.find((game) => game.id === GAME_TYPES.QUIZ).active).toBe(false)
  })

  it('opens the Country of the Day on its own route, as a daily game only', () => {
    const game = GAMES.find((item) => item.id === GAME_TYPES.COUNTRY_OF_DAY)
    expect(game).toMatchObject({ route: '/country-of-the-day', dailyOnly: true, multiId: null })
  })
})

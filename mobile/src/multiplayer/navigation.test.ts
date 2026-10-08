import { router } from 'expo-router'

import { getGame } from '@/games'

import { startMultiGame } from './navigation'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }))

const game = (id: string) => {
  const found = getGame(id)
  if (!found) throw new Error(`unknown game ${id}`)
  return found
}

beforeEach(() => jest.clearAllMocks())

describe('startMultiGame', () => {
  it('sends setup games (Placement, Flags, Capitals) through their setup sheet in multiplayer mode', () => {
    startMultiGame(game('flags'))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/play/[game]', params: { game: 'flags', multi: '1' } })
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('sends the other games straight to the room creation screen', () => {
    startMultiGame(game('border_guess'))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/multi/create', params: { game: 'border_guess' } })
  })

  it('replaces the current screen and passes the room code when the host adds a game', () => {
    startMultiGame(game('quiz'), 'ABC123')
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/multi/create', params: { game: 'quiz', add: 'ABC123' } })
    expect(router.push).not.toHaveBeenCalled()

    startMultiGame(game('capitals'), 'ABC123')
    expect(router.replace).toHaveBeenLastCalledWith({
      pathname: '/play/[game]',
      params: { game: 'capitals', multi: '1', add: 'ABC123' },
    })
  })
})

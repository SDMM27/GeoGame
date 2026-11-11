import { act, create } from 'react-test-renderer'

import { GAMES } from '@/games'
import GameEmblem, { emblemColor, flightCode } from './GameEmblem'

function render(element: React.ReactElement) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(element)
  })
  return tree
}

describe('GameEmblem', () => {
  it.each(['tile', 'stamp', 'glyph'] as const)('renders the %s variant', (variant) => {
    expect(render(<GameEmblem game="flags" variant={variant} title="Drapeau" />).toJSON()).not.toBeNull()
  })

  it('writes the flight code on the stamp only', () => {
    expect(JSON.stringify(render(<GameEmblem game="flags" variant="stamp" />).toJSON())).toContain('DRP')
    expect(JSON.stringify(render(<GameEmblem game="flags" variant="tile" />).toJSON())).not.toContain('DRP')
  })

  it('renders nothing for an unknown game', () => {
    expect(render(<GameEmblem game="nope" />).toJSON()).toBeNull()
  })

  it('gives every game a flight code and its color', () => {
    for (const game of GAMES) {
      expect(game.code).toMatch(/^[A-Z]{3}$/)
      expect(flightCode(game.id)).toBe(game.code)
      expect(emblemColor(game.id)).toBe(game.color)
    }
  })
})

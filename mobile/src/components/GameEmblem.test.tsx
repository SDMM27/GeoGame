import { act, create } from 'react-test-renderer'
import { Platform } from 'react-native'
import { Svg } from 'react-native-svg'

import { GAMES } from '@/games'
import { darkGameColors, lightGameColors } from '@/theme'

import GameEmblem, { emblemColor, flightCode } from './GameEmblem'

function render(element: React.ReactElement) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(element)
  })
  return tree
}

describe('GameEmblem', () => {
  it.each([undefined, 'Drapeau'])('uses valid web SVG accessibility attributes (title: %s)', (title) => {
    jest.replaceProperty(Platform, 'OS', 'web')
    try {
      const props = render(<GameEmblem game="flags" title={title} />).root.findByType(Svg).props
      expect(props.accessible).toBeUndefined()
      expect(props.importantForAccessibility).toBeUndefined()
      expect(props.accessibilityRole).toBeUndefined()
      if (title) {
        expect(props.role).toBe('img')
        expect(props['aria-label']).toBe(title)
      } else {
        expect(props['aria-hidden']).toBe(true)
      }
    } finally {
      jest.restoreAllMocks()
    }
  })

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
      expect(emblemColor(game.id)).toBe(darkGameColors[game.id])
      expect(emblemColor(game.id, lightGameColors)).toBe(lightGameColors[game.id])
    }
  })
})

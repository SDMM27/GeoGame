import { act, create } from 'react-test-renderer'

import { clampAxis, clampScale, MAX_SCALE } from './ScrollMap'
import { ScrollsView } from './ScrollsView'

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
// Every call on a gesture builder returns the builder: the detector just renders its child
jest.mock('react-native-gesture-handler', () => {
  const chain = (): unknown => new Proxy(() => {}, { get: () => chain(), apply: () => chain() })
  return { Gesture: { Pan: chain, Pinch: chain, Tap: chain, Simultaneous: chain }, GestureDetector: ({ children }: { children: unknown }) => children }
})
jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return { Image: (props: Record<string, unknown>) => <View {...props} /> }
})
// Skia does not load in jest: the interactive map has its own test
jest.mock('@/components/scrolls/EmpireMap', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  EmpireMap: ({ id }: { id: string }) => require('react').createElement('mock-empire-map', { id }),
}))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('@shared/utils/publicProfile', () => ({ onPublicDataPatched: () => () => {}, cachedPublicData: () => null, fetchPublicData: jest.fn() }))
const mockLoadText = jest.fn()
jest.mock('@shared/data/scrollTexts', () => ({ loadScrollText: (...args: unknown[]) => mockLoadText(...args) }))
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}))

const unlocked = ['continents-1858', 'turin-papyrus', 'rome-395']
function render(requested: string | null = null) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(<ScrollsView scrolls={{ unlocked, seals: 0 }} requested={requested} />)
  })
  return tree
}
type Node = { props: Record<string, unknown>; children: (Node | string)[] }
// All the text under a test instance (its props hold elements, which JSON.stringify cannot walk)
const content = (node: Node | string): string => (typeof node === 'string' ? node : node.children.map(content).filter(Boolean).join(' '))

const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const byId = (tree: ReturnType<typeof create>, testID: string) => tree.root.findAll((node) => node.props.testID === testID && typeof node.type === 'string')
const tiles = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => String(node.props.testID ?? '').startsWith('scroll-') && typeof node.props.onPress === 'function')

beforeEach(() => mockLoadText.mockReset().mockReturnValue(new Promise(() => {})))

describe('ScrollsView', () => {
  it('groups the scrolls by era, with the title and year of each owned one', () => {
    const out = text(render())
    const eras = ['geological', 'antiquity', 'middle_ages', 'discoveries', 'modern'].map((era) => out.indexOf(`scrolls.era.${era}`))
    expect(eras.every((index) => index >= 0)).toBe(true)
    expect([...eras].sort((a, b) => a - b)).toEqual(eras)
    expect(out).toContain('scrolls.title_turin-papyrus')
    expect(out).toContain('scrolls.year_bc {\\"year\\":1150}')
    // An atlas map says it was drawn later; a period document keeps the bare year
    expect(out).toContain('scrolls.map_of {\\"year\\":\\"1923\\"}')
    expect(out).toContain('1858')
  })

  it('shows a missing scroll as a sealed tile that only names its era and cannot be pressed', () => {
    const tree = render()
    const sealed = byId(tree, 'sealed-scroll')
    expect(sealed).toHaveLength(12 - unlocked.length)
    for (const tile of sealed) {
      expect(typeof tile.props.onPress).toBe('undefined')
      expect(content(tile as unknown as Node)).toMatch(/^scrolls\.era\.[a-z_]+$/)
    }
    expect(tiles(render())).toHaveLength(unlocked.length)
    // No title of a missing scroll, and no image requested for it
    const out = text(tree)
    expect(out).not.toContain('scrolls.title_mongol-dominions')
    expect(out).not.toContain('mongol-dominions')
    expect(byId(tree, 'scroll-image')).toHaveLength(unlocked.length)
  })

  it('opens the sheet of an owned scroll', () => {
    const tree = render()
    expect(text(tree)).not.toContain('scrolls.detail_title')
    act(() => tiles(tree).find((node) => node.props.testID === 'scroll-rome-395')!.props.onPress())
    expect(text(tree)).toContain('scrolls.family_atlas')
    expect(text(tree)).toContain('scrolls.zoom_in')
    expect(mockLoadText).toHaveBeenCalledWith('rome-395', 'fr')
  })

  it('opens a requested sheet only for an owned scroll', () => {
    expect(text(render('mongol-dominions'))).not.toContain('scrolls.zoom_in')
    expect(text(render('nope'))).not.toContain('scrolls.zoom_in')
    expect(text(render('turin-papyrus'))).toContain('scrolls.family_period')
  })

  it('shows the texts of the sheet, and hides the blocks without text', async () => {
    mockLoadText.mockResolvedValue({ body: 'The story.', detail: 'Look at the river.', credit: 'Museo Egizio' })
    let tree!: ReturnType<typeof create>
    await act(async () => {
      tree = create(<ScrollsView scrolls={{ unlocked, seals: 0 }} requested="rome-395" />)
    })
    const out = text(tree)
    expect(out).toContain('The story.')
    expect(out).toContain('Look at the river.')
    expect(out).toContain('scrolls.detail_title')
    expect(out).toContain('Museo Egizio')
    mockLoadText.mockResolvedValue({})
    await act(async () => {
      tree = create(<ScrollsView scrolls={{ unlocked, seals: 0 }} requested="rome-395" />)
    })
    expect(text(tree)).not.toContain('scrolls.detail_title')
    expect(text(tree)).not.toContain('scrolls.credit_title')
  })

  it('shows a parchment placeholder, not a broken image, when a file fails to load', () => {
    const tree = render('rome-395')
    expect(byId(tree, 'scroll-placeholder')).toHaveLength(0)
    expect(byId(tree, 'scroll-image').length).toBeGreaterThan(0)
    for (const image of byId(tree, 'scroll-image')) act(() => image.props.onError())
    // 3 thumbnails in the grid + the large map of the sheet
    expect(byId(tree, 'scroll-image')).toHaveLength(0)
    expect(byId(tree, 'scroll-placeholder')).toHaveLength(unlocked.length + 1)
  })
})

describe('map limits', () => {
  it('keeps the viewport covered so every part of a wide map can be reached', () => {
    expect(clampAxis(50, 400, 2)).toBe(0)
    expect(clampAxis(-999, 400, 2)).toBe(-400)
    expect(clampAxis(-120, 400, 2)).toBe(-120)
    // The papyrus: 5.5 viewports wide when zoomed to 5.5
    expect(clampAxis(-99999, 400, 5.5)).toBe(400 - 400 * 5.5)
    expect(clampScale(0.1)).toBe(1)
    expect(clampScale(99)).toBe(MAX_SCALE)
  })
})

describe('view tabs of the sheet', () => {
  const open = (id: string) => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<ScrollsView scrolls={{ unlocked: ['ottoman-empire', 'turin-papyrus'], seals: 0 }} requested={id} />)
    })
    return tree
  }
  const empireMaps = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => (node.type as unknown) === 'mock-empire-map')

  it('appear for an empire only', () => {
    expect(text(open('ottoman-empire'))).toContain('scrolls.view_interactive')
    expect(text(open('turin-papyrus'))).not.toContain('scrolls.view_interactive')
    expect(text(open('turin-papyrus'))).not.toContain('scrolls.view_old')
  })

  it('switch between the old map and the interactive one', () => {
    const tree = open('ottoman-empire')
    const tab = (testID: string) => tree.root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0]
    expect(empireMaps(tree)).toHaveLength(0)
    expect(text(tree)).toContain('scrolls.zoom_in')
    expect(tab('scroll-view-old').props.accessibilityState).toEqual({ selected: true })
    act(() => tab('scroll-view-interactive').props.onPress())
    expect(empireMaps(tree)).toHaveLength(1)
    expect(empireMaps(tree)[0].props.id).toBe('ottoman-empire')
    expect(text(tree)).not.toContain('scrolls.zoom_in')
    expect(tab('scroll-view-interactive').props.accessibilityState).toEqual({ selected: true })
    act(() => tab('scroll-view-old').props.onPress())
    expect(empireMaps(tree)).toHaveLength(0)
    expect(text(tree)).toContain('scrolls.zoom_in')
  })
})

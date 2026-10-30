import { act, create } from 'react-test-renderer'

import { onReplayFlag } from '@/components/collection/replay'

import { FlagCollectionView, sortFlags, type Collection } from './FlagCollection'

// A pool of 30 fake flags: f00..f29, the rarity cycling through the four
jest.mock('@shared/utils/flagCollectionData', () => {
  const rarities = ['common', 'uncommon', 'rare', 'legendary']
  return {
    FLAG_POOL: Array.from({ length: 30 }, (_, i) => ({ iso: `f${String(i).padStart(2, '0')}`, rarity: rarities[i % 4] })),
    fetchCollection: jest.fn(),
  }
})
jest.mock('@shared/utils/publicProfile', () => ({ onPublicDataPatched: () => () => {} }))
// Name = the iso upper-cased, so the sort is easy to read
jest.mock('@shared/utils/getCountryName', () => ({ getCountryName: (iso: string) => iso.toUpperCase() }))
// Reanimated and worklets need native code: their jest mocks (no useReducedMotion needed here)
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
// The icon font loads asynchronously and updates state outside act
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('@/flags', () => ({ getFlag: () => 1 }))
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

const mastery = {
  placement: { found: 5, total: 10 },
  flags: { found: 2, total: 8 },
  hardcore: { found: 0, total: 10 },
  found: 7,
  total: 28,
}
const isos = (count: number) => Array.from({ length: count }, (_, i) => `f${String(i).padStart(2, '0')}`)
const collection = (unlocked: string[], current: string | null = null, pieces = 0): Collection => ({
  flags: { unlocked, current, pieces },
  mastery,
})

function render(value: Collection) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(<FlagCollectionView collection={value} />)
  })
  return tree
}
const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const cells = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => String(node.props.testID ?? '').startsWith('flag-') && typeof node.type !== 'string' && typeof node.props.onPress === 'function')

describe('sortFlags', () => {
  it('puts the rarest first, then sorts by name', () => {
    // f03 legendary, f02 rare, f01 uncommon, f00 and f04 common
    expect(sortFlags(['f00', 'f01', 'f02', 'f03', 'f04'], 'fr')).toEqual(['f03', 'f02', 'f01', 'f00', 'f04'])
  })
})

describe('FlagCollectionView', () => {
  it('shows the won flag pieces and covers only the pieces not won yet', () => {
    // f05 is uncommon: 3 pieces side by side
    const tree = render(collection(['f00'], 'f05', 2))
    const hidden = tree.root.findAll((node) => node.props.testID === 'hidden-piece' && typeof node.type === 'string')
    const visible = tree.root.findAll((node) => node.props.testID === 'visible-piece' && typeof node.type === 'string')
    expect(hidden).toHaveLength(1)
    expect(visible).toHaveLength(2)
    // Pieces come left to right: the covered one is the last strip
    expect(parseFloat(hidden[0].props.style[1].left)).toBeCloseTo(200 / 3)
    expect(hidden[0].props.style[1].top).toBe('0%')
    const out = text(tree)
    expect(out).toContain('collection.pieces {\\"count\\":2,\\"total\\":3}')
    expect(out).toContain('collection.hint')
    expect(out).not.toContain('F05')
  })

  it('cuts the flag by its rarity: 6 pieces for a legendary one, 2 for a common one', () => {
    const pieceCount = (tree: ReturnType<typeof create>) =>
      tree.root.findAll((node) => /-piece$/.test(String(node.props.testID)) && typeof node.type === 'string')
    // f03 legendary, f04 common
    const legendary = render(collection([], 'f03', 4))
    expect(pieceCount(legendary)).toHaveLength(6)
    expect(text(legendary)).toContain('collection.pieces {\\"count\\":4,\\"total\\":6}')
    const common = render(collection([], 'f04', 1))
    expect(pieceCount(common)).toHaveLength(2)
    expect(text(common)).toContain('collection.pieces {\\"count\\":1,\\"total\\":2}')
  })

  it('shows the empty message when nothing was won at all', () => {
    const out = text(render(collection([])))
    expect(out).toContain('collection.empty')
    expect(out).not.toContain('collection.unlocked')
    expect(out).toContain('collection.legend_progress {\\"count\\":7,\\"total\\":28}')
    expect(out).toContain('collection.mode_hardcore')
    expect(out).not.toContain('collection.legend_hardcore_soon')
  })

  it('shows the complete message when every flag is unlocked', () => {
    const tree = render(collection(isos(30)))
    const out = text(tree)
    expect(out).toContain('collection.complete')
    expect(out).toContain('collection.progress {\\"count\\":30,\\"total\\":30}')
    expect(tree.root.findAll((node) => node.props.testID === 'piece-flag' && typeof node.type === 'string')).toHaveLength(0)
  })

  it('lists the rarest flags first and shows 24, then all with show_all', () => {
    const tree = render(collection(isos(30), null))
    expect(cells(tree)).toHaveLength(24)
    expect(cells(tree)[0].props.testID).toBe('flag-f03')
    expect(text(tree)).toContain('collection.show_all')
    const toggle = tree.root.findAll((node) => node.props.accessibilityRole === 'button' && !node.props.accessibilityState && !node.props.testID && typeof node.props.onPress === 'function' && typeof node.type !== 'string')[0]
    act(() => toggle.props.onPress())
    expect(cells(tree)).toHaveLength(30)
    expect(text(tree)).toContain('collection.show_less')
  })

  it('names each rarity with its count, inside the card rather than in the header', () => {
    // f00 and f04 common, f03 legendary
    const out = text(render(collection(['f00', 'f03', 'f04'])))
    expect(out).toContain('collection.rarity.common')
    expect(out).toContain('collection.rarity.legendary')
    expect(out).toContain('collection.progress {\\"count\\":3,\\"total\\":30}')
    expect(out.indexOf('collection.rarity.common')).toBeGreaterThan(out.indexOf('collection.unlocked'))
  })

  it('plays the unlock reveal again for a tapped flag', () => {
    const tree = render(collection(['f03', 'f00']))
    const replayed: string[] = []
    const stop = onReplayFlag((iso) => replayed.push(iso))
    act(() => cells(tree)[0].props.onPress())
    stop()
    expect(replayed).toEqual(['f03'])
  })
})

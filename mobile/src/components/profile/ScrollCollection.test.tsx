import { act, create } from 'react-test-renderer'

import { ScrollCollectionView } from './ScrollCollection'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ router: { push: (path: unknown) => mockPush(path) } }))
jest.mock('@shared/utils/publicProfile', () => ({ onPublicDataPatched: () => () => {}, cachedPublicData: () => null, fetchPublicData: jest.fn() }))
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" onPress={onPress}><Text>{label}</Text></Pressable> }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}))

const owned = { unlocked: ['continents-1858', 'turin-papyrus'], seals: 1 }
function render(props: { own?: boolean; scrolls?: { unlocked: string[]; seals: number } }) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(<ScrollCollectionView scrolls={props.scrolls ?? owned} own={props.own} />)
  })
  return tree
}
type Node = { props: Record<string, unknown>; children: (Node | string)[] }
// All the text under a test instance (its props hold elements, which JSON.stringify cannot walk)
const content = (node: Node | string): string => (typeof node === 'string' ? node : node.children.map(content).filter(Boolean).join(' '))

const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const buttons = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => !!node.props && node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')

describe('ScrollCollectionView', () => {
  beforeEach(() => mockPush.mockReset())

  it('shows the count, the seals and a link to the collection on your own profile', () => {
    const tree = render({ own: true })
    const out = text(tree)
    expect(out).toContain('scrolls.progress {\\"count\\":2,\\"total\\":12}')
    expect(out).toContain('scrolls.seals {\\"count\\":1,\\"total\\":2}')
    const open = buttons(tree).find((node) => content(node as unknown as Node).includes('scrolls.open_collection'))!
    act(() => open.props.onPress())
    expect(mockPush).toHaveBeenCalledWith('/parchments')
  })

  it("shows only the count on another player's profile: no title, no seals, no link", () => {
    const tree = render({})
    const out = text(tree)
    expect(out).toContain('scrolls.progress {\\"count\\":2,\\"total\\":12}')
    expect(out).not.toContain('scrolls.title')
    expect(out).not.toContain('scrolls.seals')
    expect(out).not.toContain('scrolls.open_collection')
    expect(buttons(tree)).toHaveLength(0)
  })
})

import { act, create } from 'react-test-renderer'

import { FlagUnlockOverlay } from './FlagUnlockOverlay'
import { ScrollUnlockOverlay } from './ScrollUnlockOverlay'
import { SealToast } from './SealToast'

// Reanimated's jest mock has no useReducedMotion
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */

let mockListeners: ((claim: unknown) => void)[] = []
jest.mock('@shared/utils/xp', () => ({
  onXpClaimed: (listener: (claim: unknown) => void) => {
    mockListeners.push(listener)
    return () => {}
  },
}))
jest.mock('@shared/utils/flagCollectionData', () => ({ FLAG_POOL: [{ iso: 'fr', rarity: 'rare' }] }))
jest.mock('@shared/utils/publicProfile', () => ({ cachedPublicData: () => null, onPublicDataPatched: () => () => {}, fetchPublicData: jest.fn() }))
jest.mock('@shared/utils/getCountryName', () => ({ getCountryName: () => 'France' }))
jest.mock('@/account/auth', () => ({ useAccount: () => ({ account: { uid: 'u1' } }) }))
jest.mock('@/flags', () => ({ getFlag: () => 1 }))
jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  return { Image: (props: Record<string, unknown>) => <View {...props} /> }
})
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ router: { push: (path: unknown) => mockPush(path) } }))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('@/shims/react-toastify', () => ({ toast: { success: jest.fn() } }))
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable> }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}))

type Node = { props: Record<string, unknown> }
const emit = (data: Record<string, unknown>) => act(() => mockListeners.forEach((listener) => listener({ gained: 0, levelUp: false, level: 1, ...data })))
const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const pressable = (tree: ReturnType<typeof create>, match: (node: Node) => boolean) =>
  tree.root.findAll((node) => !!node.props && match(node as unknown as Node) && typeof node.props.onPress === 'function')[0]
const byLabel = (tree: ReturnType<typeof create>, label: string) => pressable(tree, (node) => node.props.accessibilityLabel === label)
const demo = { unlocked: ['continents-1858', 'rome-395'], seals: 0 }

beforeEach(() => {
  jest.useFakeTimers()
  mockListeners = []
  mockPush.mockReset()
})
afterEach(() => jest.useRealTimers())

describe('ScrollUnlockOverlay', () => {
  it('shows the sealed scroll, opens it with the seal and links to the sheet', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<ScrollUnlockOverlay />)
    })
    expect(tree.toJSON()).toBeNull()
    emit({ unlockedScrolls: ['rome-395'], scrolls: demo })
    // Sealed: the title is not revealed yet
    expect(text(tree)).toContain('scrolls.new_scroll')
    expect(text(tree)).toContain('scrolls.tap_seal')
    expect(text(tree)).not.toContain('scrolls.title_rome-395')
    act(() => byLabel(tree, 'scrolls.open_seal').props.onPress())
    expect(text(tree)).toContain('scrolls.title_rome-395')
    expect(text(tree)).toContain('scrolls.progress {\\"count\\":2,\\"total\\":12}')
    act(() => byLabel(tree, 'scrolls.view_scroll').props.onPress())
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(tree.toJSON()).toBeNull()
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/parchments', params: { open: 'rome-395' } })
  })

  it('shows a placeholder, not a broken image, when the map is missing', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<ScrollUnlockOverlay />)
    })
    emit({ unlockedScrolls: ['rome-395'], scrolls: demo })
    act(() => tree.root.findAll((node) => node.props.testID === 'scroll-image' && typeof node.type === 'string')[0].props.onError())
    expect(text(tree)).toContain('scroll-placeholder')
  })

  it('closes on continue without going anywhere, and ignores a claim without scrolls', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<ScrollUnlockOverlay />)
    })
    emit({ seals: 1 })
    expect(tree.toJSON()).toBeNull()
    emit({ unlockedScrolls: ['rome-395'], scrolls: demo })
    act(() => byLabel(tree, 'scrolls.open_seal').props.onPress())
    act(() => byLabel(tree, 'collection.tap_to_continue').props.onPress())
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(tree.toJSON()).toBeNull()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('waits for the flag overlay when the same claim unlocks flags', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(
        <>
          <FlagUnlockOverlay />
          <ScrollUnlockOverlay />
        </>,
      )
    })
    emit({ unlockedFlags: ['fr'], unlockedScrolls: ['rome-395'], scrolls: demo, demoFlags: { unlocked: ['fr'], current: null, pieces: 0 } })
    expect(text(tree)).toContain('France')
    expect(text(tree)).not.toContain('scrolls.new_scroll')
    act(() => {
      jest.advanceTimersByTime(4000)
    })
    act(() => byLabel(tree, 'collection.tap_to_continue').props.onPress())
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(text(tree)).not.toContain('France')
    expect(text(tree)).toContain('scrolls.new_scroll')
  })
})

describe('SealToast', () => {
  it('shows the seals won and the progress toward the next scroll', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<SealToast />)
    })
    expect(tree.toJSON()).toBeNull()
    emit({ seals: 1, scrolls: { unlocked: ['continents-1858'], seals: 1 } })
    expect(text(tree)).toContain('scrolls.seal_gain {\\"count\\":1,\\"progress\\":1,\\"total\\":2}')
    act(() => {
      jest.advanceTimersByTime(3300)
    })
    expect(tree.toJSON()).toBeNull()
  })

  it('counts the seals that just opened a scroll as full, and ignores a claim without seals', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<SealToast />)
    })
    emit({ seals: 0 })
    expect(tree.toJSON()).toBeNull()
    emit({ seals: 1, unlockedScrolls: ['rome-395'], scrolls: demo })
    expect(text(tree)).toContain('\\"count\\":1,\\"progress\\":2,\\"total\\":2')
  })
})

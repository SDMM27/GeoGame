import { act, create } from 'react-test-renderer'

import { FlagUnlockOverlay } from './FlagUnlockOverlay'
import { FragmentToast } from './FragmentToast'

// Reanimated's jest mock has no useReducedMotion
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */

let mockListener: ((claim: unknown) => void) | null = null
jest.mock('@shared/utils/xp', () => ({
  onXpClaimed: (listener: (claim: unknown) => void) => {
    mockListener = listener
    return () => {}
  },
}))
jest.mock('@shared/utils/flagCollectionData', () => ({ FLAG_POOL: [{ iso: 'fr', rarity: 'rare' }, { iso: 'de', rarity: 'common' }] }))
jest.mock('@shared/utils/publicProfile', () => ({ cachedPublicData: () => null }))
jest.mock('@shared/utils/getCountryName', () => ({ getCountryName: () => 'France' }))
jest.mock('@/account/auth', () => ({ useAccount: () => ({ account: { uid: 'u1' } }) }))
jest.mock('@/flags', () => ({ getFlag: () => 1 }))
jest.mock('@/shims/react-toastify', () => ({ toast: { success: jest.fn() } }))
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ router: { push: (path: string) => mockPush(path) } }))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress}><Text>{label}</Text></Pressable> }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}))

const texts = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const claim = (extra: Record<string, unknown>) => ({ gained: 0, levelUp: false, level: 1, fragments: 0, unlockedFlags: [], ...extra })

describe('FlagUnlockOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockPush.mockReset()
  })
  afterEach(() => jest.useRealTimers())

  it('shows the country and its rarity, then closes on continue', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<FlagUnlockOverlay />)
    })
    expect(tree.toJSON()).toBeNull()
    act(() => mockListener?.(claim({ unlockedFlags: ['fr'] })))
    expect(texts(tree)).toContain('France')
    expect(texts(tree)).toContain('collection.rarity.rare')
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    const button = tree.root.findAll((node) => node.props.children === 'collection.tap_to_continue')[0]
    let pressable = button
    while (pressable && typeof pressable.props.onPress !== 'function') pressable = pressable.parent!
    act(() => pressable.props.onPress())
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(tree.toJSON()).toBeNull()
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('FragmentToast', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('shows the +N fragments of a claim with the flag being rebuilt', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<FragmentToast />)
    })
    act(() => mockListener?.(claim({ fragments: 2, demoFlags: { unlocked: [], current: 'fr', pieces: 3 } })))
    expect(texts(tree)).toContain('level.fragments {\\"count\\":2}')
    expect(texts(tree)).toContain('collection.pieces {\\"count\\":3,\\"total\\":4}')
  })

  it('ignores a claim without fragments', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<FragmentToast />)
    })
    act(() => mockListener?.(claim({})))
    expect(tree.toJSON()).toBeNull()
  })
})

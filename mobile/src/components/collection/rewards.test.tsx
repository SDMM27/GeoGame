import { act, create } from 'react-test-renderer'
import { revealLeagueFlags } from '@shared/utils/leagueFlagReveal'

import { FlagUnlockOverlay } from './FlagUnlockOverlay'
import { FragmentToast } from './FragmentToast'
import { replayFlag } from './replay'

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
// The revealed name is animated letter by letter: the header carries it as its accessibility label.
const headerText = (tree: ReturnType<typeof create>) =>
  tree.root.findAll((node) => node.props.accessibilityRole === 'header')[0].props.accessibilityLabel as string
// The details and buttons stay in the layout from the start (so nothing shifts at the end), hidden until revealed.
const styleOf = (tree: ReturnType<typeof create>, testID: string) => {
  const found = tree.root.findAllByProps({ testID })
  if (!found.length) return null // not a historical reveal
  const style = found[0].props.style
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style
}
const detailsHidden = (tree: ReturnType<typeof create>) => {
  const found = tree.root.findAllByProps({ testID: 'reveal-history-details' })
  return !found.length || found[0].props.accessibilityElementsHidden === true
}
const buttonsHidden = (tree: ReturnType<typeof create>) => {
  const style = styleOf(tree, 'reveal-buttons')
  return style == null || style.opacity === 0
}
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

  it('presents the league reveal only for the signed-in account', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<FlagUnlockOverlay />)
    })
    const flagReveal = { unlocked: ['fr'], collectionCount: 1 }
    act(() => revealLeagueFlags('different-account', flagReveal))
    expect(tree.toJSON()).toBeNull()
    act(() => revealLeagueFlags('u1', flagReveal))
    expect(texts(tree)).toContain('France')
    expect(texts(tree)).toContain('collection.new_flag')
    act(() => tree.unmount())
  })

  it('plays the full league award before offering the collection shortcut', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<FlagUnlockOverlay />)
    })
    act(() => revealLeagueFlags('u1', { unlocked: ['fr'], collectionCount: 1, historical: ['ussr'] }))
    expect(texts(tree)).toContain('France')
    act(() => { jest.advanceTimersByTime(4000) })
    expect(buttonsHidden(tree)).toBe(true)
    const button = tree.root.findAll((node) => node.props.accessibilityLabel === 'collection.tap_to_continue' && typeof node.props.onPress === 'function')[0]
    act(() => {
      button.props.onPress()
      button.props.onPress()
    })
    act(() => { jest.advanceTimersByTime(300) })
    expect(texts(tree)).toContain('collection.historical.current')
    expect(headerText(tree)).toBe('collection.historical.current')
    expect(detailsHidden(tree)).toBe(true)
    expect(texts(tree)).toContain('Le marteau et la faucille') // in the layout, but hidden
    expect(buttonsHidden(tree)).toBe(true)
    act(() => { jest.advanceTimersByTime(4000) })
    expect(headerText(tree)).toBe('Union soviétique')
    expect(detailsHidden(tree)).toBe(false)
    expect(buttonsHidden(tree)).toBe(false)
    expect(texts(tree)).toContain('1955–1991')
    expect(texts(tree)).toContain('collection.view_collection')
    expect(mockPush).not.toHaveBeenCalled()
    act(() => tree.unmount())
  })

  it('opens the historical archive on replay and lets it close during the animation', () => {
    let tree!: ReturnType<typeof create>
    act(() => { tree = create(<FlagUnlockOverlay />) })
    act(() => replayFlag('ussr'))
    expect(texts(tree)).toContain('historical-flag-frame')
    expect(texts(tree)).toContain('historical-flag-sparks')
    expect(detailsHidden(tree)).toBe(true)
    expect(texts(tree)).not.toContain('collection.new_flag')
    const close = tree.root.findAll((node) => node.props.accessibilityLabel === 'collection.historical.close_details' && typeof node.props.onPress === 'function')[0]
    act(() => close.props.onPress())
    expect(tree.toJSON()).toBeNull()
    act(() => tree.unmount())
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

  it('says why the dailies and the streak paid fragments', () => {
    let tree!: ReturnType<typeof create>
    act(() => {
      tree = create(<FragmentToast />)
    })
    const rewards = [
      { kind: 'dailies_won_all', fragments: 1 },
      { kind: 'streak', fragments: 2, streak: 7 },
    ]
    act(() => mockListener?.(claim({ fragments: 3, rewards, demoFlags: { unlocked: [], current: 'fr', pieces: 3 } })))
    const out = texts(tree)
    expect(out).toContain('missions.reward_line')
    expect(out).toContain('missions.reward_dailies_won_all')
    expect(out).toMatch(/missions.reward_streak .*days.*7/)
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

import { act, create } from 'react-test-renderer'

import { Avatar } from './ProfileSections'

jest.mock('@/flags', () => ({ getFlag: (iso: string) => (iso.toLowerCase() === 'zz' ? null : 1) }))
jest.mock('@shared/hooks/useDecoration', () => ({ useDecoration: () => null }))
// The Firebase-backed modules the profile sections import; decorations stays real
jest.mock('firebase/firestore', () => ({}))
jest.mock('@shared/Firebase', () => ({ firestore: {} }))
jest.mock('@shared/utils/publicProfile', () => ({}))
jest.mock('@shared/utils/achievements', () => ({ TIER_COLORS: {} }))
jest.mock('@shared/utils/elo', () => ({ formatSeason: () => '' }))
jest.mock('@shared/utils/profileFormat', () => ({}))
jest.mock('@shared/utils/profileStats', () => ({}))
jest.mock('@shared/hooks/useBadges', () => ({ useBadges: () => ({}) }))
jest.mock('@shared/hooks/usePlayerElo', () => ({ usePlayerElo: () => ({}) }))
jest.mock('@shared/hooks/usePlayerRecords', () => ({ usePlayerRecords: () => ({}) }))
jest.mock('@shared/hooks/usePlayerProfile', () => ({ usePlayerProfile: () => ({}) }))
jest.mock('@/components/CollapsibleSection', () => ({ CollapsibleSection: () => null }))
jest.mock('@/components/profile/BadgeStrip', () => ({ BadgeStrip: () => null }))
jest.mock('@/components/flight', () => ({ Stamp: () => null }))
jest.mock('@/components/GameEmblem', () => () => null)
jest.mock('@/games', () => ({ getGameByType: () => null }))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('expo-router', () => ({ router: {}, useFocusEffect: () => {} }))
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable, Button: Pressable, Segmented: Pressable }
})

const render = (element: React.ReactElement) => {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(element)
  })
  return tree
}
const images = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => node.props.testID === 'avatar-flag')
const resizeMode = (tree: ReturnType<typeof create>) => tree.root.findAllByType('Image' as never)[0]?.props.resizeMode
const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())

describe('Avatar', () => {
  it('shows the initial without a flag', () => {
    const tree = render(<Avatar username="alice" decoration={{ frame: 'none', color: 'default', flag: null }} />)
    expect(images(tree)).toHaveLength(0)
    expect(text(tree)).toContain('"A"')
  })

  it('shows the worn flag instead of the initial, cropped to the circle', () => {
    const tree = render(<Avatar username="alice" decoration={{ frame: 'none', color: 'default', flag: 'FR' }} />)
    expect(images(tree).length).toBeGreaterThan(0)
    expect(text(tree)).not.toContain('"A"')
    expect(resizeMode(tree)).toBe('cover')
  })

  it('shows an uncropped flag whole', () => {
    const tree = render(<Avatar username="alice" decoration={{ frame: 'none', color: 'default', flag: 'NP' }} />)
    expect(resizeMode(tree)).toBe('contain')
  })

  it('falls back to the initial when the flag has no image', () => {
    const tree = render(<Avatar username="alice" decoration={{ frame: 'none', color: 'default', flag: 'ZZ' }} />)
    expect(images(tree)).toHaveLength(0)
    expect(text(tree)).toContain('"A"')
  })

  it('keeps the outer size of a decorated avatar with or without a flag', () => {
    const plain = render(<Avatar username="alice" size={40} decoration={{ frame: 'none', color: 'default' }} />).toJSON() as unknown as { props: { style: { width: number } } }
    const flagged = render(<Avatar username="alice" size={40} decoration={{ frame: 'none', color: 'default', flag: 'FR' }} />).toJSON() as unknown as { props: { style: { width: number } } }
    expect(flagged.props.style.width).toBe(plain.props.style.width)
  })

  it('wears a flag on the bare disc of a list', () => {
    const tree = render(<Avatar username="alice" flag="FR" />)
    expect(images(tree).length).toBeGreaterThan(0)
  })
})

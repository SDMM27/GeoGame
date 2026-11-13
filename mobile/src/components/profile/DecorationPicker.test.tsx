import { Text, TextInput } from 'react-native'
import { act, create } from 'react-test-renderer'

import { saveAvatarFlag, saveDecoration } from '@shared/utils/decorations'
import { fetchCollection } from '@shared/utils/flagCollectionData'

import { Touchable } from '@/components/ui'

import { DecorationPicker } from './DecorationPicker'

const mockUnlocked = (count: number) => Array.from({ length: count }, (_, i) => `f${String(i).padStart(2, '0')}`)

jest.mock('firebase/firestore', () => ({}))
jest.mock('@shared/Firebase', () => ({ firestore: {} }))
jest.mock('@shared/utils/decorations', () => {
  const real = jest.requireActual('../../../../src/utils/decorations.js')
  return {
    ...real,
    saveAvatarFlag: jest.fn(() => Promise.resolve()),
    saveDecoration: jest.fn(() => Promise.resolve()),
  }
})
jest.mock('@shared/utils/flagCollectionData', () => ({ fetchCollection: jest.fn() }))
jest.mock('@shared/utils/publicProfile', () => ({ onPublicDataPatched: () => () => {} }))
jest.mock('@shared/utils/getCountryName', () => ({ getCountryName: (iso: string) => iso.toUpperCase() }))
jest.mock('@shared/hooks/useXp', () => ({ useXp: () => ({ level: 1 }) }))
jest.mock('@shared/hooks/useDecoration', () => ({ useDecoration: () => ({ frame: 'none', color: 'default', flag: 'f01' }) }))
jest.mock('@/components/profile/ProfileSections', () => ({ Avatar: () => null, FlagDisc: () => null }))
jest.mock('@/components/flight', () => ({ Kicker: ({ children }: { children: unknown }) => children, ScreenTitle: ({ children }: { children: unknown }) => children }))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  const Touchable = (props: object) => <Pressable {...props} />
  return { Text, Touchable, Button: ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable accessibilityLabel={label} onPress={onPress} /> }
})
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'fr' }, t: (key: string) => key }),
}))

async function open(count: number) {
  ;(fetchCollection as jest.Mock).mockResolvedValue({ flags: { unlocked: mockUnlocked(count) } })
  let tree!: ReturnType<typeof create>
  await act(async () => {
    tree = create(<DecorationPicker uid="u1" username="alice" />)
  })
  await act(async () => {
    tree.root.findAllByProps({ accessibilityLabel: 'decorations.open' })[0].props.onPress()
  })
  return tree
}
const options = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => String(node.props.testID ?? '').startsWith('flag-option-') && node.type === Touchable)
const searchBox = (tree: ReturnType<typeof create>) => tree.root.findAll((node) => node.type === TextInput)
const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.root.findAllByType(Text).map((node) => node.props.children))

beforeEach(() => jest.clearAllMocks())

describe('DecorationPicker flags', () => {
  it('says so when no flag is unlocked', async () => {
    const tree = await open(0)
    expect(text(tree)).toContain('decorations.flag_empty')
    expect(options(tree)).toHaveLength(0)
  })

  it('lists the unlocked flags without a search box when there are few', async () => {
    const tree = await open(5)
    expect(options(tree)).toHaveLength(5)
    expect(searchBox(tree)).toHaveLength(0)
  })

  it('caps a long list, shows a search box and filters by name', async () => {
    const tree = await open(80)
    expect(options(tree)).toHaveLength(36)
    expect(searchBox(tree)).toHaveLength(1)
    await act(async () => {
      searchBox(tree)[0].props.onChangeText('f7')
    })
    expect(options(tree).map((node) => node.props.testID)).toEqual(['flag-option-f70', 'flag-option-f71', 'flag-option-f72', 'flag-option-f73', 'flag-option-f74', 'flag-option-f75', 'flag-option-f76', 'flag-option-f77', 'flag-option-f78', 'flag-option-f79'])
  })

  it('saves the picked flag and takes it off with "none"', async () => {
    const tree = await open(5)
    await act(async () => {
      options(tree)[2].props.onPress()
    })
    expect(saveAvatarFlag).toHaveBeenCalledWith('u1', 'f02', mockUnlocked(5))
    await act(async () => {
      tree.root.findByProps({ testID: 'flag-none' }).props.onPress()
    })
    expect(saveAvatarFlag).toHaveBeenLastCalledWith('u1', null, mockUnlocked(5))
  })

  it('keeps the worn flag out of the frame and color writes', async () => {
    const tree = await open(5)
    await act(async () => {
      tree.root.findAll((node) => node.props.accessibilityRole === 'radio' && node.type === Touchable && !node.props.testID && node.props.onPress)[1].props.onPress()
    })
    expect(saveDecoration).toHaveBeenCalled()
    expect((saveDecoration as jest.Mock).mock.calls[0][1].flag).toBe('f01')
  })

  it('reverts and reports a failed save', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    ;(saveAvatarFlag as jest.Mock).mockRejectedValueOnce(new Error('denied'))
    const tree = await open(5)
    await act(async () => {
      options(tree)[0].props.onPress()
    })
    expect(text(tree)).toContain('decorations.error')
  })
})

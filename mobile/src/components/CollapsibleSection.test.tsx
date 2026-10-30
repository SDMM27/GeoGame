import { Text as RNText } from 'react-native'
import { act, create } from 'react-test-renderer'

import { CollapsibleSection } from './CollapsibleSection'

// ui.tsx pulls reanimated (native worklets): plain React Native stand-ins are enough here
jest.mock('@/components/ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native')
  return { Text, Touchable: Pressable }
})
// Reanimated and worklets need native code: their jest mocks (no useReducedMotion needed here)
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
// The icon font loads asynchronously and updates state outside act
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)

const KEY = 'geogame:sections'

function render(props: { defaultOpen?: boolean; id?: string } = {}) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(
      <CollapsibleSection id="test.section" title="Titre" summary="résumé" {...props}>
        <RNText>contenu</RNText>
      </CollapsibleSection>,
    )
  })
  return tree
}
const text = (tree: ReturnType<typeof create>) => JSON.stringify(tree.toJSON())
const header = (tree: ReturnType<typeof create>) =>
  tree.root.findAll((node) => typeof node.type !== 'string' && typeof node.props.onPress === 'function' && node.props.accessibilityRole === 'button')[0]
const press = (tree: ReturnType<typeof create>) => act(() => header(tree).props.onPress())

describe('CollapsibleSection', () => {
  it('is folded by default, with the summary visible and no content', () => {
    const tree = render()
    expect(text(tree)).toContain('Titre')
    expect(text(tree)).toContain('résumé')
    expect(text(tree)).not.toContain('contenu')
    expect(header(tree).props.accessibilityState).toEqual({ expanded: false })
  })

  it('opens and folds on press, keeping the summary', () => {
    const tree = render()
    press(tree)
    expect(text(tree)).toContain('contenu')
    expect(header(tree).props.accessibilityState).toEqual({ expanded: true })
    press(tree)
    expect(text(tree)).not.toContain('contenu')
    expect(text(tree)).toContain('résumé')
  })

  it('starts open with defaultOpen, and remembers the choice after a remount', () => {
    const first = render({ defaultOpen: true })
    expect(text(first)).toContain('contenu')
    press(first)
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ 'test.section': false })
    act(() => first.unmount())
    const second = render({ defaultOpen: true })
    expect(text(second)).not.toContain('contenu')
    expect(render({ id: 'other.section', defaultOpen: true }).toJSON()).not.toBeNull()
  })
})

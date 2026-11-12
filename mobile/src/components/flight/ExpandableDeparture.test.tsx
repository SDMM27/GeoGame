import { Text } from 'react-native'
import { act, create, type ReactTestInstance } from 'react-test-renderer'

import { ExpandableDeparture, useAccordion } from './ExpandableDeparture'

// Reanimated's jest mock has no useReducedMotion
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native')
  return Object.create(native, {
    Platform: { value: { ...native.Platform, OS: 'android' } },
    LayoutAnimation: { value: { ...native.LayoutAnimation, configureNext: jest.fn() } },
  })
})
/* eslint-enable @typescript-eslint/no-require-imports */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}))
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null)
jest.mock('@/components/GameEmblem', () => () => null)

const IDS = ['a', 'b']

function Board() {
  const [openId, toggle] = useAccordion()
  return (
    <>
      {IDS.map((id) => (
        <ExpandableDeparture
          key={id}
          game={id}
          code={id.toUpperCase()}
          name={`NAME ${id}`}
          status="OK"
          gate="A1"
          expanded={openId === id}
          onToggle={() => toggle(id)}>
          <Text>{`pass ${id}`}</Text>
        </ExpandableDeparture>
      ))}
    </>
  )
}

function setup() {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(<Board />)
  })
  const header = (id: string) => tree.root.findByProps({ accessibilityLabel: `NAME ${id}, OK` }) as ReactTestInstance
  const expanded = () => IDS.map((id) => header(id).props.accessibilityState.expanded)
  const press = (id: string) => act(() => header(id).props.onPress())
  return { header, expanded, press }
}

describe('ExpandableDeparture', () => {
  it('is closed on arrival and exposes the row as an expandable button', () => {
    const { header, expanded } = setup()
    expect(expanded()).toEqual([false, false])
    expect(header('a').props.accessibilityRole).toBe('button')
  })

  it('opens on press and closes when the open header is pressed again', () => {
    const { expanded, press } = setup()
    press('a')
    expect(expanded()).toEqual([true, false])
    press('a')
    expect(expanded()).toEqual([false, false])
  })

  it('closes the previous one when another opens (one open at a time)', () => {
    const { expanded, press } = setup()
    press('a')
    press('b')
    expect(expanded()).toEqual([false, true])
  })
})

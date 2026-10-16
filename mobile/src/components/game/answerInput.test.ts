import { ANSWER_KEYBOARD_PROPS, isStaleAfterClear } from './answerInput'

// Partial mock: replacing the whole module breaks jest-expo's setup, which reads react-native's native modules
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native')
  ReactNative.Platform.select = (options: any) => options.android
  return ReactNative
})

describe('ANSWER_KEYBOARD_PROPS', () => {
  it('uses a keyboard that composes no word on Android', () => {
    expect(ANSWER_KEYBOARD_PROPS.keyboardType).toBe('visible-password')
  })
})

describe('isStaleAfterClear', () => {
  it('ignores the keystrokes that kept extending an answer accepted while typing', () => {
    expect(isStaleAfterClear('Mozambi', 'Mozamb')).toBe(true)
  })

  it('lets the next answer through', () => {
    expect(isStaleAfterClear('S', 'Mozamb')).toBe(false)
    expect(isStaleAfterClear('Moz', 'Mozamb')).toBe(false)
  })
})

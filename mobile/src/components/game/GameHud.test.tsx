import { act, create } from 'react-test-renderer'

import { GameHud } from './GameHud'

// Reanimated and worklets need native code: their jest mocks (the flight barrel pulls the Stamp)
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }))
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'))
/* eslint-enable @typescript-eslint/no-require-imports */
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('@/shims/react-router-dom', () => ({ navigate: jest.fn() }))
jest.mock('../confirm', () => ({ confirmAction: jest.fn() }))
jest.mock('../ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { Text }
})
jest.mock('@/components/GameEmblem', () => ({ __esModule: true, default: () => null, flightCode: () => 'DRP' }))
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Path: () => null }))

function render(props: Partial<Parameters<typeof GameHud>[0]> = {}) {
  let tree!: ReturnType<typeof create>
  act(() => {
    tree = create(<GameHud game="placement" title="Titre" confirmQuit={false} {...props} />)
  })
  return JSON.stringify(tree.toJSON())
}

describe('GameHud', () => {
  it('shows the board cells, with their suffix', () => {
    const json = render({ cells: [{ label: 'ESCALE', value: '02/04' }, { label: 'SCORE', value: '100', suffix: '/400' }] })
    for (const text of ['ESCALE', '02/04', 'SCORE', '100', '/400']) expect(json).toContain(text)
  })

  it('writes the gate in the kicker, and no gate when it is empty', () => {
    expect(render({ gate: 'A3' })).toContain('A3')
    const none = render({ gate: '', tag: 'QUOTIDIEN' })
    expect(none).toContain('QUOTIDIEN')
    expect(none).not.toContain('home.gate'.toLocaleUpperCase())
    expect(none).not.toMatch(/PORTE|HOME\.GATE/)
  })

  it('captions the escale segments', () => {
    const json = render({ states: ['good', 'current'], stepLabels: ['PAYS', 'DRAPEAU'] })
    expect(json).toContain('PAYS')
    expect(json).toContain('DRAPEAU')
  })
})

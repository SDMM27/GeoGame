import { Text } from 'react-native'
import { act, create } from 'react-test-renderer'

import { AppThemeProvider, setThemePreference, useTheme } from './theme'

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { setItemAsync: jest.fn().mockResolvedValue(undefined) } }))

it('keeps navigation and mounted tabs in the selected theme when switching tabs immediately', () => {
  setThemePreference('dark')
  function Label({ name }: { name: string }) {
    return <Text testID={name}>{useTheme().scheme}</Text>
  }
  let tree!: ReturnType<typeof create>
  function App({ selected }: { selected: 'home' | 'profile' }) {
    return <AppThemeProvider>
      <Label name="navigation" />
      <Text testID="selected">{selected}</Text>
      <Label name="home" />
      <Label name="profile" />
    </AppThemeProvider>
  }
  const expectPalette = (scheme: string) => {
    for (const name of ['navigation', 'home', 'profile']) {
      expect(tree.root.findByProps({ testID: name }).props.children).toBe(scheme)
    }
  }
  act(() => { tree = create(<App selected="profile" />) })
  expectPalette('dark')
  // Change appearance and navigate in the same event, before background work can finish.
  act(() => {
    setThemePreference('light')
    tree.update(<App selected="home" />)
  })
  expectPalette('light')
  act(() => tree.update(<App selected="profile" />))
  expectPalette('light')
  act(() => {
    setThemePreference('dark')
    tree.update(<App selected="home" />)
  })
  expectPalette('dark')
  act(() => tree.unmount())
  setThemePreference('dark')
})

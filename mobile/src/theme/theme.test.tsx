import { Text } from 'react-native'
import { act, create } from 'react-test-renderer'

import { AppThemeProvider, setThemePreference, useTheme, withSkinAccent } from './theme'

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

describe('skin accent', () => {
  const skinAccent = {
    dark: { accent: '#FF9F1C', strong: '#FFB650', ink: '#2A1400' },
    light: { accent: '#B45309', strong: '#923F05', ink: '#FFFFFF' },
  }
  const read = (scheme: 'dark' | 'light', accent: typeof skinAccent | null) => {
    setThemePreference(scheme)
    let colors!: ReturnType<typeof useTheme>['colors']
    function Probe() {
      colors = useTheme().colors
      return null
    }
    let tree!: ReturnType<typeof create>
    act(() => { tree = create(<AppThemeProvider skinAccent={accent}><Probe /></AppThemeProvider>) })
    act(() => tree.unmount())
    return colors
  }
  afterAll(() => setThemePreference('dark'))

  it('recolors the accent in the dark theme with the skin fill, and keeps success', () => {
    const base = read('dark', null)
    const skinned = read('dark', skinAccent)
    expect(skinned.accent).toBe('#FF9F1C')
    expect(skinned.onAccent).toBe('#2A1400')
    expect(skinned.success).toBe(base.success)
    expect(skinned.onSuccess).toBe(base.onSuccess)
  })

  it('uses the stronger shade in the light theme', () => {
    const skinned = read('light', skinAccent)
    expect(skinned.accent).toBe('#923F05')
    expect(skinned.onAccent).toBe('#FFFFFF')
    expect(skinned.success).toBe('#0B7A4C')
  })

  it('leaves the theme alone without a skin accent (classic or turned off)', () => {
    expect(read('dark', null).accent).toBe('#3DDC97')
    expect(read('light', null).accent).toBe('#0B7A4C')
  })

  it('returns the same theme object for the same skin, so styles stay cached', () => {
    const theme = { scheme: 'dark' as const, colors: read('dark', null), gameColors: {} as never }
    expect(withSkinAccent(theme, skinAccent)).toBe(withSkinAccent(theme, skinAccent))
  })
})

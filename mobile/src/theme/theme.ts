// The theme in use: the player's choice (light, dark, or the system's), remembered in the key-value store behind
// localStorage (src/polyfills.ts), and followed live by every screen, without a provider: a small external store, so
// changing it re-renders whoever reads it, and components rendered alone (tests) get the dark default.
import { useSyncExternalStore } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'

import { darkColors, darkGameColors, lightColors, lightGameColors, type GameColors, type Palette } from './palettes'

export type ThemePreference = 'light' | 'dark' | 'system'
export type Theme = { scheme: 'light' | 'dark'; colors: Palette; gameColors: GameColors }

// Same key as the website (@sdmm/design), which stores 'light' or 'dark'; the app adds 'system'.
const STORAGE_KEY = 'sd-theme'
// The website starts dark unless the player chose light: the app does the same.
const DEFAULT: ThemePreference = 'dark'

const isPreference = (value: unknown): value is ThemePreference => value === 'light' || value === 'dark' || value === 'system'

function readStored(): ThemePreference {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    return isPreference(value) ? value : DEFAULT
  } catch {
    return DEFAULT
  }
}

let preference: ThemePreference = readStored()
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setThemePreference(next: ThemePreference) {
  if (next === preference) return
  preference = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next)
  } catch {
    // storage unavailable: the choice lasts until the app closes
  }
  listeners.forEach((listener) => listener())
}

const getPreference = () => preference

/** The player's choice and its setter. */
export function useThemePreference() {
  return [useSyncExternalStore(subscribe, getPreference, getPreference), setThemePreference] as const
}

const THEMES: Record<'light' | 'dark', Theme> = {
  dark: { scheme: 'dark', colors: darkColors, gameColors: darkGameColors },
  light: { scheme: 'light', colors: lightColors, gameColors: lightGameColors },
}

/** The theme in use. */
export function useTheme(): Theme {
  const [chosen] = useThemePreference()
  const system = useColorScheme()
  const scheme = chosen === 'system' ? (system === 'light' ? 'light' : 'dark') : chosen
  return THEMES[scheme]
}

/** The colors of the theme in use. */
export function useColors(): Palette {
  return useTheme().colors
}

type NamedStyles<T> = { [P in keyof T]: StyleSheet.NamedStyles<T>[P] }

/**
 * Styles that depend on the theme: `const useStyles = makeStyles((colors) => ({ … }))` at module level, then
 * `const styles = useStyles()` in the component. Each theme's sheet is built once, the first time it's needed.
 */
export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: Palette, theme: Theme) => T & NamedStyles<T>
): () => T {
  const cache = new Map<Theme, T>()
  return function useStyles() {
    const theme = useTheme()
    let styles = cache.get(theme)
    if (!styles) {
      styles = StyleSheet.create(factory(theme.colors, theme))
      cache.set(theme, styles)
    }
    return styles
  }
}

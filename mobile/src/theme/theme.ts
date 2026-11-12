// The theme in use: the player's choice (light, dark, or the system's), remembered in the key-value store behind
// localStorage (src/polyfills.ts). A provider shares the resolved theme; isolated components can still read the store.
import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { Platform, StyleSheet, useColorScheme } from 'react-native'

import { persistTheme } from './persistence'

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
  listeners.forEach((listener) => listener())
  void persistTheme(next, Platform.OS === 'web')
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

export const ThemeContext = createContext<Theme | null>(null)
const noSubscription = () => () => {}
const defaultPreference = () => DEFAULT

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return createElement(ThemeContext.Provider, { value: theme }, children)
}

/** The theme in use. */
export function useTheme(): Theme {
  const context = useContext(ThemeContext)
  // Share one resolved palette across navigation and every mounted screen.
  const chosen = useSyncExternalStore(context ? noSubscription : subscribe, context ? defaultPreference : getPreference, defaultPreference)
  const system = useColorScheme()
  const scheme = chosen === 'system' ? (system === 'light' ? 'light' : 'dark') : chosen
  return context ?? THEMES[scheme]
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

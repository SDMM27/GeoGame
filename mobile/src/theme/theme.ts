// The theme in use: the player's choice (light, dark, or the system's), remembered in the key-value store behind
// localStorage (src/polyfills.ts). A provider shares the resolved theme; isolated components can still read the store.
import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'

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
  void persistTheme(next)
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

/** A skin's accent colors in one scheme (@shared/utils/globeSkins): `accent` fills, `strong` is accent text on the page, `ink` is text on a fill. */
export type SkinAccent = { accent: string; strong: string; ink: string }
export type SkinAccents = { dark: SkinAccent; light: SkinAccent }

// One theme object per (scheme, skin accent): makeStyles caches its sheets by theme identity.
const recolored = new Map<string, Theme>()

/**
 * The theme with the worn skin's accent: a fill in the dark theme, the darker `strong` shade in the light one (the app's
 * accent is also used as text). `success` and `onSuccess` keep the theme's own green. No skin accent: the theme itself.
 */
export function withSkinAccent(theme: Theme, skinAccent: SkinAccents | null | undefined): Theme {
  const pair = skinAccent?.[theme.scheme]
  if (!pair) return theme
  const accent = theme.scheme === 'dark' ? pair.accent : pair.strong
  const key = `${theme.scheme}:${accent}:${pair.ink}`
  let next = recolored.get(key)
  if (!next) {
    next = { ...theme, colors: { ...theme.colors, accent, onAccent: pair.ink } }
    recolored.set(key, next)
  }
  return next
}

/** `skinAccent`: the accent colors of the skin worn (null: the theme's own). */
export function AppThemeProvider({ children, skinAccent = null }: { children: ReactNode; skinAccent?: SkinAccents | null }) {
  const theme = withSkinAccent(useTheme(), skinAccent)
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

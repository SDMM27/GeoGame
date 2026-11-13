// « Carnet de vol » design tokens, in a dark and a light theme (the light one follows the website's light tokens:
// @sdmm/design themes/geogame.css and src/styles/theme.css). Colors come from the theme in use: useTheme(),
// useColors() or makeStyles() (./theme.ts); fonts, radii and spacing don't change with it.
import { Platform } from 'react-native'

export { AppThemeProvider, makeStyles, withSkinAccent, setThemePreference, useColors, useTheme, useThemePreference } from './theme'
export type { SkinAccents, Theme, ThemePreference } from './theme'
export { darkColors, gameFills, lightColors, darkGameColors, lightGameColors } from './palettes'
export type { GameColors, Palette } from './palettes'

// Bricolage Grotesque has no Cyrillic, Greek, Arabic or CJK letters. iOS and Android fall back to their system font for
// those; a browser falls back to its default serif one, so on the web the display fonts list Inter (Cyrillic, Greek) and
// the system font after it, for names such as « Распути ».
const displayFallback = Platform.OS === 'web' ? ', Inter_600SemiBold, system-ui, sans-serif' : ''

export const fonts = {
  display: `BricolageGrotesque_700Bold${displayFallback}`,
  displayHeavy: `BricolageGrotesque_800ExtraBold${displayFallback}`,
  displayMedium: `BricolageGrotesque_600SemiBold${displayFallback}`,
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

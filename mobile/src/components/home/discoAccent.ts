import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'

import { useTheme } from '@/theme'

export function useDiscoButtonStyle(hue?: SharedValue<number>) {
  const { colors, scheme } = useTheme()
  const accent = colors.accent
  const lightness = scheme === 'dark' ? 72 : 26

  // An explicit fallback clears the previously animated fill when the skin or accent preference changes.
  return useAnimatedStyle(() => ({
    backgroundColor: hue ? `hsl(${hue.get()}, 80%, ${lightness}%)` : accent,
  }))
}

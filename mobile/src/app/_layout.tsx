import '@/polyfills'
import '@/i18n'

import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { useFonts } from 'expo-font'
import { DarkTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { InstallHint } from '@/components/InstallHint'
import { ToastHost } from '@/components/ToastHost'
import { colors } from '@/theme'

SplashScreen.preventAutoHideAsync()

const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="play/[game]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="multi/create"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.75, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen name="multi/[code]" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="game" options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />
        </Stack>
        <InstallHint />
        <ToastHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

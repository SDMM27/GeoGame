import '@/polyfills'
import '@/emulators'
import '@/i18n'

import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { useFonts } from 'expo-font'
import { DarkTheme, router, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { ErrorScreen } from '@/components/ErrorScreen'
import { InstallHint } from '@/components/InstallHint'
import { InviteBanner } from '@/components/InviteBanner'
import { PresenceHeartbeat } from '@/components/PresenceHeartbeat'
import { PushNotifications } from '@/components/PushNotifications'
import { ConfirmHost } from '@/components/ConfirmHost'
import { ToastHost } from '@/components/ToastHost'
import { UpdateBanner } from '@/components/UpdateBanner'
import { WhatsNew } from '@/components/WhatsNew'
import { XpToasts } from '@/components/XpToasts'
import { colors } from '@/theme'
import { useLaunchUpdate } from '@/updates'

SplashScreen.preventAutoHideAsync()

// Game setup sheets. On Android a sheet lays its content out at its full height, so at 75% the footer with the
// create button sat below the visible part (empty space above it, and a drag needed to reach it): open them full there.
const sheetOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: Platform.OS === 'android' ? [1] : [0.75, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
  contentStyle: { backgroundColor: colors.surface },
} as const

const navigationTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
}

// Replaces the whole app when a screen throws (Expo Router error boundary): retry re-renders it, home goes back to the start.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation()
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <ErrorScreen
      icon="alert-circle-outline"
      title={t('mobile.common.error_title')}
      message={t('mobile.common.error_message')}
      actions={[
        { label: t('mobile.common.retry'), onPress: () => void retry() },
        {
          label: t('mobile.common.go_home'),
          variant: 'secondary',
          onPress: () => {
            router.replace('/')
            void retry()
          },
        },
      ]}
    />
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })

  const updateChecked = useLaunchUpdate()

  useEffect(() => {
    if (fontsLoaded && updateChecked) SplashScreen.hideAsync()
  }, [fontsLoaded, updateChecked])

  if (!fontsLoaded || !updateChecked) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="play/[game]"
            options={sheetOptions}
          />
          <Stack.Screen
            name="multi/create"
            options={sheetOptions}
          />
          <Stack.Screen
            name="multi/add"
            options={sheetOptions}
          />
          <Stack.Screen name="multi/[code]" options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="game" options={{ gestureEnabled: false, animation: 'fade_from_bottom' }} />
        </Stack>
        <InstallHint />
        <UpdateBanner />
        <WhatsNew />
        <InviteBanner />
        <PushNotifications />
        <PresenceHeartbeat />
        <ConfirmHost />
        <ToastHost />
        <XpToasts />
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

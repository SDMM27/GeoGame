// Offers to restart when an update was downloaded while the app was open (see updates.ts): without it, the player
// would stay on the old version until the next launch. Also asks to install the new APK when the installed one can no
// longer receive updates (see useNewerApk).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Updates from 'expo-updates'
import { usePathname } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors, radius, space } from '@/theme'
import { APK_URL } from '@/links'
import { updatesEnabled, useNewerApk } from '@/updates'
import { Button, Text, Touchable } from './ui'

export function UpdateBanner() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { isUpdatePending, downloadedUpdate } = Updates.useUpdates()
  const newerApk = useNewerApk()
  // The update the player said "later" to: the banner comes back only for a newer one.
  const [dismissed, setDismissed] = useState<string | null>(null)

  // A new APK outranks an update: the installed APK will get no other.
  const kind = newerApk ? 'apk' : isUpdatePending ? 'update' : null
  const bannerId = kind === 'apk' ? 'apk' : (downloadedUpdate?.updateId ?? null)
  // Never interrupt a game.
  const visible = updatesEnabled && kind != null && bannerId !== dismissed && !pathname.startsWith('/game')
  if (!visible) return null

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.banner, { top: insets.top + space.sm }]}
      accessibilityLiveRegion="polite">
      <View style={styles.icon}>
        <MaterialCommunityIcons name="update" size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {t(kind === 'apk' ? 'mobile.update.apk_title' : 'mobile.update.title')}
        </Text>
        <Text variant="caption">{t(kind === 'apk' ? 'mobile.update.apk_message' : 'mobile.update.message')}</Text>
      </View>
      {kind === 'apk' ? (
        <Button label={t('mobile.update.apk_install')} onPress={() => void Linking.openURL(APK_URL)} style={styles.restart} />
      ) : (
        <Button label={t('mobile.update.restart')} onPress={() => void Updates.reloadAsync()} style={styles.restart} />
      )}
      <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.update.later')} onPress={() => setDismissed(bannerId)} style={styles.close}>
        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
      </Touchable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: `${colors.accent}88`,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.accent}22` },
  restart: { minHeight: 38, paddingHorizontal: space.md },
  close: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
})

// iPhone in the browser: explains how to add the web app to the home screen from Safari,
// where it opens full screen like a native app. Hidden once installed or dismissed.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SITE_ORIGIN } from '@/links'
import { colors, radius, space } from '@/theme'
import { Text } from './ui'

const DISMISSED_KEY = 'install_hint_dismissed'
// Keeps the guide above the bottom tab bar ((tabs)/_layout.web.tsx).
const TAB_BAR_CLEARANCE = 64

// Other iOS browsers and in-app browsers (Instagram, Facebook…) can't reliably add to the home screen.
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Snapchat|TikTok/

function shouldShow() {
  if (typeof window === 'undefined') return false
  const standalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  if (!/iPhone/.test(window.navigator.userAgent) || standalone) return false
  try {
    return window.localStorage.getItem(DISMISSED_KEY) !== '1'
  } catch {
    return true
  }
}

const STEPS = [
  { icon: 'apple-safari', key: 'step_safari' },
  { icon: 'export-variant', key: 'step_share' },
  { icon: 'plus-box-outline', key: 'step_add' },
  { icon: 'check-circle-outline', key: 'step_done' },
] as const

export function InstallHint() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [visible, setVisible] = useState(shouldShow)
  if (!visible) return null
  const inSafari = !NOT_SAFARI.test(window.navigator.userAgent)

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1')
    } catch {}
    setVisible(false)
  }

  return (
    <View style={[styles.card, { bottom: insets.bottom + TAB_BAR_CLEARANCE }]} accessibilityRole="alert">
      <View style={styles.header}>
        <Text variant="heading" style={{ flex: 1 }}>
          {t('mobile.install.title')}
        </Text>
        <Pressable onPress={dismiss} hitSlop={12} accessibilityLabel={t('mobile.install.close')}>
          <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text variant="caption">{t('mobile.install.subtitle')}</Text>
      <Text variant="caption">{t('mobile.install.push_hint')}</Text>
      {!inSafari && (
        <Text variant="bodyStrong" color={colors.warning} style={{ fontSize: 14 }}>
          {t('mobile.install.not_safari')}
        </Text>
      )}
      {STEPS.map((step, index) => (
        <View key={step.key} style={styles.step}>
          <View style={styles.badge}>
            <Text variant="bodyStrong" color={colors.onAccent} style={{ fontSize: 13 }}>
              {index + 1}
            </Text>
          </View>
          <MaterialCommunityIcons name={step.icon} size={20} color={colors.accent} />
          <Text style={{ flex: 1 }}>{t(`mobile.install.${step.key}`)}</Text>
        </View>
      ))}
      {/* The website only sends iPhone visitors here once, so going back is for good. */}
      <Pressable onPress={() => window.location.assign(SITE_ORIGIN)} hitSlop={8} style={styles.siteLink} accessibilityRole="link">
        <Text variant="caption" style={{ textDecorationLine: 'underline' }}>
          {t('mobile.install.back_to_site')}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    zIndex: 90,
    gap: space.sm,
    padding: space.lg,
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.lg,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  siteLink: { alignSelf: 'center', marginTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
})

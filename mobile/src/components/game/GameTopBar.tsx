import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { navigate } from '@/shims/react-router-dom'
import { colors, radius, space } from '@/theme'
import { confirmAction } from '../confirm'
import { Text, Touchable } from '../ui'

export function HudPill({ icon, label, color = colors.text }: { icon?: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color?: string }) {
  return (
    <View style={styles.pill}>
      {icon && <MaterialCommunityIcons name={icon} size={15} color={colors.textMuted} />}
      <Text variant="bodyStrong" color={color} style={{ fontSize: 14, fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </View>
  )
}

// Floating top bar: close (with confirmation) + HUD pills.
export function GameTopBar({ children, confirmQuit = true, onQuit }: { children?: ReactNode; confirmQuit?: boolean; onQuit?: () => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const quit = onQuit ?? (() => navigate('/'))

  const onClose = () => {
    if (!confirmQuit) return quit()
    confirmAction({
      title: t('mobile.game.quit_title'),
      message: t('mobile.game.quit_message'),
      confirmLabel: t('mobile.game.quit'),
      cancelLabel: t('mobile.game.cancel'),
      icon: 'exit-run',
      onConfirm: quit,
    })
  }

  // Android back (button or edge swipe, easy to hit while panning the map) goes through the same confirmation as the close button.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onCloseRef.current()
        return true
      })
      return () => sub.remove()
    }, []),
  )

  return (
    <View pointerEvents="box-none" style={[styles.bar, { top: insets.top + space.sm }]}>
      <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.game.quit')} onPress={onClose} style={styles.close}>
        <MaterialCommunityIcons name="close" size={22} color={colors.text} />
      </Touchable>
      <View pointerEvents="box-none" style={styles.pills}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, zIndex: 10 },
  close: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,16,32,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,16,32,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },
})

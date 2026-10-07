// Renders toasts raised by the shared hooks through the react-toastify shim.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { subscribeToasts, type ToastKind, type ToastMessage } from '@/shims/react-toastify'
import { colors, radius, space } from '@/theme'
import { Text } from './ui'

const KIND_STYLE: Record<ToastKind, { color: string; icon: 'check-circle' | 'close-circle' | 'information' | 'alert' }> = {
  success: { color: colors.accent, icon: 'check-circle' },
  error: { color: colors.danger, icon: 'close-circle' },
  info: { color: colors.highlight, icon: 'information' },
  warning: { color: colors.warning, icon: 'alert' },
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const insets = useSafeAreaInsets()
  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + space.sm }]}>
      {toasts.map((toast) => {
        const kind = KIND_STYLE[toast.kind]
        return (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
            layout={LinearTransition.springify()}
            style={styles.toast}
            accessibilityLiveRegion="polite">
            <MaterialCommunityIcons name={kind.icon} size={18} color={kind.color} />
            <Text variant="bodyStrong" style={{ flexShrink: 1, fontSize: 14 }}>
              {toast.text}
            </Text>
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', gap: space.sm, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    maxWidth: '100%',
  },
})

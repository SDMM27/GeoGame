// Renders the confirmation dialogs raised with confirmAction(), instead of the plain system alert.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'

import { colors, radius, space } from '@/theme'
import { subscribeConfirm, type ConfirmRequest } from './confirm'
import { Button, Text } from './ui'

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  useEffect(() => subscribeConfirm(setRequest), [])

  const close = () => setRequest(null)
  const confirm = () => {
    const onConfirm = request?.onConfirm
    setRequest(null)
    onConfirm?.()
  }

  const tint = request?.destructive ? colors.danger : colors.accent
  const icon = request?.icon ?? (request?.destructive ? 'alert-circle-outline' : 'help-circle-outline')

  return (
    <Modal transparent statusBarTranslucent visible={request !== null} animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={request?.cancelLabel}>
        {request && (
          <Animated.View entering={ZoomIn.springify().damping(18).stiffness(220)} style={styles.card}>
            <Pressable onPress={(event) => event.stopPropagation()} style={styles.content} accessibilityRole="alert">
              <View style={[styles.iconWrap, { backgroundColor: `${tint}1F`, borderColor: `${tint}40` }]}>
                <MaterialCommunityIcons name={icon} size={28} color={tint} />
              </View>
              <Text variant="heading" style={styles.center}>
                {request.title}
              </Text>
              {request.message ? (
                <Text variant="body" color={colors.textMuted} style={styles.center}>
                  {request.message}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button label={request.cancelLabel} variant="secondary" onPress={close} style={{ flex: 1 }} />
                <Button label={request.confirmLabel} variant={request.destructive ? 'danger' : 'primary'} onPress={confirm} style={{ flex: 1 }} />
              </View>
            </Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(3, 6, 14, 0.72)' },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  content: { alignItems: 'center', gap: space.sm, padding: space.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
})

// Confirmation dialog: native alert, or the browser's confirm() on the web build (Alert does nothing there).
import { Alert, Platform } from 'react-native'

export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  onConfirm: () => void
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message ? `${title}\n\n${message}` : title)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ])
}

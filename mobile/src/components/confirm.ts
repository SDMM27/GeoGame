// Destructive confirmation: native alert, or the browser's confirm() on the web build (Alert does nothing there).
import { Alert, Platform } from 'react-native'

export function confirmAction({ title, confirmLabel, cancelLabel, onConfirm }: { title: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void }) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(title)) onConfirm()
    return
  }
  Alert.alert(title, undefined, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ])
}

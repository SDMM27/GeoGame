// Confirmation dialog, drawn in the app's style by ConfirmHost (mounted once in the root layout).
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

export type ConfirmRequest = {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  onConfirm: () => void
}

type Listener = (request: ConfirmRequest | null) => void

let listener: Listener | null = null

export function subscribeConfirm(next: Listener) {
  listener = next
  return () => {
    if (listener === next) listener = null
  }
}

export function confirmAction(request: ConfirmRequest) {
  listener?.({ destructive: true, ...request })
}

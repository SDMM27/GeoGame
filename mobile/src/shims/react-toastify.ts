// Mobile stand-in for react-toastify, used by the shared game hooks in ../src.
// Toasts are pushed to a small store rendered by <ToastHost />, with haptic feedback.
import * as Haptics from 'expo-haptics'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'
// `flag` (an image source) and `color` dress a toast, e.g. for an unlocked flag.
export type ToastMessage = { id: number; kind: ToastKind; text: string; flag?: number; color?: string }

type Listener = (toasts: ToastMessage[]) => void

const MAX_VISIBLE = 3
const DURATION_MS = 2200

let toasts: ToastMessage[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener(toasts))
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  listener(toasts)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id)
  emit()
}

const HAPTICS: Record<ToastKind, () => void> = {
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  info: () => Haptics.selectionAsync(),
}

function show(kind: ToastKind, content: unknown, extra: { flag?: number; color?: string } = {}) {
  const id = nextId++
  toasts = [...toasts, { id, kind, text: String(content ?? ''), ...extra }].slice(-MAX_VISIBLE)
  emit()
  HAPTICS[kind]()
  setTimeout(() => dismissToast(id), DURATION_MS)
  return id
}

type ToastFn = ((content: unknown, options?: unknown) => number) & {
  success: (content: unknown, options?: unknown) => number
  error: (content: unknown, options?: unknown) => number
  info: (content: unknown, options?: unknown) => number
  warn: (content: unknown, options?: unknown) => number
  warning: (content: unknown, options?: unknown) => number
  dismiss: (id?: number) => void
}

export const toast = Object.assign((content: unknown) => show('info', content), {
  success: (content: unknown) => show('success', content),
  error: (content: unknown) => show('error', content),
  info: (content: unknown) => show('info', content),
  warn: (content: unknown) => show('warning', content),
  warning: (content: unknown) => show('warning', content),
  dismiss: (id?: number) => {
    if (id == null) {
      toasts = []
      emit()
    } else dismissToast(id)
  },
}) as ToastFn

// A success toast with a small flag, in `color` (the app only: the site has no equivalent).
export function showFlagToast(content: string, flag: number | null, color?: string) {
  return show('success', content, { flag: flag ?? undefined, color })
}

// The web app renders <ToastContainer />; on mobile <ToastHost /> lives in the root layout.
export function ToastContainer() {
  return null
}

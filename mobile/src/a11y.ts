// Spoken announcement for screen readers (VoiceOver / TalkBack); the web variant lives in a11y.web.ts.
import { AccessibilityInfo } from 'react-native'

export function announce(message: string) {
  if (message) AccessibilityInfo.announceForAccessibility(message)
}

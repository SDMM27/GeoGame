// Asks for notifications at each launch while they're off, once the player is signed in; never once they're on.
// Once they've been refused, the how-to-unblock note shows only once.
// Web: Safari only shows the permission prompt from a tap, so this dialog holds the button. Native: the app shows the
// system prompt by itself (push.ts), so this only comes up once it's been refused, with a shortcut to the settings.
// Never over a game, nor on a launch where the "what's new" dialog shows.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'

import { useAccount } from '@/account/auth'
import { usePushPermission } from '@/notifications/push'
import { colors, radius, space } from '@/theme'
import { Button, Text } from './ui'
import { whatsNewAtLaunch } from './WhatsNew'

const DENIED_SEEN_KEY = 'push_prompt_denied_seen'
// Lets the app settle before the dialog shows up.
const SHOW_DELAY_MS = 1500

function deniedSeen() {
  try {
    return globalThis.localStorage?.getItem(DENIED_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function NotificationPrompt() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { account } = useAccount()
  const { state, enable, openSettings } = usePushPermission(account?.username ? account.uid : null)
  const [open, setOpen] = useState(false)
  const [closed, setClosed] = useState(false)
  // Read once at launch, so a refusal in this dialog still gets its note right away.
  const [skipDenied] = useState(deniedSeen)

  const signedIn = !!account?.username
  const inGame = pathname.startsWith('/game')
  const off = state === 'default' || (state === 'denied' && !skipDenied)
  const eligible = signedIn && !closed && !whatsNewAtLaunch && !inGame && off

  useEffect(() => {
    if (!eligible || open) return
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [eligible, open])

  const visible = open && !closed && !inGame && off
  const denied = state === 'denied'

  // The ask comes back at the next launch, the note never does.
  const close = () => {
    if (denied) {
      try {
        globalThis.localStorage?.setItem(DENIED_SEEN_KEY, '1')
      } catch {}
    }
    setClosed(true)
  }
  // No await before enable(): it starts Notification.requestPermission() inside the tap, as Safari requires.
  const turnOn = () => {
    enable().catch((error) => console.warn('[push]', error?.code, error))
  }

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify().damping(18).stiffness(220)} style={styles.card}>
          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={denied ? 'bell-off-outline' : 'bell-ring-outline'} size={30} color={colors.accent} />
            </View>
            <Text variant="heading" style={styles.center}>
              {t(denied ? 'mobile.push_prompt.denied_title' : 'mobile.push_prompt.title')}
            </Text>
            <Text variant="body" color={colors.textMuted} style={styles.center}>
              {t(denied ? 'mobile.invites.push_denied' : 'mobile.push_prompt.message')}
            </Text>
            {denied && !openSettings ? (
              <Button label={t('mobile.push_prompt.ok')} onPress={close} style={styles.button} />
            ) : denied && openSettings ? (
              <>
                <Button
                  label={t('mobile.push_prompt.open_settings')}
                  onPress={() => {
                    openSettings()
                    close()
                  }}
                  style={styles.button}
                />
                <Button label={t('mobile.push_prompt.later')} variant="ghost" onPress={close} />
              </>
            ) : (
              <>
                <Button label={t('mobile.push_prompt.enable')} onPress={turnOn} style={styles.button} />
                <Button label={t('mobile.push_prompt.later')} variant="ghost" onPress={close} />
              </>
            )}
          </View>
        </Animated.View>
        {/* Tapping outside dismisses it like the buttons would */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('mobile.push_prompt.later')} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(3, 6, 14, 0.72)' },
  card: {
    zIndex: 1,
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
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    backgroundColor: `${colors.accent}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space.xs,
  },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: space.md },
})

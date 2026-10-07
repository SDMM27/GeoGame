// Pops up anywhere in the app when a friend invites the player to a room.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as Haptics from 'expo-haptics'
import { usePathname } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAccount } from '@/account/auth'
import { getGame } from '@/games'
import { acceptInvite, useInvites } from '@/multiplayer/invites'
import { colors, radius, space } from '@/theme'
import { Button, Text, Touchable } from './ui'

export function InviteBanner() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { account } = useAccount()
  const invites = useInvites(account?.uid)
  // Invites already shown (or closed) in this session: the banner only announces new ones.
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const buzzedRef = useRef<string | null>(null)

  // Never interrupt a game. Not needed in the invited room, nor on the Multi tab, which lists the invites.
  const hidden = pathname.startsWith('/game') || pathname === '/multiplayer'
  const invite = invites.find((item) => !seen.has(`${item.id}:${item.at}`) && pathname !== `/multi/${item.room}`)
  const game = invite ? getGame(invite.gameId) : null
  const visible = !!invite && !!game && !hidden

  useEffect(() => {
    if (visible && buzzedRef.current !== invite.id) {
      buzzedRef.current = invite.id
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [visible, invite])

  if (!visible) return null

  const hide = () => setSeen((previous) => new Set(previous).add(`${invite.id}:${invite.at}`))

  return (
    <Animated.View
      key={invite.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.banner, { top: insets.top + space.sm, borderColor: `${game.color}88` }]}
      accessibilityLiveRegion="polite">
      <View style={[styles.icon, { backgroundColor: `${game.color}22` }]}>
        <MaterialCommunityIcons name={game.icon} size={22} color={game.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {t('mobile.invites.banner', { username: invite.fromUsername, game: t(game.titleKey) })}
        </Text>
        <Text variant="caption">{t(invite.mode === 'live' ? 'mobile.multi.live' : 'mobile.multi.challenge')}</Text>
      </View>
      <Button
        label={t('mobile.multi.join')}
        color={game.color}
        onPress={() => {
          hide()
          acceptInvite(invite)
        }}
        style={styles.join}
      />
      <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.invites.later')} onPress={hide} style={styles.close}>
        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
      </Touchable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    zIndex: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  join: { minHeight: 38, paddingHorizontal: space.md },
  close: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
})

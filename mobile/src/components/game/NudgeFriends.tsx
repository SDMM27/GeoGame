// End of a daily challenge: one tap sends a friend a "come and beat me" notification (api/daily-nudge).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { nudgeFriend } from '@shared/utils/dailyNudge'

import { useAccount } from '@/account/auth'
import { colors, radius, space } from '@/theme'
import { Avatar } from '../profile/ProfileSections'
import { Text, Touchable } from '../ui'

type Friend = { uid: string; username: string }
type Result = Awaited<ReturnType<typeof nudgeFriend>>
type State = 'sending' | Result

export function NudgeFriends({ gameType }: { gameType: string }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const { friends } = useFriendships(account?.uid) as { friends: Friend[] }
  const [states, setStates] = useState<Record<string, State>>({})

  if (!friends.length) return null

  const send = async (friend: Friend) => {
    setStates((current) => ({ ...current, [friend.uid]: 'sending' }))
    const result = await nudgeFriend(friend.uid, gameType)
    setStates((current) => ({ ...current, [friend.uid]: result }))
  }

  // One line under the chips for the last answer worth explaining.
  const failed = friends.find((friend) => ['unreachable', 'already_sent', 'rate_limited', 'error', 'not_played'].includes(states[friend.uid] ?? ''))
  const failure = failed ? states[failed.uid] : null
  const failureText =
    failed && failure
      ? failure === 'unreachable'
        ? t('mobile.nudge.unreachable', { username: failed.username })
        : failure === 'already_sent' || failure === 'rate_limited'
          ? t(`mobile.nudge.${failure}`)
          : t('mobile.nudge.error')
      : null

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('mobile.nudge.title')}</Text>
      <Text variant="caption">{t('mobile.nudge.hint')}</Text>
      <View style={styles.chips}>
        {friends.map((friend) => {
          const state = states[friend.uid]
          const done = state === 'sent'
          return (
            <Touchable
              key={friend.uid}
              disabled={state === 'sending' || done}
              onPress={() => send(friend)}
              accessibilityRole="button"
              accessibilityLabel={`${t('mobile.nudge.title')} ${friend.username}`}
              style={[styles.chip, done && { borderColor: colors.accent }]}>
              <Avatar username={friend.username} size={28} />
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {friend.username}
              </Text>
              {state === 'sending' ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : done ? (
                <MaterialCommunityIcons name="check" size={18} color={colors.accent} />
              ) : (
                <MaterialCommunityIcons name="bell-ring-outline" size={18} color={colors.textMuted} />
              )}
            </Touchable>
          )
        })}
      </View>
      {Object.values(states).includes('sent') && !failureText && (
        <Text variant="caption" color={colors.accent}>
          {t('mobile.nudge.sent')}
        </Text>
      )}
      {failureText && (
        <Text variant="caption" color={colors.warning}>
          {failureText}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    maxWidth: '100%',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
})

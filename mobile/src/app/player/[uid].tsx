// Another player's profile: stats, achievements, history, and the friend button.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { acceptFriendRequest, fetchPlayer, friendErrorKey, removeFriendship, sendFriendRequest } from '@shared/utils/friends'

import { useAccount } from '@/account/auth'
import { confirmAction } from '@/components/confirm'
import { Avatar, ProfileBody } from '@/components/profile/ProfileSections'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Player = { uid: string; username: string; createdAt: number | null }
type Friendship = { id: string; uid: string; username: string; status: 'friend' | 'incoming' | 'outgoing' }

function FriendAction({ player }: { player: Player }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!account?.username || account.uid === player.uid || friendships.loading) return null
  const me = { uid: account.uid, username: account.username }
  const link = friendships.all.find((item: Friendship) => item.uid === player.uid) as Friendship | undefined

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(t(`friends.errors.${friendErrorKey(err)}`))
    }
    setBusy(false)
  }

  return (
    <View style={{ gap: space.sm }}>
      {!link && (
        <Button
          label={t('friends.add_friend')}
          loading={busy}
          onPress={() => run(() => sendFriendRequest(me, player.username, friendships.all))}
          icon={<MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.onAccent} />}
        />
      )}
      {link?.status === 'incoming' && (
        <Button label={t('friends.accept_request')} loading={busy} onPress={() => run(() => acceptFriendRequest(link.id))} />
      )}
      {link?.status === 'outgoing' && (
        <Button label={`${t('friends.request_sent')} · ${t('friends.cancel')}`} variant="secondary" loading={busy} onPress={() => run(() => removeFriendship(link.id))} />
      )}
      {link?.status === 'friend' && (
        <Button
          label={t('friends.remove')}
          variant="ghost"
          onPress={() =>
            confirmAction({
              title: t('friends.remove_confirm', { username: player.username }),
              confirmLabel: t('friends.remove'),
              cancelLabel: t('account.cancel'),
              onConfirm: () => run(() => removeFriendship(link.id)),
            })
          }
        />
      )}
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
    </View>
  )
}

export default function PlayerScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { uid } = useLocalSearchParams<{ uid: string }>()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)

  useEffect(() => {
    fetchPlayer(uid)
      .then(setPlayer)
      .catch(() => setPlayer(null))
  }, [uid])

  const isFriend = friendships.friends.some((item: Friendship) => item.uid === uid)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}>
      <ScreenHeader title={player?.username ?? ''} />
      {player === undefined ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : player === null ? (
        <Text variant="caption">{t('profile.not_found')}</Text>
      ) : (
        <>
          <View style={styles.header}>
            <Avatar username={player.username} size={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="heading" numberOfLines={1}>
                {player.username}
              </Text>
              {player.createdAt && (
                <Text variant="caption">
                  {t('profile.member_since', { date: new Date(player.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }) })}
                </Text>
              )}
              {isFriend && (
                <View style={styles.friendPill}>
                  <MaterialCommunityIcons name="account-check" size={14} color={colors.accent} />
                  <Text variant="caption" color={colors.accent} style={{ fontSize: 12 }}>
                    {t('friends.is_friend')}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <FriendAction player={player} />
          <ProfileBody
            uid={player.uid}
            onSeeHistory={() => router.push({ pathname: '/history', params: { uid: player.uid, username: player.username } })}
          />
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  friendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: `${colors.accent}1F`,
    marginTop: space.xs,
  },
})

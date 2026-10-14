// Invitation link (/add/<username>): sends the friend request in one tap. A visitor is sent to create an account
// first, and the invitation waits for them in their Friends screen.
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { findPlayer } from '@shared/utils/friends'
import { setPendingInvite } from '@shared/utils/inviteLink'

import { useAccount } from '@/account/auth'
import { FriendAction } from '@/components/profile/FriendAction'
import { Avatar } from '@/components/profile/ProfileSections'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Player = { uid: string; username: string }

export default function AddFriendScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { username } = useLocalSearchParams<{ username: string }>()
  const { account, loading } = useAccount()
  const [player, setPlayer] = useState<Player | null | undefined>(undefined)

  useEffect(() => {
    findPlayer(username)
      .then(setPlayer)
      .catch(() => setPlayer(null))
  }, [username])

  const visitor = !loading && !account?.username
  useEffect(() => {
    if (player && visitor) setPendingInvite(player.username)
  }, [player, visitor])

  const own = Boolean(player && account?.uid === player.uid)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}>
      <ScreenHeader title="GeoGame" />
      {player === undefined || loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : player === null ? (
        <Text variant="caption">{t('friends.add_page.not_found')}</Text>
      ) : (
        <View style={styles.card}>
          <Avatar username={player.username} size={72} />
          <Text variant="heading">{player.username}</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {t('friends.add_page.intro', { username: player.username })}
          </Text>
          {own && (
            <Text variant="caption" color={colors.accent} style={{ textAlign: 'center' }}>
              {t('friends.add_page.own')}
            </Text>
          )}
          {visitor && (
            <>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {t('friends.add_page.login')}
              </Text>
              <Button label={t('friends.add_page.login_button')} onPress={() => router.replace('/profile')} style={{ alignSelf: 'stretch' }} />
            </>
          )}
          {!own && !visitor && (
            <View style={{ alignSelf: 'stretch' }}>
              <FriendAction player={player} />
            </View>
          )}
          {!own && (
            <Button
              label={t('friends.add_page.view_profile')}
              variant="ghost"
              onPress={() => router.push({ pathname: '/player/[uid]', params: { uid: player.uid } })}
            />
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
})

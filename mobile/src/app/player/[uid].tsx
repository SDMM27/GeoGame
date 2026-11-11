// Another player's profile: stats, achievements, history, and the friend button.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useDecoration } from '@shared/hooks/useDecoration'
import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { decorationStyle } from '@shared/utils/decorations'
import { fetchPlayer } from '@shared/utils/friends'

import { useAccount } from '@/account/auth'
import { FriendAction } from '@/components/profile/FriendAction'
import { FlagCollection } from '@/components/profile/FlagCollection'
import { ScrollCollection } from '@/components/profile/ScrollCollection'
import { LevelBar } from '@/components/profile/LevelBar'
import { Avatar, ProfileBody } from '@/components/profile/ProfileSections'
import { Kicker, ScreenTitle } from '@/components/flight'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Text } from '@/components/ui'
import { makeStyles, radius, space, useColors } from '@/theme'

type Player = { uid: string; username: string; createdAt: number | null }
type Friendship = { id: string; uid: string; username: string; status: 'friend' | 'incoming' | 'outgoing' }

export default function PlayerScreen() {
  const styles = useStyles()
  const colors = useColors()
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const { uid } = useLocalSearchParams<{ uid: string }>()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const decoration = useDecoration(uid)
  const { nameColor } = decorationStyle(decoration)
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
          <View style={styles.passport}>
          <View style={styles.passportHead}>
            <Kicker>{t('profile.passport')}</Kicker>
            <Kicker>{t('mp_room.col_player')}</Kicker>
          </View>
          <View style={styles.header}>
            <Avatar username={player.username} size={72} decoration={decoration} />
            <View style={{ flex: 1, gap: 2 }}>
              <ScreenTitle size={26} numberOfLines={1} color={nameColor ?? undefined}>
                {player.username}
              </ScreenTitle>
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
          <View style={styles.level}>
            <LevelBar uid={player.uid} />
          </View>
          </View>
          <FriendAction player={player} />
          <ProfileBody
            uid={player.uid}
            collection={
              <>
                <FlagCollection uid={player.uid} />
                <ScrollCollection uid={player.uid} />
              </>
            }
            onSeeHistory={() => router.push({ pathname: '/history', params: { uid: player.uid, username: player.username } })}
          />
        </>
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles((colors) => ({
  passport: { gap: space.lg, paddingBottom: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  passportHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.board, borderBottomWidth: 1, borderBottomColor: colors.boardLine },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg },
  level: { paddingHorizontal: space.lg },
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
}))

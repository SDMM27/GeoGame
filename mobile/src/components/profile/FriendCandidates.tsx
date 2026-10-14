// Players to add as friends (search results, players met in rooms, the community): one row each with the right
// button for where the two accounts stand.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { friendErrorKey, sendFriendRequestTo } from '@shared/utils/friends'

import { type Account } from '@/account/auth'
import { BadgeStrip, type PlayerBadges } from '@/components/profile/BadgeStrip'
import { Avatar } from '@/components/profile/ProfileSections'
import { Button, Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

// `rank` and `detail` (e.g. "12 pts") are for leaderboards.
export type Candidate = { uid: string; name: string; badges?: PlayerBadges; rank?: number; detail?: string }
type Friendship = { id: string; uid: string; username: string; status: 'friend' | 'incoming' | 'outgoing' }
export type FriendshipsState = { all: Friendship[] }
export type CandidateMessage = { kind: 'error' | 'notice'; text: string }

function CandidateButton({
  account,
  friendships,
  uid,
  onMessage,
}: {
  account: Account
  friendships: FriendshipsState
  uid: string
  onMessage?: (message: CandidateMessage) => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const status = friendships.all.find((item) => item.uid === uid)?.status
  if (uid === account.uid || !account.username) return null
  if (status === 'friend' || status === 'outgoing') {
    return (
      <View style={styles.state}>
        <MaterialCommunityIcons name="check" size={16} color={colors.textMuted} />
        <Text variant="caption">{t(status === 'friend' ? 'friends.is_friend' : 'friends.request_sent')}</Text>
      </View>
    )
  }

  const add = async () => {
    setBusy(true)
    try {
      const player = await sendFriendRequestTo({ uid: account.uid, username: account.username as string }, uid, friendships.all)
      onMessage?.({ kind: 'notice', text: t(status === 'incoming' ? 'friends.now_friends' : 'friends.sent', { username: player.username }) })
    } catch (error) {
      onMessage?.({ kind: 'error', text: t(`friends.errors.${friendErrorKey(error)}`) })
    }
    setBusy(false)
  }

  return <Button label={t(status === 'incoming' ? 'friends.accept' : 'friends.add')} onPress={add} loading={busy} style={styles.smallButton} />
}

// `account` is the signed-in one, or null for a visitor (the list is then read-only).
export function FriendCandidates({
  players,
  account,
  friendships,
  onMessage,
}: {
  players: Candidate[]
  account: Account | null
  friendships: FriendshipsState
  onMessage?: (message: CandidateMessage) => void
}) {
  if (players.length === 0) return null
  return (
    <View style={styles.list}>
      {players.map((player, index) => (
        <View key={player.uid} style={[styles.row, index > 0 && styles.divider]}>
          {player.rank != null ? (
            <Text variant="bodyStrong" color={colors.textMuted} style={styles.rank}>
              {player.rank}
            </Text>
          ) : null}
          <Touchable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/player/[uid]', params: { uid: player.uid } })}
            style={styles.who}>
            <Avatar username={player.name} size={40} />
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {player.name}
            </Text>
            <BadgeStrip badges={player.badges} />
          </Touchable>
          {player.detail ? <Text variant="caption">{player.detail}</Text> : null}
          {account?.username ? <CandidateButton account={account} friendships={friendships} uid={player.uid} onMessage={onMessage} /> : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minWidth: 0 },
  rank: { width: 24, textAlign: 'center' },
  smallButton: { minHeight: 38, paddingHorizontal: space.md },
  state: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
})

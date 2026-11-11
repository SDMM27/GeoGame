// Players to add as friends (search results, players met in rooms, the community): one row each with the right
// button for where the two accounts stand.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { friendErrorKey, sendFriendRequestTo } from '@shared/utils/friends'

import { type Account } from '@/account/auth'
import { Kicker } from '@/components/flight'
import { BadgeStrip, type PlayerBadges } from '@/components/profile/BadgeStrip'
import { Avatar } from '@/components/profile/ProfileSections'
import { Button, Text, Touchable } from '@/components/ui'
import { colors, fonts, radius, space } from '@/theme'

// `rank` and `detail` (e.g. "12 pts") are for leaderboards; `reward` is the flag fragments the rank pays (league).
export type Candidate = { uid: string; name: string; badges?: PlayerBadges; rank?: number; detail?: string; reward?: number }
// A band of ranks `fromRank`..`toRank` of a ranked list (league: podium, fragments): its header is drawn above its first player.
export type Zone = { fromRank: number; toRank?: number; label: string; note: string; color: string }
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
  zones,
}: {
  players: Candidate[]
  account: Account | null
  friendships: FriendshipsState
  onMessage?: (message: CandidateMessage) => void
  zones?: Zone[]
}) {
  const { t } = useTranslation()
  if (players.length === 0) return null
  // The zone each player opens: the last one whose first rank is reached, shown once
  const zoneOf = (player: Candidate) => (player.rank == null ? undefined : [...(zones ?? [])].reverse().find((zone) => player.rank! >= zone.fromRank && player.rank! <= (zone.toRank ?? Infinity)))
  return (
    <View style={styles.list}>
      {players.map((player, index) => {
        const zone = zoneOf(player)
        const header = zone && zone !== (index > 0 ? zoneOf(players[index - 1]) : undefined) ? zone : null
        const mine = account?.uid === player.uid
        return (
        <View key={player.uid}>
        {header && (
          <View style={[styles.zone, { backgroundColor: `${header.color}14` }]}>
            <Kicker color={header.color} size={9}>
              {header.label}
            </Kicker>
            <Kicker color={header.color} size={9}>
              {header.note}
            </Kicker>
          </View>
        )}
        <View style={[styles.row, index > 0 && !header && styles.divider, mine && { backgroundColor: `${colors.accent}14`, borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
          {player.rank != null ? (
            <Text style={[styles.rank, { color: zone?.color ?? colors.textMuted }]}>
              {player.rank}
            </Text>
          ) : null}
          <Touchable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/player/[uid]', params: { uid: player.uid } })}
            style={styles.who}>
            <Avatar username={player.name} size={40} />
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }} color={mine ? colors.accent : colors.text}>
              {player.name}
            </Text>
            {mine && <Kicker size={8}>{t('mobile.flight.you')}</Kicker>}
            <BadgeStrip badges={player.badges} />
          </Touchable>
          {player.reward ? (
            <View style={styles.reward} accessible accessibilityLabel={`+${player.reward}`}>
              <MaterialCommunityIcons name="flag-variant" size={12} color={zone?.color ?? colors.accent} />
              <Text style={[styles.detail, { color: zone?.color ?? colors.accent }]}>+{player.reward}</Text>
            </View>
          ) : null}
          {player.detail ? <Text style={[styles.detail, { color: colors.gold }]}>{player.detail}</Text> : null}
          {account?.username ? <CandidateButton account={account} friendships={friendships} uid={player.uid} onMessage={onMessage} /> : null}
        </View>
        </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.lg, backgroundColor: colors.board, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minWidth: 0 },
  rank: { width: 24, textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 14 },
  zone: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: 7 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detail: { fontFamily: fonts.monoBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  smallButton: { minHeight: 38, paddingHorizontal: space.md },
  state: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
})

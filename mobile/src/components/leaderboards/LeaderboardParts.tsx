// Pieces shared by the lists of the Rankings tab: filter chips, a row, and the loading / empty / error states.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'

import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { sendFriendRequestTo } from '@shared/utils/friends'

import { loadErrorKey, rankLabel } from '@/leaderboards'
import { colors, radius, space } from '@/theme'
import { Text, Touchable } from '../ui'
import { DecoratedName } from './DecoratedName'
import { ReportFlag, type ReportTarget } from './ReportFlag'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type Chip = { value: string; label: string; color?: string; icon?: IconName }

// One horizontally scrolling row of exclusive choices.
export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: Chip[]
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {options.map((option) => {
          const active = option.value === value
          const color = option.color ?? colors.accent
          return (
            <Touchable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={[styles.chip, active && { borderColor: color, backgroundColor: `${color}1F` }]}>
              {option.icon ? <MaterialCommunityIcons name={option.icon} size={16} color={active ? color : colors.textMuted} /> : null}
              <Text variant="bodyStrong" style={{ fontSize: 13 }} color={active ? colors.text : colors.textMuted}>
                {option.label}
              </Text>
            </Touchable>
          )
        })}
      </ScrollView>
    </View>
  )
}

type Me = { uid: string; username: string | null } | null

// "+" next to another player's name: sends them a friend request (or accepts theirs). Gone once you are friends.
// One shared Firestore listener serves every row (see watchSharedFriendships).
function QuickAdd({ me, uid, name }: { me: { uid: string; username: string }; uid: string; name: string }) {
  const { t } = useTranslation()
  const friendships = useFriendships(me.uid)
  const [failed, setFailed] = useState(false)
  if (friendships.loading) return null
  const status = friendships.all.find((item: { uid: string }) => item.uid === uid)?.status
  if (status === 'friend') return null
  if (status === 'outgoing') return <MaterialCommunityIcons name="check" size={18} color={colors.textMuted} style={styles.quickAdd} />

  const add = async () => {
    try {
      await sendFriendRequestTo(me, uid, friendships.all)
      setFailed(false)
    } catch (error) {
      console.warn('[friends]', error)
      setFailed(true)
    }
  }
  const label = t('friends.quick_add', { username: name })
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={label} onPress={add} hitSlop={8} style={[styles.quickAdd, failed && { borderColor: colors.danger }]}>
      <MaterialCommunityIcons name={failed ? 'alert-circle-outline' : 'account-plus-outline'} size={18} color={failed ? colors.danger : colors.textMuted} />
    </Touchable>
  )
}

export function LeaderboardRow({
  index,
  name,
  uid,
  mine,
  me,
  detail,
  value,
  secondary,
  report,
}: {
  index: number
  name: string
  uid?: string
  mine: boolean
  // The signed-in account: other players' rows get a quick "add friend" button
  me?: Me
  detail?: string
  value: string
  secondary?: string
  // The entry's collection and id, to offer a report (not for the player's own entry)
  report?: Omit<ReportTarget, 'name'>
}) {
  const { t } = useTranslation()
  const content = (
    <>
      <Text variant="bodyStrong" style={styles.rank}>
        {rankLabel(index)}
      </Text>
      <View style={{ flex: 1 }}>
        <DecoratedName uid={uid} color={mine ? colors.accent : undefined}>
          {name}
          {mine ? (
            <Text variant="caption" color={colors.accent}>
              {'  '}
              {t('score_save.you')}
            </Text>
          ) : null}
        </DecoratedName>
        {detail ? (
          <Text variant="caption" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {uid && me?.username && !mine ? <QuickAdd me={{ uid: me.uid, username: me.username }} uid={uid} name={name} /> : null}
      {report && !mine ? <ReportFlag target={{ ...report, name }} /> : null}
      <View style={styles.values}>
        <Text variant="bodyStrong" style={styles.value}>
          {value}
        </Text>
        {secondary !== undefined ? (
          <Text variant="caption" style={styles.value}>
            {secondary}
          </Text>
        ) : null}
      </View>
    </>
  )
  const style = [styles.row, index < 3 && styles.rowTop, mine && styles.rowMine]
  return uid ? (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => router.push({ pathname: '/player/[uid]', params: { uid } })}
      style={style}>
      {content}
    </Touchable>
  ) : (
    <View style={style}>{content}</View>
  )
}

// Loading spinner, error, empty message or the rows, in a card.
export function LeaderboardCard({
  scores,
  error,
  emptyText,
  children,
}: {
  scores: unknown[] | null
  error: unknown
  emptyText: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <View style={styles.card}>
      {error ? (
        <View style={styles.message}>
          <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.danger} />
          <Text variant="caption" color={colors.danger} style={{ textAlign: 'center' }}>
            {t(loadErrorKey(error))}
          </Text>
        </View>
      ) : !scores ? (
        <ActivityIndicator color={colors.accent} style={{ paddingVertical: space.xl }} />
      ) : scores.length === 0 ? (
        <View style={styles.message}>
          <MaterialCommunityIcons name="trophy-outline" size={28} color={colors.textFaint} />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {emptyText}
          </Text>
        </View>
      ) : (
        children
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  quickAdd: { width: 30, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  card: { gap: 4, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  message: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowTop: { backgroundColor: colors.surfaceHigh },
  rowMine: { borderWidth: 1, borderColor: colors.accent },
  rank: { width: 28, textAlign: 'center' },
  values: { alignItems: 'flex-end' },
  value: { textAlign: 'right', fontVariant: ['tabular-nums'] },
})

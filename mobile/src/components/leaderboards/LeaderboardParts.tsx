// Pieces shared by the lists of the Rankings tab: filter chips, a row, and the loading / empty / error states.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'

import { loadErrorKey, rankLabel } from '@/leaderboards'
import { colors, radius, space } from '@/theme'
import { Text, Touchable } from '../ui'

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

export function LeaderboardRow({
  index,
  name,
  uid,
  mine,
  detail,
  value,
  secondary,
}: {
  index: number
  name: string
  uid?: string
  mine: boolean
  detail?: string
  value: string
  secondary?: string
}) {
  const { t } = useTranslation()
  const content = (
    <>
      <Text variant="bodyStrong" style={styles.rank}>
        {rankLabel(index)}
      </Text>
      <View style={{ flex: 1 }}>
        <Text variant="body" numberOfLines={1} color={mine ? colors.accent : undefined}>
          {name}
          {mine ? (
            <Text variant="caption" color={colors.accent}>
              {'  '}
              {t('score_save.you')}
            </Text>
          ) : null}
        </Text>
        {detail ? (
          <Text variant="caption" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
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

// Play tab: where the signed-in player stands in the weekly league (rank, points, gap to the next), what last week paid
// when they aren't ranked yet, or an invitation for a visitor. Opens the League screen.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useLeague } from '@shared/hooks/useLeague'

import { Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Me = { rank: number; points: number; ahead: { name: string; gap: number } | null }
type League = { me: Me | null; lastResult: { reward: number } | null }

function Row({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <Touchable accessibilityRole="button" onPress={() => router.push('/league')} style={styles.row}>
      <View style={styles.icon}>
        <MaterialCommunityIcons name="trophy-outline" size={28} color={colors.highlight} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{t('league.card_title')}</Text>
        {children}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textFaint} />
    </Touchable>
  )
}

function PlayerLeagueCard({ uid }: { uid: string }) {
  const { t } = useTranslation()
  const { me, lastResult } = useLeague(uid) as League
  if (me) {
    return (
      <Row>
        <Text variant="body">
          {t('league.me_rank', { rank: me.rank })} · {me.points} {t('units.pts')}
        </Text>
        <Text variant="caption">{me.ahead ? t('league.me_gap', { gap: me.ahead.gap, name: me.ahead.name }) : t('league.me_leader')}</Text>
      </Row>
    )
  }
  return (
    <Row>
      {lastResult != null && lastResult.reward > 0 && <Text variant="body">{t('league.card_last', { count: lastResult.reward })}</Text>}
      <Text variant="caption">{t('league.card_play')}</Text>
    </Row>
  )
}

// `uid`: the signed-in account's, undefined for a visitor.
export function LeagueCard({ uid }: { uid?: string }) {
  const { t } = useTranslation()
  if (!uid) {
    return (
      <Row>
        <Text variant="caption">{t('league.card_cta')}</Text>
      </Row>
    )
  }
  return <PlayerLeagueCard uid={uid} />
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.highlight}22` },
})

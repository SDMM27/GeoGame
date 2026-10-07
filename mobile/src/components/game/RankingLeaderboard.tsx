// Leaderboard of one Country Ranking daily challenge (best score, then smallest total error).
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { fetchRankingScores, type RankingScore } from '@/rankingScores'
import { colors, radius, space } from '@/theme'
import { Text } from '../ui'

const MEDALS = ['🥇', '🥈', '🥉']
const MAX_ROWS = 20

export function RankingLeaderboard({ dailyKey, refreshKey }: { dailyKey: string; refreshKey?: unknown }) {
  const { t } = useTranslation()
  const [scores, setScores] = useState<RankingScore[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchRankingScores(dailyKey)
      .then((result) => {
        if (!cancelled) setScores(result)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [dailyKey, refreshKey])

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('leaderboard.title')}</Text>
      {failed ? (
        <Text variant="caption" color={colors.danger}>
          {t('mobile.game.load_error')}
        </Text>
      ) : !scores ? (
        <ActivityIndicator color={colors.textMuted} style={{ paddingVertical: space.lg }} />
      ) : scores.length === 0 ? (
        <Text variant="caption">{t('leaderboard.no_scores_today')}</Text>
      ) : (
        scores.slice(0, MAX_ROWS).map((score, index) => (
          <View key={`${score.name}-${index}`} style={[styles.row, index < 3 && styles.rowTop]}>
            <Text variant="bodyStrong" style={styles.rank}>
              {MEDALS[index] ?? `${index + 1}`}
            </Text>
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {score.name}
            </Text>
            <Text variant="bodyStrong" style={styles.value}>
              {score.score} {t('units.pts')}
            </Text>
            <Text variant="caption" style={styles.error}>
              {score.totalError} {t('mobile.ranking.pos')}
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowTop: { backgroundColor: colors.surfaceHigh },
  rank: { width: 28, textAlign: 'center' },
  value: { minWidth: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
  error: { minWidth: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
})

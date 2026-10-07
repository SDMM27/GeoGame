// Leaderboard of one daily challenge (fewest attempts, then fastest).
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { formatTime } from '@shared/utils/formatTime'
import { fetchDailyScores } from '@shared/utils/saveScore'

import { useAccount } from '@/account/auth'
import { colors, radius, space } from '@/theme'
import { Text } from '../ui'
import { visibleRows } from './leaderboardRows'

type DailyScore = { name: string; uid?: string; attempts: number; hints?: number; elapsedTime?: number | null }

const MEDALS = ['🥇', '🥈', '🥉']
const MAX_ROWS = 20

export function DailyLeaderboard({
  gameType,
  dailyKey,
  refreshKey,
  formatSecondary = (elapsedTime) => (elapsedTime != null ? formatTime(elapsedTime) : '—'),
}: {
  gameType: string
  dailyKey: string
  refreshKey?: unknown
  // Last column; Voyage Voyage stores its error count in elapsedTime.
  formatSecondary?: (elapsedTime: number | null | undefined) => string
}) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const [scores, setScores] = useState<DailyScore[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchDailyScores(gameType, dailyKey)
      .then((result: DailyScore[]) => {
        if (!cancelled) setScores(result)
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [gameType, dailyKey, refreshKey])

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
        visibleRows(scores, account?.uid, MAX_ROWS).map(({ score, index }) => (
          <View
            key={`${score.name}-${index}`}
            style={[styles.row, index < 3 && styles.rowTop, Boolean(score.uid) && score.uid === account?.uid && styles.rowMine]}>
            <Text variant="bodyStrong" style={styles.rank}>
              {MEDALS[index] ?? `${index + 1}`}
            </Text>
            <Text
              variant="body"
              numberOfLines={1}
              style={{ flex: 1 }}
              onPress={score.uid ? () => router.push({ pathname: '/player/[uid]', params: { uid: score.uid! } }) : undefined}>
              {score.name}
              {score.uid === account?.uid && score.uid && (
                <Text variant="caption" color={colors.accent}>
                  {'  '}
                  {t('score_save.you')}
                </Text>
              )}
            </Text>
            <Text variant="bodyStrong" style={styles.value}>
              {score.attempts + (score.hints ?? 0)}
            </Text>
            <Text variant="caption" style={styles.time}>
              {formatSecondary(score.elapsedTime)}
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
  rowMine: { borderWidth: 1, borderColor: colors.accent },
  rank: { width: 28, textAlign: 'center' },
  value: { minWidth: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
  time: { minWidth: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
})

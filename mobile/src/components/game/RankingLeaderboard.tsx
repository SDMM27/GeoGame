// Leaderboard of one Country Ranking daily challenge (best score, then smallest total error).
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View } from 'react-native'

import { answersOf } from '@shared/utils/dailyAnswers'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { useDailyAnswers } from '@shared/hooks/useDailyAnswers'

import { fetchRankingScores, type RankingScore } from '@/rankingScores'
import { useAccount } from '@/account/auth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { loadErrorKey } from '@/leaderboards'
import { makeStyles, radius, space, useColors } from '@/theme'
import { Text } from '../ui'
import { DecoratedName } from '../leaderboards/DecoratedName'
import { AnswerList, ExpandableRow } from './ExpandableRow'
import { visibleRows } from './leaderboardRows'

const MEDALS = ['🥇', '🥈', '🥉']
const DEFAULT_MAX_ROWS = 20

// `todayKey`: the current daily key when `dailyKey` is a past day shown (its answers are open); by default the day is today.
export function RankingLeaderboard({
  dailyKey,
  todayKey = dailyKey,
  refreshKey,
  maxRows = DEFAULT_MAX_ROWS,
  onSettled,
}: {
  dailyKey: string
  todayKey?: string
  refreshKey?: unknown
  maxRows?: number
  onSettled?: () => void
}) {
  const { t } = useTranslation()
  const colors = useColors()
  const styles = useStyles()
  const { account } = useAccount()
  const { scores, error } = useLeaderboard<RankingScore>(dailyKey, () => fetchRankingScores(dailyKey), refreshKey, onSettled)
  const answers = useDailyAnswers({ gameType: GAME_TYPES.RANKING, day: dailyKey, todayKey, uid: account?.uid, refreshKey }) as { locked: boolean; signedIn: boolean; answers: Map<string, { playerOrder?: string[] }> | null }

  // The order played, or a lock message while today's answers are locked
  const rowDetails = (score: RankingScore) => {
    const shown = answersOf(score, answers) as { playerOrder?: string[] } | null
    if (!shown) return <Text variant="caption">{t(answers.signedIn ? 'leaderboard.answers_locked' : 'leaderboard.answers_locked_signed_out')}</Text>
    return Array.isArray(shown.playerOrder) && shown.playerOrder.length > 0 ? <AnswerList title={t('leaderboard.played_order')} answers={shown.playerOrder} /> : undefined
  }

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('leaderboard.title')}</Text>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {t(loadErrorKey(error))}
        </Text>
      ) : !scores ? (
        <ActivityIndicator color={colors.textMuted} style={{ paddingVertical: space.lg }} />
      ) : scores.length === 0 ? (
        <Text variant="caption">{t('leaderboard.no_scores_today')}</Text>
      ) : (
        visibleRows(scores, account?.uid, maxRows).map(({ score, index }) => (
          <ExpandableRow
            key={`${score.name}-${index}`}
            style={[styles.row, index < 3 && styles.rowTop, Boolean(score.uid) && score.uid === account?.uid && styles.rowMine]}
            details={rowDetails(score)}>
            <Text variant="bodyStrong" style={styles.rank}>
              {MEDALS[index] ?? `${index + 1}`}
            </Text>
            <DecoratedName uid={score.uid} fill onPress={score.uid ? () => router.push({ pathname: '/player/[uid]', params: { uid: score.uid! } }) : undefined}>
              {score.name}
              {score.uid === account?.uid && score.uid && (
                <Text variant="caption" color={colors.accent}>
                  {'  '}
                  {t('score_save.you')}
                </Text>
              )}
            </DecoratedName>
            <Text variant="bodyStrong" style={styles.value}>
              {score.score} {t('units.pts')}
            </Text>
            <Text variant="caption" style={styles.error}>
              {score.totalError} {t('mobile.ranking.pos')}
            </Text>
          </ExpandableRow>
        ))
      )}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowTop: { backgroundColor: colors.surfaceHigh },
  rowMine: { borderWidth: 1, borderColor: colors.accent },
  rank: { width: 28, textAlign: 'center' },
  value: { minWidth: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
  error: { minWidth: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
}))

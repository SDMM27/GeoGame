// Leaderboard of one Daily Challenge (right answers out of 12, then fastest). A row opens on the player's 12 rounds.
import { router } from 'expo-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { CHALLENGE_ROUNDS, challengeShareGrid } from '@shared/utils/dailyChallenge'
import { challengeRounds } from '@shared/utils/dailyChallengeRounds'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { fetchChallengeScores } from '@shared/utils/saveScore'

import { useAccount } from '@/account/auth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { loadErrorKey } from '@/leaderboards'
import { colors, radius, space } from '@/theme'
import { Text } from '../ui'
import { DecoratedName } from '../leaderboards/DecoratedName'
import { ReportFlag } from '../leaderboards/ReportFlag'
import { ExpandableRow } from './ExpandableRow'
import { visibleRows } from './leaderboardRows'

type ChallengeScore = { id?: string; name: string; uid?: string; score: number; elapsedTime?: number | null; results?: boolean[] }

const MEDALS = ['🥇', '🥈', '🥉']
const DEFAULT_MAX_ROWS = 20

export function ChallengeLeaderboard({
  dailyKey,
  refreshKey,
  maxRows = DEFAULT_MAX_ROWS,
  onSettled,
}: {
  dailyKey: string
  refreshKey?: unknown
  maxRows?: number
  onSettled?: () => void
}) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const { scores, error } = useLeaderboard<ChallengeScore>(
    `${GAME_TYPES.DAILY_CHALLENGE}|${dailyKey}`,
    () => fetchChallengeScores(dailyKey),
    refreshKey,
    onSettled
  )
  // The kinds of round of the day, for the grids
  const rounds = useMemo(() => (dailyKey ? challengeRounds(dailyKey) : []), [dailyKey])

  const details = (score: ChallengeScore) => {
    if (!Array.isArray(score.results) || score.results.length !== rounds.length) return undefined
    const grid = challengeShareGrid(
      rounds,
      score.results.map((right) => (right ? 'correct' : 'failed'))
    )
    return (
      <>
        <Text variant="label">{t('daily_challenge.rounds_title')}</Text>
        <Text variant="body">{grid}</Text>
      </>
    )
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
            key={score.id ?? `${score.name}-${index}`}
            style={[styles.row, index < 3 && styles.rowTop, Boolean(score.uid) && score.uid === account?.uid && styles.rowMine]}
            details={details(score)}>
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
            {score.id && !(score.uid && score.uid === account?.uid) ? (
              <ReportFlag target={{ collection: 'daily_scores', id: score.id, name: score.name }} />
            ) : null}
            <Text variant="bodyStrong" style={styles.value}>
              {score.score}/{CHALLENGE_ROUNDS}
            </Text>
            <Text variant="caption" style={styles.time}>
              {score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}
            </Text>
          </ExpandableRow>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowTop: { backgroundColor: colors.surfaceHigh },
  rowMine: { borderWidth: 1, borderColor: colors.accent },
  rank: { width: 28, textAlign: 'center' },
  value: { minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
  time: { minWidth: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
})

// Leaderboard of one Country of the Day (points, then fastest). A row opens on the player's mode and steps.
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View } from 'react-native'

import { COUNTRY_OF_DAY_STEPS, COUNTRY_OF_DAY_STEP_EMOJI, COUNTRY_OF_DAY_TRIES } from '@shared/utils/countryOfDay'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'
import { fetchCountryOfDayScores } from '@shared/utils/saveScore'

import { useAccount } from '@/account/auth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { loadErrorKey } from '@/leaderboards'
import { makeStyles, radius, space, useColors } from '@/theme'
import { Text } from '../ui'
import { DecoratedName } from '../leaderboards/DecoratedName'
import { ReportFlag } from '../leaderboards/ReportFlag'
import { RoundItem, RoundList } from '../game/ChallengeRoundList'
import { ExpandableRow } from '../game/ExpandableRow'
import { visibleRows } from '../game/leaderboardRows'

type Score = { id?: string; name: string; uid?: string; score: number; mode?: string; steps?: number[]; elapsedTime?: number | null }

const MEDALS = ['🥇', '🥈', '🥉']
const DEFAULT_MAX_ROWS = 20

export function CountryOfDayLeaderboard({ dailyKey, refreshKey, maxRows = DEFAULT_MAX_ROWS, onSettled }: { dailyKey: string; refreshKey?: unknown; maxRows?: number; onSettled?: () => void }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const { account } = useAccount()
  const { scores, error } = useLeaderboard<Score>(`${GAME_TYPES.COUNTRY_OF_DAY}|${dailyKey}`, () => fetchCountryOfDayScores(dailyKey), refreshKey, onSettled)

  const details = (score: Score) => {
    if (!Array.isArray(score.steps) || score.steps.length !== COUNTRY_OF_DAY_STEPS.length) return undefined
    return (
      <>
        {score.mode && <Text variant="caption">{t(`country_of_day.mode_${score.mode}`, { defaultValue: '' })}</Text>}
        <RoundList>
          {COUNTRY_OF_DAY_STEPS.map((step: string, i: number) => (
            <RoundItem
              key={step}
              icon={COUNTRY_OF_DAY_STEP_EMOJI[step as keyof typeof COUNTRY_OF_DAY_STEP_EMOJI]}
              label={t(`country_of_day.step_${step}`)}
              right={Boolean(score.steps![i])}
              result={score.steps![i] ? `${score.steps![i]}/${COUNTRY_OF_DAY_TRIES} ✅` : '❌'}
            />
          ))}
        </RoundList>
      </>
    )
  }

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('country_of_day.leaderboard')}</Text>
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
              {score.score}
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

const useStyles = makeStyles((colors) => ({
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowTop: { backgroundColor: colors.surfaceHigh },
  rowMine: { borderWidth: 1, borderColor: colors.accent },
  rank: { width: 28, textAlign: 'center' },
  value: { minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
  time: { minWidth: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
}))

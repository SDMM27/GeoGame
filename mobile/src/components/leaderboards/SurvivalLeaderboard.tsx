// Survival leaderboard of the Rankings tab: most rounds per lives, timer and preset ramp, for a set of games or all of them
// (collection survival_scores).
import { useTranslation } from 'react-i18next'

import { formatTime } from '@shared/utils/formatTime'
import { fetchSurvivalScores } from '@shared/utils/saveScore'
import { parseSurvivalModes } from '@shared/utils/survivalConfig'

import { useAccount } from '@/account/auth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { isMine } from '@/leaderboards'
import { visibleRows } from '../game/leaderboardRows'
import { LeaderboardCard, LeaderboardRow } from './LeaderboardParts'

// `modes`: a survivalModesKey, or null for every set of games
export type SurvivalFilters = { lives: number; timer: number; ramp: string; modes: string | null }

type SurvivalScore = { id?: string; name: string; uid?: string; modes: string; lives: number; score: number; elapsedTime?: number | null }

const MAX_ROWS = 50

export function SurvivalLeaderboard({ filters, refreshKey, onSettled }: { filters: SurvivalFilters; refreshKey: number; onSettled: () => void }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const key = `${filters.lives}|${filters.timer}|${filters.ramp}|${filters.modes}`
  const { scores, error } = useLeaderboard<SurvivalScore>(key, () => fetchSurvivalScores(filters), refreshKey, onSettled)

  return (
    <LeaderboardCard scores={scores} error={error} emptyText={t('survival.no_scores')}>
      {visibleRows(scores ?? [], account?.uid, MAX_ROWS).map(({ score, index }) => (
        <LeaderboardRow
          key={`${score.uid ?? score.name}-${score.modes}-${index}`}
          index={index}
          name={score.name}
          uid={score.uid}
          mine={isMine(score, account?.uid)}
          me={account}
          detail={filters.modes ? undefined : parseSurvivalModes(score.modes).map((type: string) => t(`survival.round_type.${type}`)).join(', ')}
          report={score.id ? { collection: 'survival_scores', id: score.id } : undefined}
          value={t('survival.rounds_count', { count: score.score })}
          secondary={score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}
        />
      ))}
    </LeaderboardCard>
  )
}

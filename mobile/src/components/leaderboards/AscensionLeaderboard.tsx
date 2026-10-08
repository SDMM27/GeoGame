// Ascension leaderboard of the Rankings tab: fastest runs per game and preset (collection ascension_scores).
import { useTranslation } from 'react-i18next'

import { formatTime } from '@shared/utils/formatTime'
import { fetchAscensionScores } from '@shared/utils/saveScore'

import { useAccount } from '@/account/auth'
import { getGameByType } from '@/games'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { isMine } from '@/leaderboards'
import { visibleRows } from '../game/leaderboardRows'
import { LeaderboardCard, LeaderboardRow } from './LeaderboardParts'

export type AscensionFilters = { game: string; preset: string }

type AscensionScore = {
  id?: string
  name: string
  uid?: string
  gameType?: string
  presetName?: string
  globalTimeMs?: number | null
  globalScore?: number
}

const MAX_ROWS = 50

export function AscensionLeaderboard({
  filters,
  allGames,
  refreshKey,
  onSettled,
}: {
  filters: AscensionFilters
  allGames: string
  refreshKey: number
  onSettled: () => void
}) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const key = `${filters.game}|${filters.preset}`
  const { scores, error } = useLeaderboard<AscensionScore>(key, () => fetchAscensionScores(filters), refreshKey, onSettled)

  return (
    <LeaderboardCard scores={scores} error={error} emptyText={t('mobile.leaderboards.empty_ascension')}>
      {visibleRows(scores ?? [], account?.uid, MAX_ROWS).map(({ score, index }) => {
        const game = score.gameType ? getGameByType(score.gameType) : undefined
        const detail = [filters.game === allGames && game ? t(game.titleKey) : null, score.presetName].filter(Boolean).join(' · ')
        return (
          <LeaderboardRow
            key={`${score.uid ?? score.name}-${score.gameType}-${score.presetName}-${index}`}
            index={index}
            name={score.name}
            uid={score.uid}
            mine={isMine(score, account?.uid)}
            detail={detail}
            report={score.id ? { collection: 'ascension_scores', id: score.id } : undefined}
            value={score.globalTimeMs != null ? formatTime(score.globalTimeMs) : '—'}
            secondary={`${score.globalScore ?? 0} ${t('units.pts')}`}
          />
        )
      })}
    </LeaderboardCard>
  )
}

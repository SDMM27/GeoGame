// Solo leaderboard of the Rankings tab: best scores per game, difficulty or continent (collection scores).
import { useTranslation } from 'react-i18next'

import { formatTime } from '@shared/utils/formatTime'
import { fetchSoloScores } from '@shared/utils/saveScore'

import { useAccount } from '@/account/auth'
import { getGameByType } from '@/games'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { isMine, soloDetailParts, type SoloScore } from '@/leaderboards'
import { visibleRows } from '../game/leaderboardRows'
import { LeaderboardCard, LeaderboardRow } from './LeaderboardParts'

export type SoloFilters = { game: string; continentMode: boolean; difficulty: string; continent: string }

const MAX_ROWS = 50

export function SoloLeaderboard({
  filters,
  allGames,
  refreshKey,
  onSettled,
}: {
  filters: SoloFilters
  allGames: string
  refreshKey: number
  onSettled: () => void
}) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const key = `${filters.game}|${filters.continentMode}|${filters.difficulty}|${filters.continent}`
  const { scores, error } = useLeaderboard<SoloScore>(key, () => fetchSoloScores(filters), refreshKey, onSettled)

  const detailOptions = {
    showGame: filters.game === allGames,
    gameLabel: (type: string) => {
      const game = getGameByType(type)
      return game ? t(game.titleKey) : undefined
    },
    levelLabel: (level: string) => t(filters.continentMode ? `continents.${level}` : `difficulties.${level}`, { defaultValue: level }),
  }

  return (
    <LeaderboardCard scores={scores} error={error} emptyText={t('mobile.leaderboards.empty')}>
      {visibleRows(scores ?? [], account?.uid, MAX_ROWS).map(({ score, index }) => (
        <LeaderboardRow
          key={`${score.uid ?? score.name}-${score.gameType}-${score.difficulty}-${index}`}
          index={index}
          name={score.name}
          uid={score.uid}
          mine={isMine(score, account?.uid)}
          detail={soloDetailParts(score, detailOptions).join(' · ')}
          value={`${score.score} ${t('units.pts')}`}
          secondary={score.elapsedTime != null ? formatTime(score.elapsedTime) : '—'}
        />
      ))}
    </LeaderboardCard>
  )
}

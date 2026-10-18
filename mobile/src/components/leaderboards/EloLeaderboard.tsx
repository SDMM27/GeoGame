// Elo leaderboard of the Rankings tab: the season's best players for duels or one solo mode (collection elo).
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { currentSeason, fetchEloLeaderboard, formatSeason } from '@shared/utils/elo'

import { useAccount } from '@/account/auth'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { isMine } from '@/leaderboards'
import { Text } from '../ui'
import { visibleRows } from '../game/leaderboardRows'
import { LeaderboardCard, LeaderboardRow } from './LeaderboardParts'

type EloScore = { id: string; uid: string; name: string; rating: number; games?: number; wins?: number; found?: number }

const MAX_ROWS = 50

export function EloLeaderboard({
  eloKey,
  refreshKey,
  onSettled,
}: {
  // 'duel' or a solo mode
  eloKey: string
  refreshKey: number
  onSettled: () => void
}) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const { scores, error } = useLeaderboard<EloScore>(eloKey, () => fetchEloLeaderboard(eloKey), refreshKey, onSettled)

  return (
    <>
      <View style={{ gap: 2 }}>
        <Text variant="bodyStrong">{formatSeason(currentSeason(), t)}</Text>
        <Text variant="caption">{t('elo.explain')}</Text>
      </View>
      <LeaderboardCard scores={scores} error={error} emptyText={t('elo.empty')}>
        {visibleRows(scores ?? [], account?.uid, MAX_ROWS).map(({ score, index }) => (
          <LeaderboardRow
            key={score.id}
            index={index}
            name={score.name}
            uid={score.uid}
            mine={isMine(score, account?.uid)}
            me={account}
            detail={
              eloKey === 'duel'
                ? t('elo.duel_detail', { games: score.games ?? 0, wins: score.wins ?? 0 })
                : t('elo.found_count', { count: score.found ?? 0 })
            }
            value={String(score.rating)}
          />
        ))}
      </LeaderboardCard>
    </>
  )
}

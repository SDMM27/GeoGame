// Weekly league: the ranking of the week's daily games (Monday to Sunday), among friends and in the world, and what last
// week paid. The server computes it once a day (api/_lib/weeklyTop.mjs).
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBadges } from '@shared/hooks/useBadges'
import { useLeague } from '@shared/hooks/useLeague'
import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { LEAGUE_MIN_PLAYED, LEAGUE_REWARDS } from '@shared/utils/leagueRewards'

import { type Account, useAccount } from '@/account/auth'
import { BoardingPass, Kicker } from '@/components/flight'
import { type PlayerBadges } from '@/components/profile/BadgeStrip'
import { type CandidateMessage, FriendCandidates, type Zone } from '@/components/profile/FriendCandidates'
import { SectionTitle } from '@/components/profile/ProfileSections'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, Segmented, Text } from '@/components/ui'
import { fonts, makeStyles, radius, space, useColors } from '@/theme'

type Tab = 'friends' | 'world'
type Ranked = { uid: string; name: string; rank: number; points: number }
type Result = { week: string; rank: number | null; points: number; reward: number; podium: Ranked[] }
type Me = { rank: number; points: number; played: number; ahead: { name: string; gap: number } | null }
type League = {
  loading: boolean
  error: boolean
  reload: () => void
  world: Ranked[]
  friendsBoard: Ranked[]
  me: Me | null
  lastResult: Result | null
  daysLeft: number
}

function LastWeek({ result }: { result: Result }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  if (result.rank != null) {
    return (
      <View style={[styles.lastWeek, { borderColor: colors.accent }]}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {t('league.last_rank', { rank: result.rank, points: result.points })}
        </Text>
        {result.reward > 0 && (
          <Text variant="caption" color={colors.accent} style={{ flex: 1, textAlign: 'right', fontFamily: fonts.bodyBold }}>
            {t('league.last_reward', { count: result.reward })}
          </Text>
        )}
      </View>
    )
  }
  if (result.podium.length === 0) return null
  return <Text variant="caption">{t('league.last_podium', { names: result.podium.map((player) => `${player.rank}. ${player.name}`).join(' · ') })}</Text>
}

function MyPlace({ account, me }: { account: Account | null; me: Me | null }) {
  const { t } = useTranslation()
  const styles = useStyles()
  if (!account?.username) {
    return (
      <View style={styles.card}>
        <Text variant="caption">{t('league.need_account')}</Text>
        <Button label={t('friends.add_page.login_button')} onPress={() => router.replace('/profile')} />
      </View>
    )
  }
  if (!me) {
    return (
      <View style={styles.card}>
        <Text variant="caption">{t('league.me_none')}</Text>
        <Button label={t('league.me_play')} onPress={() => router.replace('/')} />
      </View>
    )
  }
  return (
    <BoardingPass code={String(me.rank)} gate={String(me.points)} codeLabel={t('mobile.flight.rank').toLocaleUpperCase()} gateLabel={t('units.pts').toLocaleUpperCase()} accessibilityLabel={`${t('league.me_rank', { rank: me.rank })}, ${me.points} ${t('units.pts')}`}>
      <Kicker>{t('league.title')}</Kicker>
      <View style={styles.meRow}>
        <Text style={styles.rank}>{t('league.me_rank', { rank: me.rank })}</Text>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">
            {me.points} {t('units.pts')}
          </Text>
          <Text variant="caption">{t('league.me_played', { count: me.played })}</Text>
        </View>
      </View>
      <Text variant="caption">{me.ahead ? t('league.me_gap', { gap: me.ahead.gap, name: me.ahead.name }) : t('league.me_leader')}</Text>
    </BoardingPass>
  )
}

export default function LeagueScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const league = useLeague(account?.username ? account.uid : null, friendships.friends, account?.username) as League
  const [chosen, setChosen] = useState<Tab | null>(null)
  const [message, setMessage] = useState<CandidateMessage | null>(null)
  const tab = chosen ?? (friendships.friends.length > 0 ? 'friends' : 'world')
  const shown = tab === 'friends' ? league.friendsBoard : league.world
  const badges: Record<string, PlayerBadges | undefined> = useBadges(shown.map((player) => player.uid))
  const players = shown.map((player) => ({
    uid: player.uid,
    name: player.name,
    rank: player.rank,
    detail: `${player.points} ${t('units.pts')}`,
    badges: badges[player.uid],
    // What the rank pays at the end of the week (the world board only: friends compete for pride)
    reward: tab === 'world' ? (LEAGUE_REWARDS as Record<number, number>)[player.rank] : undefined,
  }))
  const rewards = LEAGUE_REWARDS as Record<number, number>
  const zones: Zone[] | undefined =
    tab === 'world'
      ? [
          { fromRank: 1, label: t('mobile.flight.zone_podium').toLocaleUpperCase(), note: t('mobile.flight.zone_podium_note', { rewards: `${rewards[1]} / ${rewards[2]} / ${rewards[3]}` }).toLocaleUpperCase(), color: colors.gold },
          {
            fromRank: 4,
            toRank: Object.keys(rewards).length,
            label: t('mobile.flight.zone_fragments').toLocaleUpperCase(),
            note: t('mobile.flight.zone_fragments_note', { reward: rewards[4], from: 4, to: Object.keys(rewards).length }).toLocaleUpperCase(),
            color: colors.accent,
          },
        ]
      : undefined

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}
      style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={t('league.title')} />
      <View style={{ gap: space.xs }}>
        <Text variant="caption">{t('league.intro')}</Text>
        <Kicker color={colors.gold}>{t('league.days_left', { count: league.daysLeft })}</Kicker>
        <Text variant="caption">{t('league.updated_hint')}</Text>
      </View>

      {league.lastResult && <LastWeek result={league.lastResult} />}

      <MyPlace account={account} me={league.me} />

      <View style={{ gap: space.md }}>
        <SectionTitle title={t('league.title')} />
        <Segmented<Tab>
          value={tab}
          onChange={setChosen}
          options={[
            { value: 'friends', label: t('league.tab_friends') },
            { value: 'world', label: t('league.tab_world') },
          ]}
        />
        {message && (
          <Text variant="caption" color={message.kind === 'error' ? colors.danger : colors.accent}>
            {message.text}
          </Text>
        )}
        <FriendCandidates players={players} account={account} friendships={friendships} onMessage={setMessage} zones={zones} />
        {tab === 'friends' && account?.username && friendships.friends.length === 0 && (
          <View style={{ gap: space.sm }}>
            <Text variant="caption">{t('league.friends_empty')}</Text>
            <Button label={t('league.friends_link')} variant="secondary" onPress={() => router.push('/friends')} />
          </View>
        )}
        {tab === 'world' && !league.loading && !league.error && players.length === 0 && <Text variant="caption">{t('league.world_empty')}</Text>}
        {league.error && (
          <View style={{ gap: space.sm }}>
            <Text variant="caption" color={colors.danger}>
              {t('league.error')}
            </Text>
            <Button label="↻" variant="secondary" onPress={league.reload} />
          </View>
        )}
      </View>

      <Text variant="caption">
        {t('league.rewards', { first: LEAGUE_REWARDS[1], second: LEAGUE_REWARDS[2], third: LEAGUE_REWARDS[3], rest: LEAGUE_REWARDS[4], min: LEAGUE_MIN_PLAYED })}
      </Text>
    </ScrollView>
  )
}

const useStyles = makeStyles((colors) => ({
  card: { gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  rank: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 38, color: colors.accent },
  lastWeek: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5 },
}))

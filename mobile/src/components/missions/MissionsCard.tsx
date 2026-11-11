// Play tab: the signed-in player's level, the dailies played and the streak on one line, and the daily and weekly
// missions (paying XP, see @shared/utils/missions) in a tab each, or an invitation to sign in for a visitor.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { TFunction } from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import type { useMissions } from '@shared/hooks/useMissions'
import {
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  DAILY_MISSIONS,
  WEEKLY_BONUS_XP,
  WEEKLY_MISSIONS,
  WEEKLY_TIERS,
  missionResetsIn,
} from '@shared/utils/missions'
import { serverNow } from '@shared/utils/serverTime'

import { DAILY_BONUS_FRAGMENTS, DAILY_MISSION_FRAGMENTS, WEEKLY_BONUS_FRAGMENTS } from '@shared/utils/flagCollection'

import { ScreenTitle } from '@/components/flight'
import type { Xp } from '@/components/profile/XpBar'
import { Pill, Text, Touchable } from '@/components/ui'
import { makeStyles, radius, space, useColors } from '@/theme'

type Entry = {
  mission: { id: string; icon: string; target: number; tier?: 'easy' | 'medium' | 'hard' }
  progress: number
  done: boolean
  paid: boolean
}

type Reward = { xp: number; fragments: number }
type Dailies = { total: number; played: number }
type Streak = { count: number }
type TabId = 'daily' | 'weekly'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const DAILY_REWARD: Reward = { xp: DAILY_MISSION_XP, fragments: DAILY_MISSION_FRAGMENTS }

// "+60 XP" and, when there are some, "+150 XP · 1 ◆".
const rewardText = (t: TFunction, { xp, fragments }: Reward) =>
  fragments > 0 ? `${t('missions.reward', { xp })} · ${fragments} ◆` : t('missions.reward', { xp })

function MissionRow({ entry, reward }: { entry: Entry; reward: Reward }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const { mission, progress, done, paid } = entry
  const shown = Math.min(progress, mission.target)
  const color = done ? colors.accent : colors.highlight
  const title = t(`missions.${mission.id}`, { count: mission.target })
  return (
    <View style={[styles.mission, paid && { opacity: 0.7 }]} accessibilityLabel={`${title} ${shown}/${mission.target}`}>
      <View style={[styles.missionIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={done ? 'check' : (mission.icon as never)} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.missionTop}>
          <Text variant="bodyStrong" style={styles.missionTitle}>
            {title}
          </Text>
          <Text variant="caption" numberOfLines={1} color={done ? colors.accent : colors.textMuted} style={styles.missionReward}>
            {rewardText(t, reward)}
          </Text>
        </View>
        <View style={styles.progress}>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: color, width: `${(shown / mission.target) * 100}%` }]} />
          </View>
          <Text variant="caption" color={colors.textMuted} style={styles.count}>
            {shown} / {mission.target}
          </Text>
        </View>
      </View>
    </View>
  )
}

// Today's dailies played and the streak, on one line.
function SummaryLine({ dailies, streak }: { dailies: Dailies | null; streak: Streak | null }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  return (
    <View style={styles.summary}>
      {dailies ? (
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>
          {t('missions.dailies_short', { played: dailies.played, total: dailies.total })}
        </Text>
      ) : null}
      {streak ? (
        <View style={styles.streak}>
          <MaterialCommunityIcons name="fire" size={16} color={streak.count > 0 ? colors.warning : colors.textMuted} />
          <Text variant="bodyStrong" style={{ fontSize: 14 }}>
            {t('missions.streak_short', { count: streak.count })}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function Bonus({ count, reward, paid }: { count: number; reward: Reward; paid: boolean }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const color = paid ? colors.accent : colors.textMuted
  return (
    <View style={styles.bonus}>
      {paid ? <MaterialCommunityIcons name="check" size={16} color={color} /> : null}
      <Text variant="caption" color={color} style={{ flex: 1 }}>
        {t('missions.bonus', { count })}
      </Text>
      <Text variant="caption" color={color} style={{ fontSize: 12 }}>
        {rewardText(t, reward)}
      </Text>
    </View>
  )
}

const doneCount = (entries: Entry[]) => entries.filter((entry) => entry.done).length

// `missions`: useMissions(uid), loaded by the home screen (it also marks the dailies played).
export function MissionsCard({ uid, missions }: { uid: string | null | undefined; missions: ReturnType<typeof useMissions> }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const [selected, setSelected] = useState<TabId>('daily')

  if (!uid) {
    return (
      <Touchable accessibilityRole="button" onPress={() => router.push('/profile')} style={[styles.card, styles.invite]}>
        <MaterialCommunityIcons name="trophy-outline" size={26} color={colors.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{t('missions.title')}</Text>
          <Text variant="caption">{t('missions.sign_in')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textFaint} />
      </Touchable>
    )
  }

  const daily = missions.daily as Entry[]
  const weekly = missions.weekly as Entry[]
  const dailies = missions.dailies as Dailies | null
  const streak = missions.streak as Streak | null
  const resets = missionResetsIn(serverNow())
  const hoursLeft = (ms: number) => t('missions.resets_hours', { count: Math.max(1, Math.ceil(ms / HOUR_MS)) })
  const tabs: { id: TabId; label: string; entries: Entry[]; left: string }[] = [
    { id: 'daily', label: t('missions.tab_today'), entries: daily, left: hoursLeft(resets.daily) },
    {
      id: 'weekly',
      label: t('missions.tab_week'),
      entries: weekly,
      left: resets.weekly >= DAY_MS ? t('missions.resets_days', { count: Math.max(1, Math.round(resets.weekly / DAY_MS)) }) : hoursLeft(resets.weekly),
    },
  ]
  const entries = selected === 'daily' ? daily : weekly

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <ScreenTitle size={20}>{t('missions.title')}</ScreenTitle>
        {missions.xp && <Pill label={t('level.label', { level: (missions.xp as Xp).level })} color={colors.onAccent} background={colors.accent} />}
      </View>
      {dailies || streak ? <SummaryLine dailies={dailies} streak={streak} /> : null}
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const active = selected === tab.id
          return (
            <Touchable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(tab.id)}
              style={[styles.tab, active && { borderColor: colors.accent }]}>
              <Text variant="bodyStrong" color={active ? colors.accent : undefined} style={{ fontSize: 14 }}>
                {`${tab.label} ${doneCount(tab.entries)}/${tab.entries.length}`}
              </Text>
              <Text variant="caption" style={{ fontSize: 11 }}>
                {tab.left}
              </Text>
            </Touchable>
          )
        })}
      </View>
      {entries.length > 0 && (
        <View style={styles.group}>
          {entries.map((entry) => (
            <MissionRow key={entry.mission.id} entry={entry} reward={selected === 'daily' ? DAILY_REWARD : WEEKLY_TIERS[entry.mission.tier ?? 'easy']} />
          ))}
          {selected === 'daily' ? (
            <Bonus count={DAILY_MISSIONS} reward={{ xp: DAILY_BONUS_XP, fragments: DAILY_BONUS_FRAGMENTS }} paid={Boolean(missions.dailyBonus)} />
          ) : (
            <Bonus count={WEEKLY_MISSIONS} reward={{ xp: WEEKLY_BONUS_XP, fragments: WEEKLY_BONUS_FRAGMENTS }} paid={Boolean(missions.weeklyBonus)} />
          )}
        </View>
      )}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: space.lg,
    backgroundColor: colors.board,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  invite: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  group: { gap: space.sm },
  summary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: space.lg, rowGap: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mission: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  missionIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  missionTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  missionTitle: { fontSize: 14, lineHeight: 19, flexShrink: 1 },
  // The reward never wraps: the title gives way
  missionReward: { fontSize: 12, marginLeft: 'auto', flexShrink: 0 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  count: { fontSize: 12, fontVariant: ['tabular-nums'] },
  track: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.stub, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs },
}))

// Play tab: the daily and weekly missions of the signed-in player (paying XP, see @shared/utils/missions), the dailies
// of the day with their fragments and the streak, or an invitation to sign in for a visitor.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import type { useMissions } from '@shared/hooks/useMissions'
import {
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  DAILY_MISSIONS,
  GAME_XP,
  GAMES_PER_DAY,
  WEEKLY_BONUS_XP,
  WEEKLY_MISSIONS,
  WEEKLY_TIERS,
} from '@shared/utils/missions'

import { DAILY_BONUS_FRAGMENTS, DAILY_MISSION_FRAGMENTS, WEEKLY_BONUS_FRAGMENTS } from '@shared/utils/flagCollection'

import { XpBar, type Xp } from '@/components/profile/XpBar'
import { Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Entry = {
  mission: { id: string; icon: string; target: number; tier?: 'easy' | 'medium' | 'hard' }
  progress: number
  done: boolean
  paid: boolean
}

type Reward = { xp: number; fragments: number }
type Dailies = { total: number; played: number; won: number; tiers: { id: string; fragments: number; done: boolean; paid: boolean }[] }
type Streak = { count: number; next: { count: number; fragments: number } }

const DAILY_REWARD: Reward = { xp: DAILY_MISSION_XP, fragments: DAILY_MISSION_FRAGMENTS }

// "+60 XP" and, when there are some, "· +2 fragments".
const rewardText = (t: TFunction, { xp, fragments }: Reward) =>
  fragments > 0 ? `${t('missions.reward', { xp })} · ${t('missions.fragments', { count: fragments })}` : t('missions.reward', { xp })

function MissionRow({ entry, reward }: { entry: Entry; reward: Reward }) {
  const { t } = useTranslation()
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
          <View style={styles.missionMeta}>
            {mission.tier ? (
              <Text variant="caption" color={colors.textMuted} style={styles.missionTier}>
                {t(`missions.tier_${mission.tier}`)}
              </Text>
            ) : null}
            <Text variant="caption" color={done ? colors.accent : colors.textMuted} style={styles.missionReward}>
              {rewardText(t, reward)}
            </Text>
          </View>
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

// Today's dailies (played, won, the 3 tiers of fragments) and the streak with its next milestone.
function DailiesRow({ dailies, streak }: { dailies: Dailies; streak: Streak | null }) {
  const { t } = useTranslation()
  return (
    <View style={styles.dailies}>
      <View style={styles.dailiesLine}>
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>
          {t('missions.dailies_title')}
        </Text>
        <Text variant="caption" style={{ fontSize: 12 }}>
          {t('missions.dailies_played', { played: dailies.played, total: dailies.total })} · {t('missions.dailies_won', { won: dailies.won, total: dailies.total })}
        </Text>
      </View>
      <View style={styles.tiers}>
        {dailies.tiers.map((tier) => {
          const finished = tier.done || tier.paid
          return (
            <View key={tier.id} style={[styles.tier, finished && { borderColor: colors.accent }]}>
              <MaterialCommunityIcons name={finished ? 'check' : 'flag-variant-outline'} size={14} color={finished ? colors.accent : colors.textMuted} />
              <Text variant="caption" color={finished ? colors.accent : colors.textMuted} style={{ fontSize: 12 }}>
                {t(`missions.${tier.id}`)} · {t('missions.fragments', { count: tier.fragments })}
              </Text>
            </View>
          )
        })}
      </View>
      {streak ? (
        <View style={styles.dailiesLine}>
          <MaterialCommunityIcons name="fire" size={16} color={streak.count > 0 ? colors.warning : colors.textMuted} />
          <Text variant="bodyStrong" style={{ fontSize: 14 }}>
            {t('missions.streak_title')}
          </Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {streak.count > 0 ? t('missions.streak_days', { count: streak.count }) : t('missions.streak_none')}
          </Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {t('missions.streak_next', { day: streak.next.count })} · {t('missions.fragments', { count: streak.next.fragments })}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function Bonus({ count, reward, paid }: { count: number; reward: Reward; paid: boolean }) {
  const { t } = useTranslation()
  return (
    <View style={[styles.bonus, paid && { borderColor: colors.accent }]}>
      <MaterialCommunityIcons name={paid ? 'check-circle' : 'gift-outline'} size={18} color={paid ? colors.accent : colors.warning} />
      <Text variant="caption" style={{ flex: 1 }}>
        {t('missions.bonus', { count })}
      </Text>
      <Text variant="caption" color={paid ? colors.accent : colors.warning} style={{ fontSize: 12 }}>
        {rewardText(t, reward)}
      </Text>
    </View>
  )
}

// `missions`: useMissions(uid), loaded by the home screen (it also marks the dailies played).
export function MissionsCard({ uid, missions }: { uid: string | null | undefined; missions: ReturnType<typeof useMissions> }) {
  const { t } = useTranslation()

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

  return (
    <View style={styles.card}>
      <Text variant="heading">{t('missions.title')}</Text>
      {missions.xp && <XpBar xp={missions.xp as Xp} />}
      {missions.dailies ? <DailiesRow dailies={missions.dailies as Dailies} streak={missions.streak as Streak | null} /> : null}
      {missions.daily.length > 0 && (
        <>
          <View style={styles.group}>
            <Text variant="label">{t('missions.daily')}</Text>
            {(missions.daily as Entry[]).map((entry) => (
              <MissionRow key={entry.mission.id} entry={entry} reward={DAILY_REWARD} />
            ))}
            <Bonus count={DAILY_MISSIONS} reward={{ xp: DAILY_BONUS_XP, fragments: DAILY_BONUS_FRAGMENTS }} paid={Boolean(missions.dailyBonus)} />
            <Text variant="caption" style={{ fontSize: 12 }}>
              {t('missions.per_game', { xp: GAME_XP, count: GAMES_PER_DAY })}
            </Text>
            <Text variant="caption" style={{ fontSize: 12 }}>
              {t('missions.resets_daily')}
            </Text>
          </View>
          <View style={styles.group}>
            <Text variant="label">{t('missions.weekly')}</Text>
            {(missions.weekly as Entry[]).map((entry) => (
              <MissionRow key={entry.mission.id} entry={entry} reward={WEEKLY_TIERS[entry.mission.tier ?? 'easy']} />
            ))}
            <Bonus count={WEEKLY_MISSIONS} reward={{ xp: WEEKLY_BONUS_XP, fragments: WEEKLY_BONUS_FRAGMENTS }} paid={Boolean(missions.weeklyBonus)} />
            <Text variant="caption" style={{ fontSize: 12 }}>
              {t('missions.resets_weekly')}
            </Text>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  invite: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  group: { gap: space.sm },
  dailies: {
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dailiesLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: space.sm, rowGap: 2 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mission: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  missionIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  missionTop: { gap: 2 },
  missionTitle: { fontSize: 14, lineHeight: 19, flexShrink: 1 },
  missionMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  missionTier: { fontSize: 11, textTransform: 'uppercase' },
  missionReward: { fontSize: 12, marginLeft: 'auto' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  count: { fontSize: 12, fontVariant: ['tabular-nums'] },
  track: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  bonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
})

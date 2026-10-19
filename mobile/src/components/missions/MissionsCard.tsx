// Play tab: the daily and weekly missions of the signed-in player (paying XP, see @shared/utils/missions), or an
// invitation to sign in for a visitor.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useMissions } from '@shared/hooks/useMissions'
import {
  DAILY_BONUS_XP,
  DAILY_MISSION_XP,
  GAME_XP,
  GAMES_PER_DAY,
  WEEKLY_BONUS_XP,
  WEEKLY_MISSION_XP,
} from '@shared/utils/missions'

import {
  DAILY_BONUS_FRAGMENTS,
  DAILY_MISSION_FRAGMENTS,
  WEEKLY_BONUS_FRAGMENTS,
  WEEKLY_MISSION_FRAGMENTS,
} from '@shared/utils/flagCollection'

import { XpBar, type Xp } from '@/components/profile/XpBar'
import { Text, Touchable } from '@/components/ui'
import { colors, radius, space } from '@/theme'

type Entry = {
  mission: { id: string; icon: string; target: number }
  progress: number
  done: boolean
  paid: boolean
}

function MissionRow({ entry, reward, fragments }: { entry: Entry; reward: number; fragments: number }) {
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
          <Text variant="caption" color={done ? colors.accent : colors.textMuted} style={styles.missionReward}>
            {t('missions.reward', { xp: reward })} · {t('missions.fragments', { count: fragments })}
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { backgroundColor: color, width: `${(shown / mission.target) * 100}%` }]} />
        </View>
      </View>
    </View>
  )
}

function Bonus({ xp, fragments, paid }: { xp: number; fragments: number; paid: boolean }) {
  const { t } = useTranslation()
  return (
    <View style={[styles.bonus, paid && { borderColor: colors.accent }]}>
      <MaterialCommunityIcons name={paid ? 'check-circle' : 'gift-outline'} size={18} color={paid ? colors.accent : colors.warning} />
      <Text variant="caption" style={{ flex: 1 }}>
        {t('missions.bonus')}
      </Text>
      <Text variant="caption" color={paid ? colors.accent : colors.warning} style={{ fontSize: 12 }}>
        {t('missions.reward', { xp })} · {t('missions.fragments', { count: fragments })}
      </Text>
    </View>
  )
}

export function MissionsCard({ uid }: { uid: string | null | undefined }) {
  const { t } = useTranslation()
  const missions = useMissions(uid)

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
      {missions.daily.length > 0 && (
        <>
          <View style={styles.group}>
            <Text variant="label">{t('missions.daily')}</Text>
            {(missions.daily as Entry[]).map((entry) => (
              <MissionRow key={entry.mission.id} entry={entry} reward={DAILY_MISSION_XP} fragments={DAILY_MISSION_FRAGMENTS} />
            ))}
            <Bonus xp={DAILY_BONUS_XP} fragments={DAILY_BONUS_FRAGMENTS} paid={Boolean(missions.dailyBonus)} />
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
              <MissionRow key={entry.mission.id} entry={entry} reward={WEEKLY_MISSION_XP} fragments={WEEKLY_MISSION_FRAGMENTS} />
            ))}
            <Bonus xp={WEEKLY_BONUS_XP} fragments={WEEKLY_BONUS_FRAGMENTS} paid={Boolean(missions.weeklyBonus)} />
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
  mission: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  missionIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  missionTop: { gap: 2 },
  missionTitle: { fontSize: 14, lineHeight: 19, flexShrink: 1 },
  missionReward: { fontSize: 12, alignSelf: 'flex-end' },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceHigh, overflow: 'hidden' },
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

// Building blocks of a player profile: stats, daily streak, achievements, per-game records and history.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { usePlayerProfile } from '@shared/hooks/usePlayerProfile'
import { TIER_COLORS } from '@shared/utils/achievements'
import { decorationStyle } from '@shared/utils/decorations'
import { describeBest, describeDetails, describeMode, describeResult, formatPlayedAt } from '@shared/utils/profileFormat'
import { dailyTypesOn, dayKey, formatPlayTime } from '@shared/utils/profileStats'

import { Button, Text, Touchable } from '@/components/ui'
import { getGameByType } from '@/games'
import { colors, fonts, radius, space } from '@/theme'
import { RING_WIDTH_DOUBLE, ringBorder } from './decorationStyle'

export type Decoration = { frame: string; color: string }

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type HistoryGame = {
  id: string
  gameType: string
  mode: string
  playedAt: number
  score?: number
  attempts?: number
  solved?: boolean
  found?: number
  total?: number
  dailyKey?: string
  [extra: string]: unknown
}

type GameStats = { played: number; wins: number; dailies: number; bestScore: number | null; bestAttempts: number | null }

export type ProfileStats = {
  total: number
  totalTime: number
  countriesFound: number
  daysPlayed: number
  streak: { current: number; best: number }
  todayDaily: Record<string, HistoryGame>
  byGame: Record<string, GameStats>
}

export type Achievement = { id: string; tier: string; icon: IconName; target: number; progress: number; unlocked: boolean }

const AVATAR_COLORS = ['#3DDC97', '#7AA2FF', '#FF7A6B', '#F5B83D', '#C792FF', '#5FD4F4', '#FF9EC7', '#B4E05A']

export function avatarColor(username: string) {
  let hash = 0
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Gap between the ring of a frame and the avatar
const RING_GAP = 2
// Room around a decorated avatar, whatever its frame: the same for every frame (or none) so the layout never jumps.
const RING_ROOM = RING_GAP + RING_WIDTH_DOUBLE

// With `decoration` ({ frame, color } ids, see @shared/utils/decorations) the avatar gets room for a frame ring, drawn
// when the decoration has one. Without it (lists, other screens) the avatar is just the disc.
export function Avatar({ username, size = 44, decoration }: { username: string; size?: number; decoration?: Decoration | null }) {
  const disc = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(username), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.45, lineHeight: size * 0.55 }} color={colors.onAccent}>
        {username.charAt(0).toUpperCase()}
      </Text>
    </View>
  )
  if (decoration === undefined) return disc
  const ring = ringBorder(decorationStyle(decoration).frame)
  const outer = size + RING_ROOM * 2
  const ringSize = size + (RING_GAP + (ring?.borderWidth ?? 0)) * 2
  return (
    <View style={{ width: outer, height: outer, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[{ width: ringSize, height: ringSize, borderRadius: ringSize / 2, alignItems: 'center', justifyContent: 'center' }, ring]}>
        {disc}
      </View>
    </View>
  )
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="heading">{title}</Text>
      {right}
    </View>
  )
}

export function LinkButton({ label, onPress, color = colors.accent }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Touchable accessibilityRole="button" onPress={onPress} style={{ paddingVertical: space.xs, paddingHorizontal: space.sm }}>
      <Text variant="bodyStrong" color={color} style={{ fontSize: 14 }}>
        {label}
      </Text>
    </Touchable>
  )
}

function Tile({ icon, value, label, color }: { icon: IconName; value: string; label: string; color: string }) {
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text variant="number" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function StatTiles({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation()
  return (
    <View style={styles.tiles}>
      <Tile icon="gamepad-variant-outline" value={String(stats.total)} label={t('profile.games')} color={colors.highlight} />
      <Tile icon="timer-outline" value={formatPlayTime(stats.totalTime)} label={t('profile.play_time')} color={colors.warning} />
      <Tile icon="earth" value={String(stats.countriesFound)} label={t('profile.countries')} color={colors.accent} />
      <Tile icon="calendar-month-outline" value={String(stats.daysPlayed)} label={t('profile.days')} color="#C792FF" />
    </View>
  )
}

export function StreakCard({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation()
  // Dailies of today that the app knows
  const todayTypes = dailyTypesOn(dayKey()).filter((type: string) => getGameByType(type))
  const doneToday = todayTypes.filter((type: string) => stats.todayDaily[type]).length
  const alive = stats.streak.current > 0
  const [selected, setSelected] = useState<string | null>(null)
  const selectedGame = selected ? stats.todayDaily[selected] : undefined
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <View style={[styles.flame, { backgroundColor: alive ? `${colors.warning}26` : colors.surfaceHigh }]}>
          <MaterialCommunityIcons name="fire" size={30} color={alive ? colors.warning : colors.textFaint} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label">{t('profile.streak_title')}</Text>
          <Text variant="title" color={alive ? colors.warning : colors.text}>
            {t('profile.days_count', { count: stats.streak.current })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="caption">{t('profile.streak_best')}</Text>
          <Text variant="bodyStrong">{stats.streak.best}</Text>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption">{t('profile.today_title')}</Text>
          <Text variant="caption">{t('profile.today_done', { done: doneToday, total: todayTypes.length })}</Text>
        </View>
        <DailyChips today={stats.todayDaily} onSelect={setSelected} />
      </View>
      {selectedGame && <GameDetailModal game={selectedGame} visible onClose={() => setSelected(null)} />}
    </View>
  )
}

// One chip per daily challenge: colored when done (green if solved), faded otherwise.
// With `onSelect`, a done chip opens what the player did in that challenge.
export function DailyChips({
  today,
  size = 36,
  onSelect,
}: {
  today: Record<string, { solved?: boolean }>
  size?: number
  onSelect?: (type: string) => void
}) {
  const { t } = useTranslation()
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {dailyTypesOn(dayKey()).map((type: string) => {
        const game = getGameByType(type)
        const result = today[type]
        if (!game) return null
        const chip = (
          <View
            style={[
              styles.chip,
              { width: size, height: size, borderRadius: size / 3 },
              result ? { backgroundColor: `${game.color}26`, borderColor: game.color } : { opacity: 0.35 },
            ]}>
            <MaterialCommunityIcons name={game.icon} size={size * 0.5} color={result ? game.color : colors.textMuted} />
            {result && (
              <View style={[styles.chipBadge, { backgroundColor: result.solved === false ? colors.danger : colors.accent }]}>
                <MaterialCommunityIcons name={result.solved === false ? 'close' : 'check'} size={9} color={colors.bg} />
              </View>
            )}
          </View>
        )
        return result && onSelect ? (
          <Touchable key={type} accessibilityRole="button" accessibilityLabel={t(game.titleKey)} onPress={() => onSelect(type)}>
            {chip}
          </Touchable>
        ) : (
          <View key={type}>{chip}</View>
        )
      })}
    </View>
  )
}

export function AchievementsSection({ achievements }: { achievements: Achievement[] }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const unlocked = achievements.filter((item) => item.unlocked).length
  const visible = expanded ? achievements : achievements.slice(0, 6)
  return (
    <View style={{ gap: space.md }}>
      <SectionTitle
        title={t('profile.achievements_title')}
        right={<Text variant="bodyStrong" color={colors.textMuted}>{t('profile.achievements_count', { unlocked, total: achievements.length })}</Text>}
      />
      <View style={styles.grid}>
        {visible.map((achievement) => (
          <View
            key={achievement.id}
            style={[styles.achievement, achievement.unlocked ? { borderColor: `${TIER_COLORS[achievement.tier]}88` } : { opacity: 0.55 }]}
          >
            <View style={[styles.achievementIcon, { backgroundColor: achievement.unlocked ? `${TIER_COLORS[achievement.tier]}26` : colors.surfaceHigh }]}>
              <MaterialCommunityIcons name={achievement.icon} size={22} color={achievement.unlocked ? TIER_COLORS[achievement.tier] : colors.textFaint} />
            </View>
            <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>
              {t(`achievements.${achievement.id}.title`)}
            </Text>
            <Text variant="caption" numberOfLines={2} style={{ fontSize: 12, lineHeight: 16 }}>
              {t(`achievements.${achievement.id}.desc`)}
            </Text>
            <Text variant="caption" color={TIER_COLORS[achievement.tier]} style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: '700' }}>
              {t(`achievements.tiers.${achievement.tier}`)}
            </Text>
            {!achievement.unlocked && achievement.target > 1 && (
              <View style={{ gap: 3 }}>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${(achievement.progress / achievement.target) * 100}%` }]} />
                </View>
                <Text variant="caption" style={{ fontSize: 11 }}>
                  {achievement.progress}/{achievement.target}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
      {achievements.length > 6 && (
        <View style={{ alignItems: 'center' }}>
          <LinkButton label={expanded ? t('profile.show_less') : t('profile.history_all')} onPress={() => setExpanded((value) => !value)} />
        </View>
      )}
    </View>
  )
}

export function ByGameSection({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation()
  const entries = Object.entries(stats.byGame).sort((a, b) => b[1].played - a[1].played)
  if (entries.length === 0) return null
  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title={t('profile.by_game_title')} />
      <View style={styles.list}>
        {entries.map(([type, gameStats], index) => {
          const game = getGameByType(type)
          if (!game) return null
          const best = describeBest(gameStats, t, type)
          return (
            <View key={type} style={[styles.listRow, index > 0 && styles.listDivider]}>
              <View style={[styles.gameIcon, { backgroundColor: `${game.color}1F` }]}>
                <MaterialCommunityIcons name={game.icon} size={20} color={game.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {t(game.titleKey)}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {[
                    t('profile.games_count', { count: gameStats.played }),
                    gameStats.dailies > 0 ? t('profile.wins', { wins: gameStats.wins, dailies: gameStats.dailies }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {best && (
                <Text variant="bodyStrong" color={game.color} style={{ fontSize: 13 }}>
                  {best}
                </Text>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function GameHistoryRow({ game, divider }: { game: HistoryGame; divider?: boolean }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const meta = getGameByType(game.gameType)
  if (!meta) return null
  return (
    <>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('profile.details.title')}
        onPress={() => setOpen(true)}
        style={[styles.listRow, divider && styles.listDivider]}>
        <View style={[styles.gameIcon, { backgroundColor: `${meta.color}1F` }]}>
          <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {t(meta.titleKey)}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {describeMode(game, t)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', maxWidth: '45%' }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 13 }} color={game.solved === false ? colors.danger : colors.text}>
            {describeResult(game, t)}
          </Text>
          <Text variant="caption" style={{ fontSize: 12 }}>
            {formatPlayedAt(game.playedAt, i18n.language)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} />
      </Touchable>
      <GameDetailModal game={game} visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

// Everything recorded for one game of the history. A multiplayer game can reopen its room, with every player's results.
function GameDetailModal({ game, visible, onClose }: { game: HistoryGame; visible: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const meta = getGameByType(game.gameType)
  if (!meta) return null
  const roomCode = game.mode === 'multi' && typeof game.roomCode === 'string' ? game.roomCode : null
  const rows = describeDetails(game, t, i18n.language) as { key: string; label: string; value: string; failed?: boolean }[]
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('profile.details.close')}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <View style={[styles.gameIcon, { backgroundColor: `${meta.color}1F` }]}>
              <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="heading" numberOfLines={1}>
                {t(meta.titleKey)}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {describeMode(game, t)}
              </Text>
            </View>
          </View>
          <ScrollView style={{ flexGrow: 0 }}>
            {rows.map((row) => (
              <View key={row.key} style={styles.detailRow}>
                <Text variant="caption">{row.label}</Text>
                <Text variant="bodyStrong" style={styles.detailValue} color={row.failed ? colors.danger : colors.text}>
                  {row.value.charAt(0).toUpperCase() + row.value.slice(1)}
                </Text>
              </View>
            ))}
          </ScrollView>
          {roomCode && (
            <Button
              label={t('profile.details.open_room')}
              onPress={() => {
                onClose()
                router.push({ pathname: '/multi/[code]', params: { code: roomCode } })
              }}
            />
          )}
          <Button label={t('profile.details.close')} variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function HistoryList({ games }: { games: HistoryGame[] }) {
  return (
    <View style={styles.list}>
      {games.map((game, index) => (
        <GameHistoryRow key={game.id} game={game} divider={index > 0} />
      ))}
    </View>
  )
}

// Everything computed from a player's history. Reloads when the screen comes back into focus.
export function ProfileBody({
  uid,
  friendsCount,
  own,
  onSeeHistory,
}: {
  uid: string
  friendsCount?: number
  /** The signed-in player's profile: it keeps their public badges up to date. */
  own?: boolean
  onSeeHistory: () => void
}) {
  const { t } = useTranslation()
  const profile = usePlayerProfile(uid, { friendsCount, own })
  const { reload } = profile
  useFocusEffect(useCallback(() => reload(), [reload]))

  if (profile.loading) return <ActivityIndicator color={colors.accent} style={{ marginVertical: space.xxl }} />
  if (profile.error) return <Text variant="caption">{t('profile.load_error')}</Text>
  return (
    <ProfileView
      games={profile.games as HistoryGame[]}
      stats={profile.stats as ProfileStats}
      achievements={profile.achievements as Achievement[]}
      onSeeHistory={onSeeHistory}
    />
  )
}

// The sections themselves, from already loaded data.
export function ProfileView({
  games,
  stats,
  achievements,
  onSeeHistory,
}: {
  games: HistoryGame[]
  stats: ProfileStats
  achievements: Achievement[]
  onSeeHistory: () => void
}) {
  const { t } = useTranslation()
  return (
    <View style={{ gap: space.xl }}>
      <StatTiles stats={stats} />
      <StreakCard stats={stats} />
      <AchievementsSection achievements={achievements} />
      <View style={{ gap: space.md }}>
        <SectionTitle
          title={t('profile.history_title')}
          right={games.length > 5 ? <LinkButton label={t('profile.history_all')} onPress={onSeeHistory} /> : undefined}
        />
        {games.length === 0 ? <Text variant="caption">{t('profile.history_empty')}</Text> : <HistoryList games={games.slice(0, 5)} />}
      </View>
      <ByGameSection stats={stats} />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { gap: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flame: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  chipBadge: { position: 'absolute', right: -4, top: -4, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  achievement: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.warning },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md },
  listDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailValue: { flexShrink: 1, textAlign: 'right', fontSize: 14 },
  gameIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})

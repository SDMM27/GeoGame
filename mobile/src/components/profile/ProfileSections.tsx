// Building blocks of a player profile: stats, daily streak, achievements, per-game records and history.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { useBadges } from '@shared/hooks/useBadges'
import { usePlayerElo } from '@shared/hooks/usePlayerElo'
import { usePlayerRecords } from '@shared/hooks/usePlayerRecords'
import { usePlayerProfile } from '@shared/hooks/usePlayerProfile'
import { TIER_COLORS } from '@shared/utils/achievements'
import { decorationStyle } from '@shared/utils/decorations'
import { formatSeason } from '@shared/utils/elo'
import { describeBest, describeDetails, describeMode, describeResult } from '@shared/utils/profileFormat'
import { dailyTypesOn, dayKey, formatPlayTime } from '@shared/utils/profileStats'

import { CollapsibleSection } from '@/components/CollapsibleSection'
import { BadgeStrip } from '@/components/profile/BadgeStrip'
import { Stamp } from '@/components/flight'
import { Button, Segmented, Text, Touchable } from '@/components/ui'
import { getGameByType } from '@/games'
import GameEmblem from '@/components/GameEmblem'
import { colors, fonts, radius, space } from '@/theme'
import { RING_WIDTH_DOUBLE, ringBorder } from './decorationStyle'

export type Decoration = { frame: string; color: string }

// Whose profile: it keeps the folded state of the sections apart (see ProfileView).
type Scope = 'own' | 'player'

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

// A passport figure: mono value over its label
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" numberOfLines={2} style={{ fontSize: 11, lineHeight: 14 }}>
        {label}
      </Text>
    </View>
  )
}

export function StatTiles({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation()
  return (
    <View style={styles.tiles}>
      <Tile value={String(stats.total)} label={t('profile.games')} />
      <Tile value={formatPlayTime(stats.totalTime)} label={t('profile.play_time')} />
      <Tile value={String(stats.countriesFound)} label={t('profile.countries')} />
      <Tile value={String(stats.daysPlayed)} label={t('profile.days')} />
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
            <GameEmblem game={game.id} variant="glyph" size={size * 0.5} color={result ? game.color : colors.textMuted} />
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

export function AchievementsSection({ achievements, scope, uid }: { achievements: Achievement[]; scope: Scope; uid?: string }) {
  const { t } = useTranslation()
  const byUid: Record<string, { wins?: number } | undefined> = useBadges([uid])
  const wins = (uid ? byUid[uid]?.wins : 0) ?? 0
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Achievement | null>(null)
  const unlocked = achievements.filter((item) => item.unlocked).length
  const visible = expanded ? achievements : achievements.slice(0, 6)
  return (
    <CollapsibleSection
      id={`${scope}.achievements`}
      title={t('profile.achievements_title')}
      summary={
        wins > 0 ? (
          <>
            <Text variant="caption">{t('profile.achievements_count', { unlocked, total: achievements.length })}</Text>
            <BadgeStrip badges={{ top: [], count: 0, wins }} />
          </>
        ) : (
          t('profile.achievements_count', { unlocked, total: achievements.length })
        )
      }
      defaultOpen={scope === 'player'}>
      {wins > 0 && (
        <Text variant="caption" style={{ marginBottom: space.sm }}>
          {t('league.champion_wins', { count: wins })}
        </Text>
      )}
      <View style={[styles.grid, { marginBottom: space.md }]}>
        {visible.map((achievement) => {
          const tint = achievement.unlocked ? TIER_COLORS[achievement.tier] : colors.textFaint
          const partial = !achievement.unlocked && achievement.target > 1
          return (
            <Touchable
              key={achievement.id}
              accessibilityRole="button"
              accessibilityLabel={`${t(`achievements.${achievement.id}.title`)}, ${t(`achievements.${achievement.id}.desc`)}`}
              onPress={() => setSelected(achievement)}
              style={styles.achievement}>
              {/* Unlocked: a solid stamp in the tier's ink; locked: a dashed outline */}
              <View
                style={[
                  styles.stampTile,
                  achievement.unlocked
                    ? { borderColor: tint, backgroundColor: `${tint}1F`, transform: [{ rotate: '-3deg' }] }
                    : { borderColor: colors.borderStrong, borderStyle: 'dashed' },
                ]}>
                <MaterialCommunityIcons name={achievement.icon} size={26} color={tint} />
              </View>
              <Text variant="bodyStrong" numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, textAlign: 'center' }}>
                {t(`achievements.${achievement.id}.title`)}
              </Text>
              <Text style={[styles.stampTier, { color: partial ? colors.textMuted : tint }]}>
                {partial ? `${achievement.progress}/${achievement.target}` : t(`achievements.tiers.${achievement.tier}`)}
              </Text>
            </Touchable>
          )
        })}
      </View>
      {achievements.length > 6 && (
        <View style={{ alignItems: 'center' }}>
          <LinkButton label={expanded ? t('profile.show_less') : t('profile.history_all')} onPress={() => setExpanded((value) => !value)} />
        </View>
      )}
      {selected && <AchievementModal achievement={selected} onClose={() => setSelected(null)} />}
    </CollapsibleSection>
  )
}

// One achievement in full: the cards of the grid cut long titles and descriptions short.
function AchievementModal({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  const { t } = useTranslation()
  const color = TIER_COLORS[achievement.tier]
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('profile.details.close')}>
        <Pressable style={[styles.sheet, { alignItems: 'center' }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.achievementBig, { backgroundColor: achievement.unlocked ? `${color}26` : colors.surfaceHigh, borderColor: achievement.unlocked ? color : colors.border }]}>
            <MaterialCommunityIcons name={achievement.icon} size={40} color={achievement.unlocked ? color : colors.textFaint} />
            {achievement.unlocked && (
              <View style={[styles.chipBadge, { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons name="check" size={14} color={colors.bg} />
              </View>
            )}
          </View>
          <Text variant="caption" color={color} style={{ textTransform: 'uppercase', fontWeight: '700' }}>
            {t(`achievements.tiers.${achievement.tier}`)}
          </Text>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {t(`achievements.${achievement.id}.title`)}
          </Text>
          <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
            {t(`achievements.${achievement.id}.desc`)}
          </Text>
          {!achievement.unlocked && achievement.target > 1 && (
            <View style={{ alignSelf: 'stretch', gap: space.xs }}>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${(achievement.progress / achievement.target) * 100}%` }]} />
              </View>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                {achievement.progress}/{achievement.target}
              </Text>
            </View>
          )}
          <View style={{ alignSelf: 'stretch' }}>
            <Button label={t('profile.details.close')} variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function ByGameSection({ stats, scope }: { stats: ProfileStats; scope: Scope }) {
  const { t } = useTranslation()
  const entries = Object.entries(stats.byGame).sort((a, b) => b[1].played - a[1].played)
  if (entries.length === 0) return null
  const top = getGameByType(entries[0][0])
  const summary = top ? `${t(top.titleKey)} · ${t('profile.games_count', { count: entries[0][1].played })}` : undefined
  return (
    <CollapsibleSection id={`${scope}.by_game`} title={t('profile.by_game_title')} summary={summary}>
      <View style={styles.list}>
        {entries.map(([type, gameStats], index) => {
          const game = getGameByType(type)
          if (!game) return null
          const best = describeBest(gameStats, t, type)
          return (
            <View key={type} style={[styles.listRow, index > 0 && styles.listDivider]}>
              <View style={[styles.gameIcon, { backgroundColor: `${game.color}1F` }]}>
                <GameEmblem game={game.id} variant="glyph" size={20} color={game.color} />
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
    </CollapsibleSection>
  )
}

type RecordCell = { key: string; mode: string; score: number | null; perfect: number; isPerfect: boolean; ratio: number }
type RecordsGrid = { rows: { game: string; difficulties: RecordCell[]; continents: RecordCell[] }[]; perfectCount: number; total: number }

// Best solo score of each game by difficulty or continent: perfect ones in gold, the others with how close they are.
export function RecordsSection({ uid, scope }: { uid: string; scope: Scope }) {
  const { t } = useTranslation()
  const { loading, error, grid, reload } = usePlayerRecords(uid) as { loading: boolean; error: boolean; grid: RecordsGrid | null; reload: () => void }
  const [by, setBy] = useState<'difficulties' | 'continents'>('difficulties')
  // The first load is the hook's own: only the next focuses reload
  const focused = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (focused.current) reload()
      focused.current = true
    }, [reload]),
  )
  if (loading || error || !grid) return null
  const labelKey = by === 'difficulties' ? 'difficulties' : 'continents'
  const summary = (
    <Text variant="bodyStrong" color={grid.perfectCount > 0 ? colors.warning : colors.textMuted} numberOfLines={1} style={{ fontSize: 13, flexShrink: 1 }}>
      {t('profile.records_perfect', { count: grid.perfectCount, total: grid.total })}
    </Text>
  )
  return (
    <CollapsibleSection id={`${scope}.records`} title={t('profile.records_title')} summary={summary} defaultOpen={scope === 'player'}>
      <Segmented
        value={by}
        onChange={setBy}
        options={[
          { value: 'difficulties', label: t('selection.by_difficulty') },
          { value: 'continents', label: t('selection.by_continent') },
        ]}
      />
      <View style={[styles.card, { gap: space.sm, padding: space.md }]}>
        <View style={styles.recordsRow}>
          {grid.rows[0][by].map((cell) => (
            <Text key={cell.mode} variant="caption" numberOfLines={1} adjustsFontSizeToFit style={styles.recordsHeader}>
              {t(`${labelKey}.${cell.mode}`)}
            </Text>
          ))}
        </View>
        {grid.rows.map((row) => {
          const game = getGameByType(row.game)
          if (!game) return null
          return (
            <View key={row.game} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <GameEmblem game={game.id} variant="glyph" size={14} color={game.color} />
                <Text variant="caption" numberOfLines={1} style={{ fontSize: 12 }}>
                  {t(game.titleKey)}
                </Text>
              </View>
              <View style={styles.recordsRow}>
                {row[by].map((cell) => (
                  <View
                    key={cell.key}
                    style={[styles.recordCell, cell.isPerfect && { borderColor: colors.warning, backgroundColor: `${colors.warning}26` }]}>
                    {cell.score == null ? (
                      <Text variant="caption" color={colors.textMuted}>
                        —
                      </Text>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          {cell.isPerfect && <MaterialCommunityIcons name="star" size={11} color={colors.warning} />}
                          <Text
                            variant="bodyStrong"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            color={cell.isPerfect ? colors.warning : colors.text}
                            style={{ fontSize: 13, flexShrink: 1 }}>
                            {cell.score}
                          </Text>
                        </View>
                        {!cell.isPerfect && (
                          <View style={[styles.track, { alignSelf: 'stretch' }]}>
                            <View style={[styles.bar, { width: `${cell.ratio * 100}%`, backgroundColor: game.color }]} />
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )
        })}
      </View>
    </CollapsibleSection>
  )
}

type EloEntry = { key: string; rating: number; played: boolean; games?: number; wins?: number; found?: number }

// Elo ratings of the current season: duels, then each solo mode.
export function EloSection({ uid, scope }: { uid: string; scope: Scope }) {
  const { t } = useTranslation()
  const { loading, error, season, entries } = usePlayerElo(uid) as { loading: boolean; error: boolean; season: string; entries: EloEntry[] }
  if (loading || error) return null
  const played = entries.filter((entry) => entry.played)
  const summary = played.length > 0 ? `${Math.max(...played.map((entry) => entry.rating))} · ${formatSeason(season, t)}` : t('elo.unplayed')
  return (
    <CollapsibleSection id={`${scope}.elo`} title={t('elo.profile_title')} summary={summary}>
      <View style={styles.list}>
        {entries.map((entry, index) => {
          const game = entry.key === 'duel' ? undefined : getGameByType(entry.key)
          const color = game?.color ?? colors.highlight
          let detail = t('elo.unplayed')
          if (entry.played) {
            detail = entry.key === 'duel' ? t('elo.duel_detail', { games: entry.games, wins: entry.wins }) : t('elo.found_count', { count: entry.found })
          }
          return (
            <View key={entry.key} style={[styles.listRow, index > 0 && styles.listDivider]}>
              <View style={[styles.gameIcon, { backgroundColor: `${color}1F` }]}>
                {game ? (
                  <GameEmblem game={game.id} variant="glyph" size={20} color={color} />
                ) : (
                  <MaterialCommunityIcons name="sword-cross" size={20} color={color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {game ? t(game.titleKey) : t('elo.duel')}
                </Text>
                <Text variant="caption" numberOfLines={1}>
                  {detail}
                </Text>
              </View>
              <Text variant="bodyStrong" color={color} style={{ fontSize: 15 }}>
                {entry.rating}
              </Text>
            </View>
          )
        })}
      </View>
    </CollapsibleSection>
  )
}

// « 10 NOV. · 18:42 »: the board's date of a game (not the relative « today » of formatPlayedAt)
function boardDate(playedAt: number, language: string) {
  const date = new Date(playedAt)
  const day = date.toLocaleDateString(language, { day: 'numeric', month: 'short' })
  const time = date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`.toLocaleUpperCase(language)
}

export function GameHistoryRow({ game, divider }: { game: HistoryGame; divider?: boolean }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const meta = getGameByType(game.gameType)
  if (!meta) return null
  const failed = game.solved === false
  return (
    <>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('profile.details.title')}
        onPress={() => setOpen(true)}
        style={[styles.listRow, divider && styles.listDivider]}>
        <GameEmblem game={game.gameType} size={38} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {t(meta.titleKey)}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {describeMode(game, t)}
          </Text>
          <Text style={styles.rowDate} numberOfLines={1}>
            {boardDate(game.playedAt, i18n.language)}
          </Text>
        </View>
        <View style={styles.rowResult}>
          <Text variant="bodyStrong" numberOfLines={2} style={styles.rowScore} color={failed ? colors.danger : colors.text}>
            {describeResult(game, t)}
          </Text>
          <Stamp
            label={t(failed ? 'carnet_games.stamp_diverted' : 'carnet_games.stamp_landed').toLocaleUpperCase()}
            tone={failed ? 'bad' : 'ok'}
            rotate={-3}
            animate={false}
            size={9}
            style={styles.rowStamp}
          />
        </View>
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
    <View style={styles.table}>
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
  collection,
  onSeeHistory,
}: {
  uid: string
  friendsCount?: number
  /** The signed-in player's profile: it keeps their public badges up to date. */
  own?: boolean
  /** Shown right after the streak card. */
  collection?: ReactNode
  onSeeHistory: () => void
}) {
  const { t } = useTranslation()
  const profile = usePlayerProfile(uid, { friendsCount, own })
  const { reload } = profile
  useFocusEffect(useCallback(() => reload(), [reload]))

  if (profile.loading) return <ActivityIndicator color={colors.accent} style={{ marginVertical: space.xxl }} />
  if (profile.error) {
    return (
      <View style={{ gap: space.xl }}>
        <Text variant="caption">{t('profile.load_error')}</Text>
        {collection}
      </View>
    )
  }
  return (
    <ProfileView
      games={profile.games as HistoryGame[]}
      stats={profile.stats as ProfileStats}
      achievements={profile.achievements as Achievement[]}
      uid={uid}
      own={own}
      collection={collection}
      onSeeHistory={onSeeHistory}
    />
  )
}

// The sections themselves, from already loaded data.
export function ProfileView({
  games,
  stats,
  achievements,
  uid,
  own = false,
  collection,
  onSeeHistory,
}: {
  games: HistoryGame[]
  stats: ProfileStats
  achievements: Achievement[]
  /** Whose Elo ratings to show (loaded on their own); none when left out. */
  uid?: string
  /** Your own profile: more sections start folded. */
  own?: boolean
  /** Shown right after the streak card. */
  collection?: ReactNode
  onSeeHistory: () => void
}) {
  const { t } = useTranslation()
  const scope: Scope = own ? 'own' : 'player'
  return (
    <View style={{ gap: space.xl }}>
      <StatTiles stats={stats} />
      <StreakCard stats={stats} />
      {collection}
      {uid ? <RecordsSection uid={uid} scope={scope} /> : null}
      <AchievementsSection achievements={achievements} scope={scope} uid={uid} />
      {uid ? <EloSection uid={uid} scope={scope} /> : null}
      <CollapsibleSection
        id={`${scope}.history`}
        title={t('profile.history_title')}
        summary={games.length > 0 ? (describeResult(games[0], t) as string) : undefined}>
        {games.length === 0 ? <Text variant="caption">{t('profile.history_empty')}</Text> : <HistoryList games={games.slice(0, 5)} />}
        {games.length > 5 ? (
          <View style={{ alignItems: 'center', marginTop: space.md }}>
            <LinkButton label={t('profile.history_all')} onPress={onSeeHistory} />
          </View>
        ) : null}
      </CollapsibleSection>
      <ByGameSection stats={stats} scope={scope} />
    </View>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { gap: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tileValue: { fontFamily: fonts.monoBold, fontSize: 18, lineHeight: 24, color: colors.text, fontVariant: ['tabular-nums'] },
  tile: {
    flexBasis: '22%',
    flexGrow: 1,
    minWidth: 72,
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flame: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  chipBadge: { position: 'absolute', right: -4, top: -4, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  achievement: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: space.xs, paddingVertical: space.sm, minHeight: 44 },
  stampTile: { width: 64, height: 64, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  stampTier: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  achievementIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  achievementBig: { width: 72, height: 72, borderRadius: radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.warning },
  recordsRow: { flexDirection: 'row', gap: 4 },
  recordsHeader: { flex: 1, textAlign: 'center', fontSize: 10 },
  recordCell: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
  },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  table: { borderRadius: radius.lg, backgroundColor: colors.board, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md },
  rowDate: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5, color: colors.textMuted, marginTop: 2 },
  rowResult: { alignItems: 'flex-end', gap: 6, maxWidth: '45%' },
  rowScore: { fontFamily: fonts.monoBold, fontSize: 12, textAlign: 'right' },
  rowStamp: { alignSelf: 'flex-end', paddingVertical: 2, paddingHorizontal: 6, borderWidth: 1.5, borderRadius: 6 },
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

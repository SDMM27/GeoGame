// Glue between a game screen and its multiplayer room (`?room=CODE`):
// picks the room's game to play, loads its seeded content, reports progress and the final result,
// shows the live standings.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { collection, getDoc, getDocs, query, where } from 'firebase/firestore'
import type { TFunction } from 'i18next'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { firestore } from '@shared/Firebase'
import useMultiplayerRoom from '@shared/hooks/useMultiplayerRoom'
import {
  nextGameToPlay,
  overallStandings,
  progressForGame,
  resultsForGame,
  roomForGame,
  roomGames,
} from '@shared/utils/multiplayerRoom'
import { formatTime } from '@shared/utils/formatTime'
import { GAME_TYPES } from '@shared/utils/gameTypes'

import { HudPill } from '@/components/game/GameTopBar'
import { BadgeStrip, useRoomBadges } from '@/components/profile/BadgeStrip'
import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'
import { getRoomContent, rankRoomResults, scoringMode, type RoomContent } from './content'
import {
  getPlayerId,
  reportProgress,
  roomRef,
  submitResult,
  type GameResult,
  type PlayerProgress,
  type PlayerResult,
  type Room,
  type SurvivalProgress,
} from './room'

export type RoomPlay = {
  // The room as seen by the game being played: its `game`, `gameIndex` and own `seed`
  room: Room & { gameIndex: number }
  content: RoomContent
  // Countries found / questions answered / survival rounds cleared so far (and the survival state)
  reportFound: (found: number, survival?: SurvivalProgress) => void
  finish: (result: Omit<GameResult, 'total'>) => void
  // Back to the room screen (standings)
  exit: () => void
}

// Games (`CODE_index`) whose result was sent from this device: each game of a room is played once.
const finishedGames = new Set<string>()

export const openRoom = (code: string) => router.replace({ pathname: '/multi/[code]', params: { code } })

// Loads the room and the player's results once, then renders the game they have to play with its content.
export function RoomGate({ code, children }: { code: string; children: (play: RoomPlay) => ReactNode }) {
  const { t } = useTranslation()
  const [room, setRoom] = useState<RoomPlay['room'] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const playerId = getPlayerId()
    Promise.all([
      getDoc(roomRef(code)),
      getDocs(query(collection(firestore, 'rooms', code, 'gameResults'), where('playerId', '==', playerId))),
    ])
      .then(([snap, mine]) => {
        if (cancelled) return
        if (!snap.exists()) return setFailed(true)
        const loaded = { id: snap.id, ...(snap.data() as Omit<Room, 'id'>) }
        const index: number | null = nextGameToPlay(loaded, mine.docs.map((d) => d.data()), playerId)
        // Nothing left to play here (already played, or not launched yet): back to the room
        if (index == null) return openRoom(code)
        setRoom(roomForGame(loaded, index))
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const content = useMemo(() => (room ? getRoomContent(room.game, room.seed) : null), [room])
  const total = content?.total ?? 0
  const gameIndex = room?.gameIndex ?? 0
  const gameKey = `${code}_${gameIndex}`

  const reportFound = useCallback(
    (found: number, survival?: SurvivalProgress) => {
      if (finishedGames.has(gameKey)) return
      reportProgress(code, { gameIndex, found, total, finished: false, ...survival }).catch(console.error)
    },
    [code, gameKey, gameIndex, total]
  )

  const finish = useCallback(
    (result: Omit<GameResult, 'total'>) => {
      if (finishedGames.has(gameKey) || !room) return
      finishedGames.add(gameKey)
      const pseudo = room.players[getPlayerId()]?.pseudo ?? '?'
      const progress: PlayerProgress = { gameIndex, found: result.countriesSolved, total, finished: true }
      Promise.all([submitResult(code, gameIndex, pseudo, { ...result, total }), reportProgress(code, progress)]).catch(console.error)
    },
    [code, gameKey, gameIndex, room, total]
  )

  const play = useMemo(
    () => (room && content ? { room, content, reportFound, finish, exit: () => openRoom(code) } : null),
    [room, content, reportFound, finish, code]
  )

  // Announce the player as soon as the game starts
  useEffect(() => {
    if (room) reportProgress(code, { gameIndex, found: 0, total, finished: false }).catch(console.error)
  }, [code, room, gameIndex, total])

  if (failed) {
    return (
      <View style={styles.center}>
        <Text variant="body" color={colors.danger}>
          {t('mobile.multi.not_found')}
        </Text>
        <Button label={t('mobile.common.back')} variant="secondary" onPress={() => router.replace('/')} />
      </View>
    )
  }
  if (!play) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.textMuted} />
      </View>
    )
  }
  return children(play)
}

// Reports the found count whenever it grows.
export function useReportFound(play: RoomPlay | null | undefined, found: number) {
  const reportFound = play?.reportFound
  useEffect(() => {
    if (reportFound && found > 0) reportFound(found)
  }, [reportFound, found])
}

// ─── Live standings ────────────────────────────────────────────────────────

type Progress = Record<string, PlayerProgress>
type Results = Record<string, PlayerResult>

function useLiveRoom(code: string) {
  const { room, progress, gameResults } = useMultiplayerRoom(code) as { room: Room | null; progress: Progress; gameResults: Results }
  return { room, progress, results: Object.values(gameResults) }
}

export function resultLine(game: Room['game'], result: PlayerResult, t: TFunction) {
  const time = formatTime(result.elapsedTime ?? 0).slice(0, 5)
  if (game.type === GAME_TYPES.SURVIVAL) return `${t('survival.rounds_count', { count: result.weightedScore ?? 0 })} · ${time}`
  if (scoringMode(game) === 'solved') {
    return `${result.countriesSolved}/${result.total} · ${t('mobile.multi.errors', { count: result.attempts })} · ${time}`
  }
  return `${Math.round(result.weightedScore)} ${t('units.pts')} · ${time}`
}

const MEDALS = ['🥇', '🥈', '🥉']

// Standings of game `gameIndex`, or of every game ('overall', points by rank summed).
// Rooms of several games get tabs to switch between them, unless `gameIndex` is fixed by the caller.
export function Standings({ code, title, gameIndex }: { code: string; title?: string; gameIndex?: number }) {
  const { t } = useTranslation()
  const { room, progress, results } = useLiveRoom(code)
  const [tab, setTab] = useState<number | 'overall'>('overall')
  if (!room) return <ActivityIndicator color={colors.textMuted} style={{ paddingVertical: space.lg }} />

  const games: Room['game'][] = roomGames(room)
  const shown = gameIndex ?? (games.length === 1 ? 0 : tab)

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{title ?? t('mobile.multi.standings')}</Text>
      {gameIndex == null && games.length > 1 && (
        <View style={styles.tabs}>
          {(['overall', ...games.map((_, i) => i)] as const).map((value) => (
            <Text
              key={value}
              variant="caption"
              onPress={() => setTab(value)}
              color={shown === value ? colors.accent : colors.textMuted}
              style={[styles.tab, shown === value && { borderColor: colors.accent }]}>
              {value === 'overall' ? t('mp_room.overall') : t('mp_room.game_n', { n: value + 1 })}
            </Text>
          ))}
        </View>
      )}
      {shown === 'overall' ? (
        <OverallRows room={room} results={results} />
      ) : (
        <GameRows room={room} progress={progress} results={results} index={shown} />
      )}
    </View>
  )
}

function OverallRows({ room, results }: { room: Room; results: PlayerResult[] }) {
  const { t } = useTranslation()
  const playerId = getPlayerId()
  const total = roomGames(room).length
  const standings: { playerId: string; pseudo: string; points: number; played: number; rank: number }[] = overallStandings(room, results)
  const badges = useRoomBadges(room.players)
  if (standings.length === 0) return <Text variant="caption">{t('mobile.multi.no_players')}</Text>
  return (
    <>
      {standings.map((entry, index) => {
        const me = entry.playerId === playerId
        return (
          <View key={entry.playerId} style={[styles.row, index < 3 && styles.rowTop, me && styles.rowMe]}>
            <Text variant="bodyStrong" style={styles.rank}>
              {MEDALS[entry.rank - 1] ?? `${entry.rank}`}
            </Text>
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {entry.pseudo}
              {me ? ` (${t('mobile.multi.you')})` : ''}
            </Text>
            <BadgeStrip badges={badges[entry.playerId]} />
            <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
              {t('mp_room.points', { count: entry.points })} · {entry.played}/{total}
            </Text>
          </View>
        )
      })}
    </>
  )
}

function GameRows({ room, progress, results, index }: { room: Room; progress: Progress; results: PlayerResult[]; index: number }) {
  const { t } = useTranslation()
  const playerId = getPlayerId()
  const game: Room['game'] = roomGames(room)[index]
  const ranked = rankRoomResults(game, resultsForGame(results, index))
  const live: Progress = progressForGame(progress, index)
  const badges = useRoomBadges(room.players)
  const finishedIds = new Set(ranked.map((result) => result.playerId))
  const others = Object.entries(room.players).filter(([id]) => !finishedIds.has(id))

  return (
    <>
      {ranked.map((result, index) => {
        const me = result.playerId === playerId
        return (
          <View key={result.playerId} style={[styles.row, index < 3 && styles.rowTop, me && styles.rowMe]}>
            <Text variant="bodyStrong" style={styles.rank}>
              {MEDALS[result.rank - 1] ?? `${result.rank}`}
            </Text>
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {result.pseudo}
              {me ? ` (${t('mobile.multi.you')})` : ''}
            </Text>
            <BadgeStrip badges={badges[result.playerId]} />
            <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
              {resultLine(game, result, t)}
            </Text>
          </View>
        )
      })}
      {others.map(([id, player]) => {
        const playing = live[id]
        return (
          <View key={id} style={styles.row}>
            <MaterialCommunityIcons name={playing ? 'progress-clock' : 'clock-outline'} size={18} color={colors.textFaint} style={styles.rank} />
            <Text variant="body" numberOfLines={1} color={colors.textMuted} style={{ flex: 1 }}>
              {player.pseudo}
              {id === playerId ? ` (${t('mobile.multi.you')})` : ''}
            </Text>
            <BadgeStrip badges={badges[id]} />
            <Text variant="caption">
              {!playing
                ? t('mobile.multi.not_played')
                : game.type === GAME_TYPES.SURVIVAL
                  ? `${t('mobile.multi.playing')} · ${t('survival.rounds_count', { count: playing.found })} · ${playing.lives ?? game.lives} ❤️`
                  : `${t('mobile.multi.playing')} · ${playing.found}/${playing.total}`}
            </Text>
          </View>
        )
      })}
      {ranked.length === 0 && others.length === 0 && <Text variant="caption">{t('mobile.multi.no_players')}</Text>}
    </>
  )
}

// HUD pill: your position among the players of this game, by countries found so far.
export function RoomHudPill({ code, gameIndex }: { code: string; gameIndex: number }) {
  const { room, progress: all } = useLiveRoom(code)
  const playerId = getPlayerId()
  if (!room) return null
  const ids = Object.keys(room.players)
  if (ids.length < 2) return null
  const progress: Progress = progressForGame(all, gameIndex)
  const mine = progress[playerId]?.found ?? 0
  const ahead = ids.filter((id) => id !== playerId && (progress[id]?.found ?? 0) > mine).length
  return <HudPill icon="account-group" label={`${ahead + 1}/${ids.length}`} color={colors.highlight} />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl, backgroundColor: colors.bg },
  card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 6, paddingHorizontal: space.sm, borderRadius: radius.sm },
  rowTop: { backgroundColor: colors.surfaceHigh },
  rowMe: { borderWidth: 1, borderColor: `${colors.accent}66` },
  rank: { width: 28, textAlign: 'center' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tab: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
})

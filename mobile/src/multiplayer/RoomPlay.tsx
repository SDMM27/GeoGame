// Glue between a game screen and its multiplayer room (`?room=CODE`):
// loads the room's seeded content, reports progress and the final result, shows the live standings.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { getDoc } from 'firebase/firestore'
import type { TFunction } from 'i18next'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import useMultiplayerRoom from '@shared/hooks/useMultiplayerRoom'
import { formatTime } from '@shared/utils/formatTime'

import { HudPill } from '@/components/game/GameTopBar'
import { Button, Text } from '@/components/ui'
import { colors, radius, space } from '@/theme'
import { getRoomContent, rankRoomResults, scoringMode, type RoomContent } from './content'
import { getPlayerId, reportProgress, roomRef, submitResult, type GameResult, type PlayerProgress, type PlayerResult, type Room } from './room'

export type RoomPlay = {
  room: Room
  content: RoomContent
  // Countries found / questions answered so far
  reportFound: (found: number) => void
  finish: (result: Omit<GameResult, 'total'>) => void
  // Back to the room screen (standings)
  exit: () => void
}

// Rooms whose result was sent from this device: a room is played once.
const finishedRooms = new Set<string>()

export const openRoom = (code: string) => router.replace({ pathname: '/multi/[code]', params: { code } })

// Loads the room once, then renders the game with the room's content.
export function RoomGate({ code, children }: { code: string; children: (play: RoomPlay) => ReactNode }) {
  const { t } = useTranslation()
  const [room, setRoom] = useState<Room | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDoc(roomRef(code))
      .then((snap) => {
        if (cancelled) return
        if (snap.exists()) setRoom({ id: snap.id, ...(snap.data() as Omit<Room, 'id'>) })
        else setFailed(true)
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

  const reportFound = useCallback(
    (found: number) => {
      if (!finishedRooms.has(code)) reportProgress(code, { found, total, finished: false }).catch(console.error)
    },
    [code, total]
  )

  const finish = useCallback(
    (result: Omit<GameResult, 'total'>) => {
      if (finishedRooms.has(code) || !room) return
      finishedRooms.add(code)
      const pseudo = room.players[getPlayerId()]?.pseudo ?? '?'
      const progress: PlayerProgress = { found: result.countriesSolved, total, finished: true }
      Promise.all([submitResult(code, pseudo, { ...result, total }), reportProgress(code, progress)]).catch(console.error)
    },
    [code, room, total]
  )

  const play = useMemo(
    () => (room && content ? { room, content, reportFound, finish, exit: () => openRoom(code) } : null),
    [room, content, reportFound, finish, code]
  )

  // Announce the player as soon as the game starts
  useEffect(() => {
    if (room) reportProgress(code, { found: 0, total, finished: false }).catch(console.error)
  }, [code, room, total])

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

export function resultLine(room: Room, result: PlayerResult, t: TFunction) {
  const time = formatTime(result.elapsedTime ?? 0).slice(0, 5)
  if (scoringMode(room.game) === 'solved') {
    return `${result.countriesSolved}/${result.total} · ${t('mobile.multi.errors', { count: result.attempts })} · ${time}`
  }
  return `${Math.round(result.weightedScore)} ${t('units.pts')} · ${time}`
}

const MEDALS = ['🥇', '🥈', '🥉']

export function Standings({ code, title }: { code: string; title?: string }) {
  const { t } = useTranslation()
  const { room, progress, results } = useLiveRoom(code)
  const playerId = getPlayerId()
  if (!room) return <ActivityIndicator color={colors.textMuted} style={{ paddingVertical: space.lg }} />

  const ranked = rankRoomResults(room.game, results)
  const finishedIds = new Set(results.map((result) => result.playerId))
  const others = Object.entries(room.players).filter(([id]) => !finishedIds.has(id))

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{title ?? t('mobile.multi.standings')}</Text>
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
            <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
              {resultLine(room, result, t)}
            </Text>
          </View>
        )
      })}
      {others.map(([id, player]) => {
        const live = progress[id]
        return (
          <View key={id} style={styles.row}>
            <MaterialCommunityIcons name={live ? 'progress-clock' : 'clock-outline'} size={18} color={colors.textFaint} style={styles.rank} />
            <Text variant="body" numberOfLines={1} color={colors.textMuted} style={{ flex: 1 }}>
              {player.pseudo}
              {id === playerId ? ` (${t('mobile.multi.you')})` : ''}
            </Text>
            <Text variant="caption">
              {live ? `${t('mobile.multi.playing')} · ${live.found}/${live.total}` : t('mobile.multi.not_played')}
            </Text>
          </View>
        )
      })}
      {ranked.length === 0 && others.length === 0 && <Text variant="caption">{t('mobile.multi.no_players')}</Text>}
    </View>
  )
}

// HUD pill: your position among the players, by countries found so far.
export function RoomHudPill({ code }: { code: string }) {
  const { room, progress } = useLiveRoom(code)
  const playerId = getPlayerId()
  if (!room) return null
  const ids = Object.keys(room.players)
  if (ids.length < 2) return null
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
})

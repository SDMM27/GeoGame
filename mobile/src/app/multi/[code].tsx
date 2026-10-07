// A multiplayer room: join with a username, lobby and countdown (live), play, then the live standings.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useMultiplayerRoom from '@shared/hooks/useMultiplayerRoom'
import { serverNow } from '@shared/utils/serverTime'

import { Button, Pill, Text, Touchable } from '@/components/ui'
import { getGame } from '@/games'
import { Standings } from '@/multiplayer/RoomPlay'
import { getPlayerId, getSavedPseudo, joinRoom, launchRoom, rememberRoom, type PlayerResult, type Room } from '@/multiplayer/room'
import { navigate } from '@/shims/react-router-dom'
import { colors, fonts, radius, space } from '@/theme'

// Time left before a live start, on the server's clock.
function useCountdown(startAt: number | null) {
  const [, setTick] = useState(0)
  const remaining = startAt != null ? Math.max(0, startAt - serverNow()) : null
  const running = remaining != null && remaining > 0
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((tick) => tick + 1), 200)
    return () => clearInterval(id)
  }, [running])
  return remaining
}

function JoinCard({ room }: { room: Room }) {
  const { t } = useTranslation()
  const [pseudo, setPseudo] = useState(getSavedPseudo)
  const [joining, setJoining] = useState(false)
  const onJoin = async () => {
    const name = pseudo.trim()
    if (!name) return
    setJoining(true)
    try {
      await joinRoom(room, name)
    } catch (error) {
      console.error(error)
      setJoining(false)
    }
  }
  return (
    <View style={styles.card}>
      <Text variant="body" color={colors.textMuted}>
        {t('mobile.multi.join_hint')}
      </Text>
      <TextInput
        value={pseudo}
        onChangeText={setPseudo}
        placeholder={t('labels.your_username')}
        placeholderTextColor={colors.textFaint}
        maxLength={20}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={onJoin}
        style={styles.input}
      />
      <Button label={t('mobile.multi.join')} onPress={onJoin} loading={joining} disabled={!pseudo.trim()} />
    </View>
  )
}

function Players({ room }: { room: Room }) {
  const { t } = useTranslation()
  const playerId = getPlayerId()
  const players = Object.entries(room.players)
  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('mobile.multi.players', { count: players.length })}</Text>
      {players.map(([id, player]) => (
        <Animated.View key={id} entering={FadeIn.duration(250)} style={styles.playerRow}>
          <MaterialCommunityIcons name="account-circle" size={22} color={id === playerId ? colors.accent : colors.textMuted} />
          <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
            {player.pseudo}
            {id === playerId ? ` (${t('mobile.multi.you')})` : ''}
          </Text>
          {id === room.hostId && <Pill label={t('mobile.multi.host')} color={colors.warning} />}
        </Animated.View>
      ))}
    </View>
  )
}

export default function RoomScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { code } = useLocalSearchParams<{ code: string }>()
  const { room, gameResults, loading, error } = useMultiplayerRoom(code) as {
    room: Room | null
    gameResults: Record<string, PlayerResult>
    loading: boolean
    error: string | null
  }
  const [launching, setLaunching] = useState(false)
  const playerId = getPlayerId()
  const startAt = room?.startAt ? room.startAt.toMillis() : null
  const remaining = useCountdown(startAt)
  const sawCountdownRef = useRef(false)
  const startedRef = useRef(false)

  const game = room ? getGame(room.game.id) : null
  const joined = !!room?.players[playerId]
  const hasPlayed = Object.values(gameResults).some((result) => result.playerId === playerId)
  const isHost = room?.hostId === playerId
  const inLobby = room?.status === 'lobby'

  const play = () => {
    if (!game || startedRef.current) return
    startedRef.current = true
    router.replace({ pathname: game.route as never, params: { room: code } })
  }

  // Keep the room in the recent list of everyone who opens it
  useEffect(() => {
    if (room && joined) rememberRoom(room)
  }, [room, joined])

  // Live: start together when the countdown reaches zero (only for players who were waiting for it)
  useEffect(() => {
    if (remaining != null && remaining > 0 && joined && !hasPlayed) sawCountdownRef.current = true
    else if (remaining === 0 && sawCountdownRef.current) play()
  })

  const onShare = () => {
    if (!game) return
    Share.share({
      message: t('mobile.multi.share_message', { game: t(game.titleKey), code, link: `geogame://multi/${code}` }),
    })
  }

  const onLaunch = async () => {
    setLaunching(true)
    try {
      await launchRoom(code)
    } catch (launchError) {
      console.error(launchError)
      setLaunching(false)
    }
  }

  const notFound = !loading && (error || !room || room.source !== 'app' || !game)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.multi.leave')} onPress={() => navigate('/')} style={styles.close}>
          <MaterialCommunityIcons name="close" size={22} color={colors.text} />
        </Touchable>
        {game && (
          <View style={{ flex: 1 }}>
            <Text variant="label" color={game.color}>
              {t('mobile.multi.title')} · {t(room!.mode === 'live' ? 'mobile.multi.live' : 'mobile.multi.challenge')}
            </Text>
            <Text variant="heading" numberOfLines={1}>
              {t(game.titleKey)}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.textMuted} style={{ marginTop: space.xxl }} />
      ) : notFound ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="door-closed-lock" size={48} color={colors.textFaint} />
          <Text variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
            {t('mobile.multi.not_found')}
          </Text>
          <Button label={t('mobile.common.back')} variant="secondary" onPress={() => navigate('/')} />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + space.xl, gap: space.lg }}>
          <View style={[styles.codeCard, { borderColor: `${game!.color}55` }]}>
            <Text variant="label">{t('mobile.multi.code_label')}</Text>
            <Text selectable variant="hero" color={game!.color} style={styles.code}>
              {code}
            </Text>
            <Button
              label={t('mobile.multi.share_code')}
              variant="secondary"
              onPress={onShare}
              icon={<MaterialCommunityIcons name="export-variant" size={18} color={colors.text} />}
            />
          </View>

          {!joined ? (
            <JoinCard room={room!} />
          ) : inLobby ? (
            <>
              <Players room={room!} />
              {isHost ? (
                <Button
                  label={t('mobile.multi.launch')}
                  color={game!.color}
                  onPress={onLaunch}
                  loading={launching}
                  icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
                />
              ) : (
                <View style={styles.waiting}>
                  <ActivityIndicator color={colors.textMuted} />
                  <Text variant="body" color={colors.textMuted}>
                    {t('mobile.multi.waiting_host')}
                  </Text>
                </View>
              )}
            </>
          ) : !hasPlayed && remaining != null && remaining > 0 ? (
            <View style={styles.countdown}>
              <Text variant="label">{t('mobile.multi.starting_in')}</Text>
              <Animated.View key={Math.ceil(remaining / 1000)} entering={ZoomIn.springify().damping(12)}>
                <Text variant="hero" color={game!.color} style={{ fontSize: 96, lineHeight: 104 }}>
                  {Math.ceil(remaining / 1000)}
                </Text>
              </Animated.View>
            </View>
          ) : (
            <>
              {!hasPlayed && (
                <View style={styles.card}>
                  <Text variant="body" color={colors.textMuted}>
                    {t(room!.mode === 'live' ? 'mobile.multi.late_hint' : 'mobile.multi.challenge_play_hint')}
                  </Text>
                  <Button
                    label={t('mobile.multi.play')}
                    color={game!.color}
                    onPress={play}
                    icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
                  />
                </View>
              )}
              <Standings code={code} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  close: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  codeCard: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
  },
  code: { letterSpacing: 6, fontVariant: ['tabular-nums'] },
  card: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 },
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg },
  countdown: { alignItems: 'center', paddingVertical: space.xl },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
})

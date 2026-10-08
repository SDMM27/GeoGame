// A multiplayer room: join with a username, lobby and countdown (live), play each game, then the live standings.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useFriendships } from '@shared/hooks/usePlayerProfile'
import useLobbyHost from '@shared/hooks/useLobbyHost'
import useMultiplayerRoom from '@shared/hooks/useMultiplayerRoom'
import { dismissInvite, inviteId, sendRoomInvite } from '@shared/utils/invites'
import { containsProfanity } from '@shared/utils/profanity'
import { currentGameIndex, isRoomFormat, nextGameToPlay, roomGames } from '@shared/utils/multiplayerRoom'
import { serverNow } from '@shared/utils/serverTime'

import { useAccount, type Account } from '@/account/auth'
import { SITE_ORIGIN } from '@/links'
import { Avatar } from '@/components/profile/ProfileSections'
import { Button, Pill, Text, Touchable } from '@/components/ui'
import { getGame } from '@/games'
import { notifyInvite } from '@/multiplayer/invites'
import { Standings } from '@/multiplayer/RoomPlay'
import {
  getPlayerId,
  getSavedPseudo,
  joinRoom,
  launchNextGame,
  launchRoom,
  rememberRoom,
  type PlayerResult,
  type Room,
  type RoomGame,
} from '@/multiplayer/room'
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

// `autoJoin`: opened from a friend's invite with an account, so the player joins under their username right away.
function JoinCard({ room, account, autoJoin }: { room: Room; account: Account | null; autoJoin: boolean }) {
  const { t } = useTranslation()
  // Signed in: the account's username until the player types another one
  const [typed, setPseudo] = useState<string | null>(null)
  const pseudo = typed ?? account?.username ?? getSavedPseudo()
  const [joining, setJoining] = useState(false)
  const forbidden = containsProfanity(pseudo)
  const autoJoinedRef = useRef(false)
  const onJoin = async (name = pseudo.trim()) => {
    if (!name) return
    setJoining(true)
    try {
      await joinRoom(room, name, account?.uid)
    } catch (error) {
      console.error(error)
      setJoining(false)
    }
  }
  useEffect(() => {
    if (!autoJoin || !account?.username || autoJoinedRef.current) return
    autoJoinedRef.current = true
    onJoin(account.username)
  })
  if (autoJoin && account?.username) return <ActivityIndicator color={colors.textMuted} style={{ marginTop: space.lg }} />
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
        onSubmitEditing={() => !forbidden && onJoin()}
        style={styles.input}
      />
      {forbidden && (
        <Text variant="caption" color={colors.danger}>
          {t('account.errors.username_forbidden')}
        </Text>
      )}
      <Button label={t('mobile.multi.join')} onPress={() => onJoin()} loading={joining} disabled={!pseudo.trim() || forbidden} />
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

type Friend = { id: string; uid: string; username: string }

// Signed-in players invite their friends straight into the room; they get a banner in the app.
function InviteFriends({ room, account, color }: { room: Room; account: Account; color: string }) {
  const { t } = useTranslation()
  const friendships = useFriendships(account.uid)
  const [invited, setInvited] = useState<Record<string, 'sending' | 'sent' | 'failed'>>({})
  const inRoom = new Set(Object.values(room.players).map((player) => player.uid).filter(Boolean))

  if (friendships.loading) return null

  const invite = async (friend: Friend) => {
    setInvited((previous) => ({ ...previous, [friend.uid]: 'sending' }))
    try {
      await sendRoomInvite({ uid: account.uid, username: account.username }, friend.uid, room)
      notifyInvite(inviteId(room.id, friend.uid))
      setInvited((previous) => ({ ...previous, [friend.uid]: 'sent' }))
    } catch (error) {
      console.warn('[invites]', error)
      setInvited((previous) => ({ ...previous, [friend.uid]: 'failed' }))
    }
  }

  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('mobile.invites.title')}</Text>
      {friendships.friends.length === 0 ? (
        <Touchable accessibilityRole="button" onPress={() => router.push('/friends')} style={styles.playerRow}>
          <MaterialCommunityIcons name="account-plus-outline" size={22} color={colors.textMuted} />
          <Text variant="body" color={colors.textMuted} style={{ flex: 1 }}>
            {t('mobile.invites.no_friends')}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} />
        </Touchable>
      ) : (
        friendships.friends.map((friend: Friend) => {
          const state = inRoom.has(friend.uid) ? 'joined' : invited[friend.uid]
          return (
            <View key={friend.id} style={styles.playerRow}>
              <Avatar username={friend.username} size={32} />
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {friend.username}
              </Text>
              {state === 'joined' ? (
                <Pill label={t('mobile.invites.joined')} color={colors.accent} />
              ) : state === 'sent' ? (
                <Pill label={t('mobile.invites.sent')} color={color} icon={<MaterialCommunityIcons name="check" size={14} color={color} />} />
              ) : (
                <Button
                  label={t(state === 'failed' ? 'mobile.invites.retry' : 'mobile.invites.invite')}
                  variant="secondary"
                  onPress={() => invite(friend)}
                  loading={state === 'sending'}
                  style={styles.inviteButton}
                />
              )}
            </View>
          )
        })
      )}
    </View>
  )
}

export default function RoomScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { code, invited } = useLocalSearchParams<{ code: string; invited?: string }>()
  const { account } = useAccount()
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
  const sawCountdownRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  const games: RoomGame[] = room ? roomGames(room) : []
  const current: number = room ? currentGameIndex(room) : 0
  const results = Object.values(gameResults)
  const joined = !!room?.players[playerId]
  const toPlay: number | null = room && joined ? nextGameToPlay(room, results, playerId) : null
  // Header color and title: the game to play, else the current one
  const game = room ? getGame(games[toPlay ?? current]?.id ?? room.game.id) : null
  const isHost = room?.hostId === playerId
  const inLobby = room?.status === 'lobby'
  const isLive = room?.mode === 'live'
  const hasNextLive = isLive && room?.status === 'playing' && current < games.length - 1
  // Heartbeat, and the host role passes on when the host is gone
  useLobbyHost(room, playerId)

  // The game screen picks the game to play from the room and the player's results
  const play = () => {
    const target = toPlay != null ? getGame(games[toPlay].id) : null
    if (!target || startedRef.current) return
    startedRef.current = true
    router.replace({ pathname: target.route as never, params: { room: code } })
  }

  // Keep the room in the recent list of everyone who opens it
  useEffect(() => {
    if (room && joined) rememberRoom(room)
  }, [room, joined])

  // Opening the room answers any invite to it
  useEffect(() => {
    if (account?.uid && code) dismissInvite(inviteId(code, account.uid))
  }, [account?.uid, code])

  // Live: start together when a game's countdown reaches zero (only for players who were waiting for it)
  useEffect(() => {
    if (!isLive || toPlay !== current) return
    if (remaining != null && remaining > 0) sawCountdownRef.current = startAt
    else if (remaining === 0 && sawCountdownRef.current === startAt) play()
  })

  const onShare = () => {
    if (!game) return
    Share.share({
      message: t('mobile.multi.share_message', { game: t(game.titleKey), code, link: `${SITE_ORIGIN}/multiplayer/room/${code}` }),
    })
  }

  const onLaunch = async (launch: () => Promise<void>) => {
    setLaunching(true)
    try {
      await launch()
    } catch (launchError) {
      console.error(launchError)
    }
    setLaunching(false)
  }

  const addGame = () => router.push({ pathname: '/multi/add', params: { code } })

  const notFound = !loading && (error || !room || !isRoomFormat(room) || !game)
  const counting = isLive && toPlay === current && remaining != null && remaining > 0

  const addGameButton = isHost && (
    <Button
      label={t('mp_room.add_game')}
      variant="secondary"
      onPress={addGame}
      icon={<MaterialCommunityIcons name="plus" size={18} color={colors.text} />}
    />
  )

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
              {games.length > 1 ? t('mp_room.n_games', { count: games.length }) : t(game.titleKey)}
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

          {games.length > 1 && <GameList room={room!} results={results} playerId={playerId} />}

          {!joined ? (
            <JoinCard room={room!} account={account} autoJoin={invited === '1'} />
          ) : inLobby ? (
            <>
              <Players room={room!} />
              {account?.username && <InviteFriends room={room!} account={account} color={game!.color} />}
              {isHost ? (
                <>
                  {addGameButton}
                  <Button
                    label={t('mobile.multi.launch')}
                    color={game!.color}
                    onPress={() => onLaunch(() => launchRoom(code))}
                    loading={launching}
                    icon={<MaterialCommunityIcons name="play" size={20} color={colors.onAccent} />}
                  />
                </>
              ) : (
                <View style={styles.waiting}>
                  <ActivityIndicator color={colors.textMuted} />
                  <Text variant="body" color={colors.textMuted}>
                    {t('mobile.multi.waiting_host')}
                  </Text>
                </View>
              )}
            </>
          ) : counting ? (
            <View style={styles.countdown}>
              <Text variant="label">
                {games.length > 1 ? `${t('mp_room.game_n', { n: current + 1 })} · ` : ''}
                {t('mobile.multi.starting_in')}
              </Text>
              <Animated.View key={Math.ceil(remaining! / 1000)} entering={ZoomIn.springify().damping(12)}>
                <Text variant="hero" color={game!.color} style={{ fontSize: 96, lineHeight: 104 }}>
                  {Math.ceil(remaining! / 1000)}
                </Text>
              </Animated.View>
            </View>
          ) : (
            <>
              {toPlay != null && (
                <View style={styles.card}>
                  {games.length > 1 && (
                    <Text variant="bodyStrong">
                      {t('mp_room.game_n', { n: toPlay + 1 })} · {t(game!.titleKey)}
                    </Text>
                  )}
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
              {toPlay == null && hasNextLive && !isHost && (
                <View style={styles.waiting}>
                  <ActivityIndicator color={colors.textMuted} />
                  <Text variant="body" color={colors.textMuted}>
                    {t('mp_room.waiting_next')}
                  </Text>
                </View>
              )}
              {toPlay == null && !hasNextLive && (
                <Text variant="bodyStrong" color={colors.accent} style={{ textAlign: 'center' }}>
                  ✓ {t('mp_room.finished')}
                </Text>
              )}
              {isHost && hasNextLive && (
                <Button
                  label={`${t('mp_room.next_game', { n: current + 2 })} · ${t(getGame(games[current + 1].id)?.titleKey ?? '')}`}
                  color={game!.color}
                  onPress={() => onLaunch(() => launchNextGame(room!))}
                  loading={launching}
                  icon={<MaterialCommunityIcons name="skip-next" size={20} color={colors.onAccent} />}
                />
              )}
              {addGameButton}
              {account?.username && <InviteFriends room={room!} account={account} color={game!.color} />}
              <Standings code={code} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

// The room's games, with the player's progress through them
function GameList({ room, results, playerId }: { room: Room; results: PlayerResult[]; playerId: string }) {
  const { t } = useTranslation()
  const games: RoomGame[] = roomGames(room)
  const current: number = currentGameIndex(room)
  const played = new Set(results.filter((result) => result.playerId === playerId).map((result) => result.gameIndex ?? 0))
  return (
    <View style={styles.card}>
      {games.map((roomGame, i) => {
        const definition = getGame(roomGame.id)
        const isCurrent = room.mode === 'live' && room.status === 'playing' && i === current
        const done = played.has(i)
        return (
          <View key={i} style={styles.playerRow}>
            <View style={[styles.gameNumber, done && { backgroundColor: `${colors.accent}33` }, isCurrent && { borderColor: definition?.color ?? colors.accent }]}>
              {done ? (
                <MaterialCommunityIcons name="check" size={14} color={colors.accent} />
              ) : (
                <Text variant="caption">{i + 1}</Text>
              )}
            </View>
            {definition && <MaterialCommunityIcons name={definition.icon} size={20} color={definition.color} />}
            <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
              {definition ? t(definition.titleKey) : roomGame.id}
              {roomGameSettings(roomGame, t)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function roomGameSettings(roomGame: RoomGame, t: (key: string, options?: Record<string, unknown>) => string) {
  const settings = roomGame.phases
    ? t('mobile.setup.ascension')
    : roomGame.continent
      ? t(`continents.${roomGame.continent}`)
      : (roomGame.difficulty ?? roomGame.quizDifficulty)
        ? t(`difficulties.${roomGame.difficulty ?? roomGame.quizDifficulty}`)
        : null
  return `${settings ? ` · ${settings}` : ''}${roomGame.count ? ` · ${roomGame.count}` : ''}`
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
  inviteButton: { minHeight: 36, paddingHorizontal: space.md },
  gameNumber: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
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

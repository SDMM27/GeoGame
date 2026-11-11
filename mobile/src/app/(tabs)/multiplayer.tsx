// Multiplayer tab: friends' invites, join a room with its code, start one on any multiplayer game, reopen recent rooms.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, TextInput, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { dismissInvite } from '@shared/utils/invites'

import { useAccount } from '@/account/auth'
import { Barcode, DeparturesBoard, Kicker, ScreenTitle } from '@/components/flight'
import { Button, Text, Touchable } from '@/components/ui'
import { getGame, MULTI_GAMES, type GameDefinition } from '@/games'
import { acceptInvite, useInvites, type Invite } from '@/multiplayer/invites'
import { startMultiGame } from '@/multiplayer/navigation'
import { getRecentRooms, normalizeCode, type RecentRoom } from '@/multiplayer/room'
import GameEmblem from '@/components/GameEmblem'
import { fonts, makeStyles, radius, space, useColors, useTheme } from '@/theme'

const openRoom = (code: string) => router.push({ pathname: '/multi/[code]', params: { code } })

// A game of the « create » board: emblem, flight code, name, plus
function GameRow({ game, index, last }: { game: GameDefinition; index: number; last: boolean }) {
  const styles = useStyles()
  const colors = useColors()
  const { t } = useTranslation()
  return (
    <Animated.View entering={FadeInDown.delay(60 + index * 50).springify().damping(18)}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t(game.titleKey)}
        onPress={() => startMultiGame(game)}
        style={[styles.boardRow, !last && styles.boardDivider]}>
        <GameEmblem game={game.id} size={30} />
        <Text style={styles.boardCode}>{game.code}</Text>
        <Text style={styles.boardName} numberOfLines={1}>
          {t(game.titleKey)}
        </Text>
        <MaterialCommunityIcons name="plus" size={22} color={colors.text} />
      </Touchable>
    </Animated.View>
  )
}

function RecentRow({ recent }: { recent: RecentRoom }) {
  const styles = useStyles()
  const { gameColors } = useTheme()
  const colors = useColors()
  const { t } = useTranslation()
  const game = getGame(recent.gameId)
  if (!game) return null
  return (
    <Touchable accessibilityRole="button" onPress={() => openRoom(recent.code)} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: `${gameColors[game.id]}1F` }]}>
        <GameEmblem game={game.id} variant="glyph" size={24} color={gameColors[game.id]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{t(game.titleKey)}</Text>
        <Text variant="caption">
          {t(recent.mode === 'live' ? 'mobile.multi.live' : 'mobile.multi.challenge')} ·{' '}
          {new Date(recent.at).toLocaleDateString()}
        </Text>
      </View>
      <Text variant="bodyStrong" color={colors.textMuted} style={{ letterSpacing: 2, fontVariant: ['tabular-nums'] }}>
        {recent.code}
      </Text>
    </Touchable>
  )
}

function InviteRow({ invite }: { invite: Invite }) {
  const styles = useStyles()
  const { gameColors } = useTheme()
  const colors = useColors()
  const { t } = useTranslation()
  const game = getGame(invite.gameId)
  if (!game) return null
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.row, { borderColor: `${gameColors[game.id]}66` }]}>
      <View style={[styles.icon, { backgroundColor: `${gameColors[game.id]}1F` }]}>
        <GameEmblem game={game.id} variant="glyph" size={24} color={gameColors[game.id]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {invite.fromUsername}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {t(game.titleKey)} · {t(invite.mode === 'live' ? 'mobile.multi.live' : 'mobile.multi.challenge')}
        </Text>
      </View>
      <Button label={t('mobile.multi.join')} color={gameColors[game.id]} onPress={() => acceptInvite(invite)} style={styles.smallButton} />
      <Touchable accessibilityRole="button" accessibilityLabel={t('mobile.invites.decline')} onPress={() => dismissInvite(invite.id)} style={styles.iconButton}>
        <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
      </Touchable>
    </Animated.View>
  )
}

export default function MultiplayerScreen() {
  const styles = useStyles()
  const colors = useColors()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [code, setCode] = useState('')
  const [recent, setRecent] = useState<RecentRoom[]>([])
  const { account } = useAccount()
  const invites = useInvites(account?.uid)

  useFocusEffect(
    useCallback(() => {
      setRecent(getRecentRooms())
    }, [])
  )

  const canJoin = code.length === 6
  const onJoin = () => canJoin && openRoom(code)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}>
      <View style={{ gap: 4 }}>
        <Kicker>{t('home.board_title')}</Kicker>
        <ScreenTitle size={32}>{t('mobile.multi.title')}</ScreenTitle>
        <Text variant="caption">{t('mobile.multi.subtitle')}</Text>
      </View>

      {invites.length > 0 && (
        <View style={{ gap: space.md }}>
          <ScreenTitle size={20}>{t('mobile.invites.received_title')}</ScreenTitle>
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} />
          ))}
        </View>
      )}

      <View style={styles.joinCard}>
        <View style={styles.joinHead}>
          <ScreenTitle size={20}>{t('mobile.multi.join_title')}</ScreenTitle>
          <Barcode width={52} height={24} color={colors.textMuted} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(normalizeCode(value))}
            placeholder={t('mobile.multi.code_placeholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={onJoin}
            style={styles.codeInput}
          />
          <Button label={t('mobile.multi.join')} onPress={onJoin} disabled={!canJoin} style={{ paddingHorizontal: space.lg }} />
        </View>
      </View>

      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <ScreenTitle size={20}>{t('mobile.multi.create_title')}</ScreenTitle>
          <Text variant="caption">{t('mobile.multi.create_subtitle')}</Text>
        </View>
        <DeparturesBoard>
          {MULTI_GAMES.map((game, index) => (
            <GameRow key={game.id} game={game} index={index} last={index === MULTI_GAMES.length - 1} />
          ))}
        </DeparturesBoard>
      </View>

      {recent.length > 0 && (
        <View style={{ gap: space.md }}>
          <ScreenTitle size={20}>{t('mobile.multi.recent_title')}</ScreenTitle>
          {recent.map((item) => (
            <RecentRow key={item.code} recent={item} />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const useStyles = makeStyles((colors) => ({
  joinCard: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  codeInput: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 22,
    letterSpacing: 6,
  },
  joinHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12 },
  boardDivider: { borderBottomWidth: 1, borderBottomColor: colors.boardLine },
  boardCode: { width: 34, fontFamily: fonts.monoBold, fontSize: 13, color: colors.gold },
  boardName: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButton: { minHeight: 38, paddingHorizontal: space.md },
  iconButton: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
}))

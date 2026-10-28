// Friends: add one by username, answer requests, see who played today's daily challenges.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePlayerSearch, useRecentPlayers } from '@shared/hooks/useCommunity'
import useFriendsPresence from '@shared/hooks/useFriendsPresence'
import { useFriendships, useFriendsToday } from '@shared/hooks/usePlayerProfile'
import { USERNAME_MAX } from '@shared/utils/account'
import { acceptFriendRequest, friendErrorKey, removeFriendship, SEARCH_MIN, sendFriendRequest } from '@shared/utils/friends'
import { clearPendingInvite, getPendingInvite, inviteUrl } from '@shared/utils/inviteLink'

import { useAccount } from '@/account/auth'
import { shareInvite } from '@/account/shareInvite'
import { confirmAction } from '@/components/confirm'
import { FriendCandidates } from '@/components/profile/FriendCandidates'
import { Avatar, DailyChips, SectionTitle } from '@/components/profile/ProfileSections'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button, Text, Touchable } from '@/components/ui'
import { getGameByType } from '@/games'
import { SITE_ORIGIN } from '@/links'
import { colors, fonts, radius, space } from '@/theme'

type Friendship = { id: string; uid: string; username: string; status: 'friend' | 'incoming' | 'outgoing' }

const openPlayer = (uid: string) => router.push({ pathname: '/player/[uid]', params: { uid } })
const watchRoom = (code: string) => router.push({ pathname: '/multi/[code]', params: { code, watch: '1' } })

type Presence = { status: 'playing' | 'online' | 'offline'; room: string | null; game: string | null }

// Online (green dot) or in game, as seen by the friends list (see @shared/utils/presence).
function FriendStatus({ presence }: { presence?: Presence }) {
  const { t } = useTranslation()
  if (presence?.status !== 'playing' && presence?.status !== 'online') return null
  const game = presence.status === 'playing' && presence.game ? getGameByType(presence.game) : undefined
  const label =
    presence.status === 'online'
      ? t('friends.online')
      : game
        ? t('friends.in_game', { game: t(game.titleKey) })
        : t('friends.in_game_short')
  return (
    <View style={styles.presence}>
      <View style={styles.dot} />
      <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
        {label}
      </Text>
    </View>
  )
}

export default function FriendsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const today = useFriendsToday(friendships.friends) as Record<string, Record<string, { solved?: boolean }>>
  const presence = useFriendsPresence(friendships.friends.map((friend: Friendship) => friend.uid)) as Record<string, Presence>
  const [username, setUsername] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'notice'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, setPending] = useState<string | null>(getPendingInvite)
  const search = usePlayerSearch(username)
  const recent = useRecentPlayers(friendships) as { uid: string; name: string }[]
  const typed = username.trim().length >= SEARCH_MIN
  const found = (search.results as { uid: string; username: string }[])
    .filter((player) => player.uid !== account?.uid)
    .map((player) => ({ uid: player.uid, name: player.username }))

  const onAdd = async () => {
    if (!account?.username || !username.trim()) return
    setSending(true)
    setMessage(null)
    try {
      const player = await sendFriendRequest({ uid: account.uid, username: account.username }, username, friendships.all)
      const accepted = friendships.incoming.some((item: Friendship) => item.uid === player?.uid)
      setMessage({ kind: 'notice', text: t(accepted ? 'friends.now_friends' : 'friends.sent', { username: player?.username ?? username.trim() }) })
      setUsername('')
    } catch (error) {
      setMessage({ kind: 'error', text: t(`friends.errors.${friendErrorKey(error)}`) })
    }
    setSending(false)
  }

  const dismissPending = () => {
    clearPendingInvite()
    setPending(null)
  }

  // An invitation link opened before signing in (see app/add/[username].tsx).
  const onAddPending = async () => {
    if (!account?.username || !pending) return
    try {
      const player = await sendFriendRequest({ uid: account.uid, username: account.username }, pending, friendships.all)
      setMessage({ kind: 'notice', text: t('friends.sent', { username: player?.username ?? pending }) })
    } catch (error) {
      setMessage({ kind: 'error', text: t(`friends.errors.${friendErrorKey(error)}`) })
    }
    dismissPending()
  }

  const onInvite = async () => {
    if (!account?.username) return
    const result = await shareInvite({ url: inviteUrl(SITE_ORIGIN, account.username), text: t('friends.invite_message') })
    setCopied(result === 'copied')
  }

  const onRemove = (friend: Friendship) =>
    confirmAction({
      title: t('friends.remove_confirm', { username: friend.username }),
      confirmLabel: t('friends.remove'),
      cancelLabel: t('account.cancel'),
      onConfirm: () => removeFriendship(friend.id),
    })

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}>
        <ScreenHeader title={t('friends.title')} />

        <View style={styles.card}>
          <Text variant="heading">{t('friends.add_title')}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <TextInput
              value={username}
              onChangeText={(value) => {
                setUsername(value)
                setMessage(null)
              }}
              placeholder={t('friends.add_placeholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={USERNAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={onAdd}
              style={styles.input}
            />
            <Button label={t('friends.add')} onPress={onAdd} loading={sending} disabled={!username.trim() || !account} style={{ paddingHorizontal: space.lg }} />
          </View>
          {message && (
            <Text variant="caption" color={message.kind === 'error' ? colors.danger : colors.accent}>
              {message.text}
            </Text>
          )}
          {typed && !search.searching && found.length === 0 && <Text variant="caption">{t('friends.search_none')}</Text>}
          {account && <FriendCandidates players={found} account={account} friendships={friendships} onMessage={setMessage} />}
        </View>

        {pending && account?.username && (
          <View style={[styles.card, { borderColor: colors.accent }]}>
            <Text variant="heading">{t('friends.pending_title', { username: pending })}</Text>
            <Text variant="caption">{t('friends.pending_hint')}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label={t('friends.pending_add', { username: pending })} onPress={onAddPending} style={{ flex: 1 }} />
              <Button label={t('friends.dismiss')} variant="ghost" onPress={dismissPending} />
            </View>
          </View>
        )}

        {!typed && account && recent.length > 0 && (
          <View style={{ gap: space.md }}>
            <SectionTitle title={t('friends.recent_title')} />
            <FriendCandidates players={recent} account={account} friendships={friendships} onMessage={setMessage} />
          </View>
        )}

        {account?.username && (
          <View style={styles.card}>
            <Text variant="heading">{t('friends.invite_title')}</Text>
            <Text variant="caption">{t('friends.invite_hint')}</Text>
            <Button
              label={t('friends.invite_share')}
              onPress={onInvite}
              icon={<MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.onAccent} />}
            />
            {copied && (
              <Text variant="caption" color={colors.accent}>
                {t('friends.invite_copied')}
              </Text>
            )}
          </View>
        )}

        <Touchable accessibilityRole="button" onPress={() => router.push('/community')} style={styles.communityLink}>
          <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.accent} />
          <Text variant="bodyStrong" color={colors.accent} style={{ flex: 1 }}>
            {t('friends.community_link')}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.accent} />
        </Touchable>

        {friendships.loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            {friendships.incoming.length > 0 && (
              <View style={{ gap: space.md }}>
                <SectionTitle title={t('friends.requests_title')} />
                <View style={styles.list}>
                  {friendships.incoming.map((request: Friendship, index: number) => (
                    <View key={request.id} style={[styles.row, index > 0 && styles.divider]}>
                      <Touchable accessibilityRole="button" onPress={() => openPlayer(request.uid)} style={styles.who}>
                        <Avatar username={request.username} size={40} />
                        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                          {request.username}
                        </Text>
                      </Touchable>
                      <Button label={t('friends.accept')} onPress={() => acceptFriendRequest(request.id)} style={styles.smallButton} />
                      <Touchable accessibilityRole="button" accessibilityLabel={t('friends.decline')} onPress={() => removeFriendship(request.id)} style={styles.iconButton}>
                        <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
                      </Touchable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ gap: space.md }}>
              <SectionTitle
                title={t('friends.title')}
                right={<Text variant="bodyStrong" color={colors.textMuted}>{friendships.friends.length}</Text>}
              />
              {friendships.friends.length === 0 ? (
                <Text variant="caption">{t('friends.empty')}</Text>
              ) : (
                <>
                  <Text variant="caption">{t('friends.today_title')}</Text>
                  <View style={styles.list}>
                    {friendships.friends.map((friend: Friendship, index: number) => (
                      <View key={friend.id} style={[styles.row, index > 0 && styles.divider]}>
                        <Touchable accessibilityRole="button" onPress={() => openPlayer(friend.uid)} style={styles.who}>
                          <Avatar username={friend.username} size={40} />
                          <View style={{ flex: 1, gap: space.xs }}>
                            <Text variant="bodyStrong" numberOfLines={1}>
                              {friend.username}
                            </Text>
                            <FriendStatus presence={presence[friend.uid]} />
                            <DailyChips today={today[friend.uid] ?? {}} size={22} />
                          </View>
                        </Touchable>
                        {presence[friend.uid]?.status === 'playing' && presence[friend.uid].room && (
                          <Button
                            label={t('friends.watch')}
                            variant="secondary"
                            onPress={() => watchRoom(presence[friend.uid].room as string)}
                            icon={<MaterialCommunityIcons name="eye-outline" size={16} color={colors.text} />}
                            style={styles.smallButton}
                          />
                        )}
                        <Touchable accessibilityRole="button" accessibilityLabel={t('friends.remove')} onPress={() => onRemove(friend)} style={styles.iconButton}>
                          <MaterialCommunityIcons name="account-remove-outline" size={20} color={colors.textMuted} />
                        </Touchable>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {friendships.outgoing.length > 0 && (
              <View style={{ gap: space.md }}>
                <SectionTitle title={t('friends.outgoing_title')} />
                <View style={styles.list}>
                  {friendships.outgoing.map((request: Friendship, index: number) => (
                    <View key={request.id} style={[styles.row, index > 0 && styles.divider]}>
                      <Touchable accessibilityRole="button" onPress={() => openPlayer(request.uid)} style={styles.who}>
                        <Avatar username={request.username} size={40} />
                        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                          {request.username}
                        </Text>
                      </Touchable>
                      <Button label={t('friends.cancel')} variant="ghost" onPress={() => removeFriendship(request.id)} style={styles.smallButton} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  input: {
    flex: 1,
    minWidth: 0,
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
  communityLink: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  presence: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  smallButton: { minHeight: 38, paddingHorizontal: space.md },
  iconButton: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
})

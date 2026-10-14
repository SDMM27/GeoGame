// The friend button of a player's profile or invitation screen: add, accept, cancel or remove, depending on where the two accounts stand.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { acceptFriendRequest, friendErrorKey, removeFriendship, sendFriendRequest } from '@shared/utils/friends'

import { useAccount } from '@/account/auth'
import { confirmAction } from '@/components/confirm'
import { Button, Text } from '@/components/ui'
import { colors, space } from '@/theme'

type Player = { uid: string; username: string }
type Friendship = { id: string; uid: string; username: string; status: 'friend' | 'incoming' | 'outgoing' }

export function FriendAction({ player }: { player: Player }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!account?.username || account.uid === player.uid || friendships.loading) return null
  const me = { uid: account.uid, username: account.username }
  const link = friendships.all.find((item: Friendship) => item.uid === player.uid) as Friendship | undefined

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(t(`friends.errors.${friendErrorKey(err)}`))
    }
    setBusy(false)
  }

  return (
    <View style={{ gap: space.sm }}>
      {!link && (
        <Button
          label={t('friends.add_friend')}
          loading={busy}
          onPress={() => run(() => sendFriendRequest(me, player.username, friendships.all))}
          icon={<MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.onAccent} />}
        />
      )}
      {link?.status === 'incoming' && (
        <Button label={t('friends.accept_request')} loading={busy} onPress={() => run(() => acceptFriendRequest(link.id))} />
      )}
      {link?.status === 'outgoing' && (
        <Button label={`${t('friends.request_sent')} · ${t('friends.cancel')}`} variant="secondary" loading={busy} onPress={() => run(() => removeFriendship(link.id))} />
      )}
      {link?.status === 'friend' && (
        <Button
          label={t('friends.remove')}
          variant="ghost"
          onPress={() =>
            confirmAction({
              title: t('friends.remove_confirm', { username: player.username }),
              confirmLabel: t('friends.remove'),
              cancelLabel: t('account.cancel'),
              onConfirm: () => run(() => removeFriendship(link.id)),
            })
          }
        />
      )}
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
    </View>
  )
}

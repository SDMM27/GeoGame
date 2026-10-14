// The friend button of a player's profile or invitation page: add, accept, cancel or remove, depending on where the two accounts stand.
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { acceptFriendRequest, friendErrorKey, removeFriendship, sendFriendRequest } from '../../utils/friends'

export default function FriendAction({ account, player, friendships }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!account?.username || friendships.loading) return null
  const link = friendships.all.find((item) => item.uid === player.uid)

  const run = async (action) => {
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
    <div className="player-action">
      {!link && (
        <button
          type="button"
          className="account-submit"
          disabled={busy}
          onClick={() => run(() => sendFriendRequest({ uid: account.uid, username: account.username }, player.username, friendships.all))}
        >
          {t('friends.add_friend')}
        </button>
      )}
      {link?.status === 'incoming' && (
        <button type="button" className="account-submit" disabled={busy} onClick={() => run(() => acceptFriendRequest(link.id))}>
          {t('friends.accept_request')}
        </button>
      )}
      {link?.status === 'outgoing' && (
        <button type="button" className="account-submit account-submit--secondary" disabled={busy} onClick={() => run(() => removeFriendship(link.id))}>
          {t('friends.request_sent')} · {t('friends.cancel')}
        </button>
      )}
      {link?.status === 'friend' && (
        <button
          type="button"
          className="account-link account-link--danger"
          onClick={() => window.confirm(t('friends.remove_confirm', { username: player.username })) && run(() => removeFriendship(link.id))}
        >
          {t('friends.remove')}
        </button>
      )}
      {error && <p className="account-error">{error}</p>}
    </div>
  )
}

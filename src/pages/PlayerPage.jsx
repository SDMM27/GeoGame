// Another player's public profile: stats, achievements, history, and the friend button.
import React, { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import ProfileBody, { Avatar } from '../components/profile/ProfileBody'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import { acceptFriendRequest, fetchPlayer, friendErrorKey, removeFriendship, sendFriendRequest } from '../utils/friends'
import './AccountPage.css'

function FriendAction({ account, player, friendships }) {
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

export default function PlayerPage() {
  const { t, i18n } = useTranslation()
  const { uid } = useParams()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const [player, setPlayer] = useState(undefined)

  useEffect(() => {
    setPlayer(undefined)
    fetchPlayer(uid)
      .then(setPlayer)
      .catch(() => setPlayer(null))
  }, [uid])

  // Your own profile lives on the account page.
  if (account && account.uid === uid) return <Navigate to="/account" replace />

  const isFriend = friendships.friends.some((item) => item.uid === uid)

  return (
    <div className="account-page">
      <NavBar />
      <main className="account-main account-main--wide">
        {player === undefined ? (
          <p className="profile-muted profile-center">…</p>
        ) : player === null ? (
          <p className="profile-muted profile-center">{t('profile.not_found')}</p>
        ) : (
          <>
            <header className="profile-header">
              <Avatar username={player.username} size={72} />
              <div className="profile-header-text">
                <h1>{player.username}</h1>
                {player.createdAt && (
                  <small>
                    {t('profile.member_since', {
                      date: new Date(player.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }),
                    })}
                  </small>
                )}
                {isFriend && <span className="profile-friend-pill">✓ {t('friends.is_friend')}</span>}
              </div>
            </header>
            <FriendAction account={account} player={player} friendships={friendships} />
            <ProfileBody uid={player.uid} />
          </>
        )}
      </main>
    </div>
  )
}

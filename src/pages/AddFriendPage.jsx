// Invitation link (/add/<username>): sends the friend request in one tap. A visitor is sent to create an account
// first, and the invitation waits for them in their friends list (see FriendsPanel).
import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import FriendAction from '../components/profile/FriendAction'
import { Avatar } from '../components/profile/ProfileBody'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import { findPlayer } from '../utils/friends'
import { setPendingInvite } from '../utils/inviteLink'
import './AccountPage.css'

export default function AddFriendPage() {
  const { t } = useTranslation()
  const { username } = useParams()
  const { account, loading } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const [player, setPlayer] = useState(undefined)

  useEffect(() => {
    setPlayer(undefined)
    findPlayer(username)
      .then(setPlayer)
      .catch(() => setPlayer(null))
  }, [username])

  const visitor = !loading && !account?.username
  useEffect(() => {
    if (player && visitor) setPendingInvite(player.username)
  }, [player, visitor])

  const own = Boolean(player && account?.uid === player.uid)

  return (
    <div className="account-page">
      <NavBar />
      <main className="account-main">
        {player === undefined || loading ? (
          <p className="profile-muted profile-center">…</p>
        ) : player === null ? (
          <p className="profile-muted profile-center">{t('friends.add_page.not_found')}</p>
        ) : (
          <div className="account-card" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Avatar username={player.username} size={72} />
            <h1 className="account-section-title">{player.username}</h1>
            <p className="account-intro">{t('friends.add_page.intro', { username: player.username })}</p>
            {own && <p className="account-notice">{t('friends.add_page.own')}</p>}
            {visitor && (
              <>
                <p className="account-intro">{t('friends.add_page.login')}</p>
                <Link to="/account" className="account-submit" style={{ textAlign: 'center', textDecoration: 'none' }}>
                  {t('friends.add_page.login_button')}
                </Link>
              </>
            )}
            {!own && !visitor && <FriendAction account={account} player={player} friendships={friendships} />}
            {!own && (
              <Link to={`/player/${player.uid}`} className="account-link">
                {t('friends.add_page.view_profile')}
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

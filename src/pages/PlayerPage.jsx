// Another player's public profile: stats, achievements, history, and the friend button.
import React, { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import ProfileBody from '../components/profile/ProfileBody'
import ProfileHeader from '../components/profile/ProfileHeader'
import FlagCollection from '../components/profile/FlagCollection'
import ScrollCollection from '../components/profile/ScrollCollection'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import FriendAction from '../components/profile/FriendAction'
import { fetchPlayer } from '../utils/friends'
import { useDecoration } from '../hooks/useDecoration'
import './AccountPage.css'

export default function PlayerPage() {
  const { t } = useTranslation()
  const { uid } = useParams()
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  const [player, setPlayer] = useState(undefined)
  const decoration = useDecoration(uid)

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
      <main className="account-main account-main--wide profile-main">
        {player === undefined ? (
          <p className="profile-muted profile-center">…</p>
        ) : player === null ? (
          <p className="profile-muted profile-center">{t('profile.not_found')}</p>
        ) : (
          <ProfileBody
            uid={player.uid}
            header={
              <>
                <ProfileHeader player={player} decoration={decoration}>
                  {isFriend && <span className="profile-friend-pill">✓ {t('friends.is_friend')}</span>}
                </ProfileHeader>
                <FriendAction account={account} player={player} friendships={friendships} />
              </>
            }
            collection={
              <>
                <FlagCollection uid={player.uid} />
                <ScrollCollection uid={player.uid} />
              </>
            }
          />
        )}
      </main>
    </div>
  )
}

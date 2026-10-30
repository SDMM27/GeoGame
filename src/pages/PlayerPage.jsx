// Another player's public profile: stats, achievements, history, and the friend button.
import React, { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import ProfileBody, { Avatar } from '../components/profile/ProfileBody'
import FlagCollection from '../components/profile/FlagCollection'
import LevelBadge from '../components/profile/LevelBadge'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import FriendAction from '../components/profile/FriendAction'
import { fetchPlayer } from '../utils/friends'
import { decorationStyle } from '../utils/decorations'
import { useDecoration } from '../hooks/useDecoration'
import './AccountPage.css'

export default function PlayerPage() {
  const { t, i18n } = useTranslation()
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
      <main className="account-main account-main--wide">
        {player === undefined ? (
          <p className="profile-muted profile-center">…</p>
        ) : player === null ? (
          <p className="profile-muted profile-center">{t('profile.not_found')}</p>
        ) : (
          <>
            <header className="profile-header">
              <Avatar username={player.username} size={72} decoration={decoration} />
              <div className="profile-header-text">
                <h1 style={{ color: decorationStyle(decoration).nameColor ?? undefined }}>{player.username}</h1>
                {player.createdAt && (
                  <small>
                    {t('profile.member_since', {
                      date: new Date(player.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }),
                    })}
                  </small>
                )}
                <LevelBadge uid={player.uid} />
                {isFriend && <span className="profile-friend-pill">✓ {t('friends.is_friend')}</span>}
              </div>
            </header>
            <FriendAction account={account} player={player} friendships={friendships} />
            <ProfileBody uid={player.uid} collection={<FlagCollection uid={player.uid} />} />
          </>
        )}
      </main>
    </div>
  )
}

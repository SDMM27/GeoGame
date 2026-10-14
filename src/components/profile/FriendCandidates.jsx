// Players to add as friends (search results, players met in rooms): one row each with the right button for
// where the two accounts stand.
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { friendErrorKey, sendFriendRequestTo } from '../../utils/friends'
import BadgeStrip from './BadgeStrip'
import { Avatar } from './ProfileBody'
import './FriendsPanel.css'

function CandidateButton({ account, friendships, uid, onMessage }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const status = friendships.all.find((item) => item.uid === uid)?.status
  if (uid === account.uid) return null
  if (status === 'friend') return <span className="friends-state">✓ {t('friends.is_friend')}</span>
  if (status === 'outgoing') return <span className="friends-state">✓ {t('friends.request_sent')}</span>

  const add = async () => {
    setBusy(true)
    try {
      const player = await sendFriendRequestTo({ uid: account.uid, username: account.username }, uid, friendships.all)
      onMessage?.({ kind: 'notice', text: t(status === 'incoming' ? 'friends.now_friends' : 'friends.sent', { username: player.username }) })
    } catch (error) {
      onMessage?.({ kind: 'error', text: t(`friends.errors.${friendErrorKey(error)}`) })
    }
    setBusy(false)
  }

  return (
    <button type="button" className="friends-btn friends-btn--primary" disabled={busy} onClick={add}>
      {t(status === 'incoming' ? 'friends.accept' : 'friends.add')}
    </button>
  )
}

// `players`: [{ uid, name, badges?, rank?, detail? }] (a rank and a detail such as "12 pts" for a leaderboard). Nothing is shown for an empty list. Without an `account` (a visitor) there
// are no buttons, only the list.
export default function FriendCandidates({ players, account, friendships, onMessage }) {
  if (players.length === 0) return null
  return (
    <ul className="profile-list">
      {players.map((player) => (
        <li key={player.uid} className="friends-row">
          {player.rank != null && <span className="friends-rank">{player.rank}</span>}
          <Link to={`/player/${player.uid}`} className="friends-who">
            <Avatar username={player.name} size={36} />
            <span>{player.name}</span>
          </Link>
          {player.badges && <BadgeStrip badges={player.badges} />}
          {player.detail && <span className="friends-detail">{player.detail}</span>}
          {account?.username && friendships && (
            <CandidateButton account={account} friendships={friendships} uid={player.uid} onMessage={onMessage} />
          )}
        </li>
      ))}
    </ul>
  )
}

// Friends of the signed-in player: add by username, requests, and today's daily challenges.
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePlayerSearch, useRecentPlayers } from '../../hooks/useCommunity'
import { useFriendsToday } from '../../hooks/usePlayerProfile'
import { USERNAME_MAX } from '../../utils/account'
import { acceptFriendRequest, friendErrorKey, removeFriendship, SEARCH_MIN, sendFriendRequest } from '../../utils/friends'
import { clearPendingInvite, getPendingInvite, inviteUrl } from '../../utils/inviteLink'
import { shareInviteLink } from '../../utils/shareInvite'
import FriendCandidates from './FriendCandidates'
import { Avatar, DailyChips } from './ProfileBody'
import './FriendsPanel.css'

function PlayerName({ friend }) {
  return (
    <Link to={`/player/${friend.uid}`} className="friends-who">
      <Avatar username={friend.username} size={36} />
      <span>{friend.username}</span>
    </Link>
  )
}

// A link opened before signing in (see AddFriendPage): offered once the account exists.
function PendingInvite({ account, friendships, onMessage }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(getPendingInvite)
  const [busy, setBusy] = useState(false)
  if (!username) return null

  const dismiss = () => {
    clearPendingInvite()
    setUsername(null)
  }
  const add = async () => {
    setBusy(true)
    try {
      const player = await sendFriendRequest({ uid: account.uid, username: account.username }, username, friendships.all)
      onMessage({ kind: 'notice', text: t('friends.sent', { username: player?.username ?? username }) })
    } catch (error) {
      onMessage({ kind: 'error', text: t(`friends.errors.${friendErrorKey(error)}`) })
    }
    dismiss()
  }

  return (
    <div className="friends-pending">
      <strong>{t('friends.pending_title', { username })}</strong>
      <p className="profile-muted">{t('friends.pending_hint')}</p>
      <div className="friends-pending__actions">
        <button type="button" className="friends-btn friends-btn--primary" disabled={busy} onClick={add}>
          {t('friends.pending_add', { username })}
        </button>
        <button type="button" className="friends-btn" onClick={dismiss}>
          {t('friends.dismiss')}
        </button>
      </div>
    </div>
  )
}

// Your own invitation link: whoever opens it can add you without knowing your username.
function InviteCard({ account }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share)
  const share = async () => {
    const result = await shareInviteLink({
      url: inviteUrl(window.location.origin, account.username),
      text: t('friends.invite_message'),
      title: 'GeoGame',
    })
    setCopied(result === 'copied')
  }
  return (
    <div className="friends-invite">
      <div>
        <strong>{t('friends.invite_title')}</strong>
        <p className="profile-muted">{t('friends.invite_hint')}</p>
        {copied && <p className="account-notice">{t('friends.invite_copied')}</p>}
      </div>
      <button type="button" className="friends-btn friends-btn--primary" onClick={share}>
        {t(canShare ? 'friends.invite_share' : 'friends.invite_copy')}
      </button>
    </div>
  )
}

export default function FriendsPanel({ account, friendships }) {
  const { t } = useTranslation()
  const today = useFriendsToday(friendships.friends)
  const [username, setUsername] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const search = usePlayerSearch(username)
  const recent = useRecentPlayers(friendships)
  const typed = username.trim().length >= SEARCH_MIN
  const found = search.results.filter((player) => player.uid !== account.uid).map((player) => ({ uid: player.uid, name: player.username }))

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setSending(true)
    setMessage(null)
    try {
      const player = await sendFriendRequest({ uid: account.uid, username: account.username }, username, friendships.all)
      const accepted = friendships.incoming.some((item) => item.uid === player?.uid)
      setMessage({ kind: 'notice', text: t(accepted ? 'friends.now_friends' : 'friends.sent', { username: player?.username ?? username.trim() }) })
      setUsername('')
    } catch (err) {
      setMessage({ kind: 'error', text: t(`friends.errors.${friendErrorKey(err)}`) })
    }
    setSending(false)
  }

  const handleRemove = (friend) => {
    if (window.confirm(t('friends.remove_confirm', { username: friend.username }))) removeFriendship(friend.id)
  }

  return (
    <section className="profile-section">
      <div className="profile-section-title">
        <h2>{t('friends.title')}</h2>
        <span className="profile-muted">{friendships.friends.length}</span>
      </div>

      <form className="friends-add" onSubmit={handleAdd}>
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setMessage(null)
          }}
          placeholder={t('friends.add_placeholder')}
          maxLength={USERNAME_MAX}
          aria-label={t('friends.add_title')}
        />
        <button type="submit" disabled={sending || !username.trim()}>{t('friends.add')}</button>
      </form>
      {message && <p className={message.kind === 'error' ? 'account-error' : 'account-notice'}>{message.text}</p>}
      {typed && !search.searching && found.length === 0 && <p className="profile-muted">{t('friends.search_none')}</p>}
      <FriendCandidates players={found} account={account} friendships={friendships} onMessage={setMessage} />

      <PendingInvite account={account} friendships={friendships} onMessage={setMessage} />

      {!typed && recent.length > 0 && (
        <div className="friends-group">
          <small className="profile-label">{t('friends.recent_title')}</small>
          <FriendCandidates players={recent} account={account} friendships={friendships} onMessage={setMessage} />
        </div>
      )}

      <InviteCard account={account} />
      <Link to="/community" className="friends-community">
        {t('friends.community_link')} →
      </Link>

      {friendships.incoming.length > 0 && (
        <div className="friends-group">
          <small className="profile-label">{t('friends.requests_title')}</small>
          <ul className="profile-list">
            {friendships.incoming.map((request) => (
              <li key={request.id} className="friends-row">
                <PlayerName friend={request} />
                <button type="button" className="friends-btn friends-btn--primary" onClick={() => acceptFriendRequest(request.id)}>
                  {t('friends.accept')}
                </button>
                <button type="button" className="friends-btn" onClick={() => removeFriendship(request.id)}>
                  {t('friends.decline')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {friendships.friends.length === 0 ? (
        <p className="profile-muted">{t('friends.empty')}</p>
      ) : (
        <div className="friends-group">
          <small className="profile-label">{t('friends.today_title')}</small>
          <ul className="profile-list">
            {friendships.friends.map((friend) => (
              <li key={friend.id} className="friends-row">
                <PlayerName friend={friend} />
                <DailyChips today={today[friend.uid] ?? {}} small />
                <button type="button" className="friends-btn friends-btn--icon" title={t('friends.remove')} aria-label={t('friends.remove')} onClick={() => handleRemove(friend)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {friendships.outgoing.length > 0 && (
        <div className="friends-group">
          <small className="profile-label">{t('friends.outgoing_title')}</small>
          <ul className="profile-list">
            {friendships.outgoing.map((request) => (
              <li key={request.id} className="friends-row">
                <PlayerName friend={request} />
                <button type="button" className="friends-btn" onClick={() => removeFriendship(request.id)}>
                  {t('friends.cancel')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

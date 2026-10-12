import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../../auth'
import { useFriendships } from '../../../hooks/usePlayerProfile'
import { inviteId, sendRoomInvite } from '../../../utils/invites'
import { requestPush } from '../../../utils/pushApi'
import '../Invites.css'

// Signed-in players invite their friends straight into the room: they get a banner on the site or in the app.
export default function InviteFriends({ room }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const signedIn = Boolean(account?.username)
  const friendships = useFriendships(signedIn ? account.uid : null)
  const [invited, setInvited] = useState({})

  if (!signedIn) {
    return (
      <div className="mpr-card">
        <h3>{t('invites.title')}</h3>
        <p className="invite-hint">
          <Link to="/account">{t('invites.sign_in')}</Link>
        </p>
      </div>
    )
  }
  if (friendships.loading) return null

  const inRoom = new Set(Object.values(room.players).map((player) => player.uid).filter(Boolean))

  const invite = async (friend) => {
    setInvited((previous) => ({ ...previous, [friend.uid]: 'sending' }))
    try {
      await sendRoomInvite({ uid: account.uid, username: account.username }, friend.uid, room)
      // Push notification to the friend's devices (best effort: the invite works without it)
      requestPush('invite-push', { inviteId: inviteId(room.id, friend.uid) })
      setInvited((previous) => ({ ...previous, [friend.uid]: 'sent' }))
    } catch (error) {
      console.warn('[invites]', error)
      setInvited((previous) => ({ ...previous, [friend.uid]: 'failed' }))
    }
  }

  return (
    <div className="mpr-card">
      <h3>{t('invites.title')}</h3>
      {friendships.friends.length === 0 ? (
        <p className="invite-hint">
          <Link to="/account">{t('invites.no_friends')}</Link>
        </p>
      ) : (
        <ul className="mpr-list">
          {friendships.friends.map((friend) => {
            const state = inRoom.has(friend.uid) ? 'joined' : invited[friend.uid]
            return (
              <li key={friend.id} className="mpr-row">
                <span className="mpr-name">{friend.username}</span>
                {state === 'joined' ? (
                  <span className="invite-sent">✓ {t('invites.joined')}</span>
                ) : state === 'sent' ? (
                  <span className="invite-sent">✓ {t('invites.sent')}</span>
                ) : (
                  <button type="button" className="mpr-friend-btn" onClick={() => invite(friend)} disabled={state === 'sending'}>
                    {t(state === 'failed' ? 'invites.retry' : 'invites.invite')}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

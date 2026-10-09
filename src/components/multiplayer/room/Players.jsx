import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../../auth'
import { useFriendships } from '../../../hooks/usePlayerProfile'
import { sendFriendRequestTo } from '../../../utils/friends'

// Friend request to a room player who has an account and isn't a friend yet (accepts theirs if they asked first).
function AddFriendButton({ account, friendships, uid }) {
  const { t } = useTranslation()
  const [state, setState] = useState(null)
  const status = friendships.all.find((item) => item.uid === uid)?.status
  if (status === 'friend') return null
  if (status === 'outgoing') return <span className="mpr-friend-sent">✓ {t('mp_room.request_sent')}</span>

  const add = async () => {
    setState('sending')
    try {
      await sendFriendRequestTo({ uid: account.uid, username: account.username }, uid, friendships.all)
      setState(null)
    } catch (error) {
      console.warn('[friends]', error)
      setState('failed')
    }
  }

  return (
    <button type="button" className="mpr-friend-btn" onClick={add} disabled={state === 'sending'}>
      {t(state === 'failed' ? 'mp_room.retry' : status === 'incoming' ? 'mp_room.accept_friend' : 'mp_room.add_friend')}
    </button>
  )
}

// The room's players. `strangersOnly`: once the games have started, only the players the account can still add.
export default function Players({ room, playerId, strangersOnly = false }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const canAdd = (player) => Boolean(account?.username && player.uid && player.uid !== account.uid && !friendships.loading)
  const players = Object.entries(room.players).filter(
    ([, player], index, all) =>
      !strangersOnly ||
      (canAdd(player) &&
        all.findIndex(([, other]) => other.uid === player.uid) === index &&
        !friendships.friends.some((friend) => friend.uid === player.uid))
  )
  if (strangersOnly && players.length === 0) return null

  return (
    <div className="mpr-card">
      <h3>{strangersOnly ? t('mp_room.add_players') : t('mp_room.players', { count: players.length })}</h3>
      <ul className="mpr-list">
        {players.map(([id, player]) => (
          <li key={id} className={`mpr-row${id === playerId ? ' mpr-row--me' : ''}`}>
            <span className="mpr-name">
              {player.pseudo}
              {id === playerId && ` (${t('mp_room.you')})`}
            </span>
            {id === room.hostId && <span className="mpr-badge">{t('mp_room.host')}</span>}
            {canAdd(player) && <AddFriendButton account={account} friendships={friendships} uid={player.uid} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../../../auth'
import { useBadges } from '../../../hooks/useBadges'
import { useFriendships } from '../../../hooks/usePlayerProfile'
import BadgeStrip from '../../profile/BadgeStrip'
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
export default function Players({ room, playerId, strangersOnly = false, readOnly = false }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const friendships = useFriendships(account?.username ? account.uid : null)
  const badges = useBadges(Object.values(room.players).map((player) => player.uid))
  const canAdd = (player) => Boolean(account?.username && player.uid && player.uid !== account.uid && !friendships.loading)
  const players = Object.entries(room.players).filter(
    ([, player], index, all) =>
      readOnly || !strangersOnly ||
      (canAdd(player) &&
        all.findIndex(([, other]) => other.uid === player.uid) === index &&
        !friendships.friends.some((friend) => friend.uid === player.uid))
  )
  if (strangersOnly && players.length === 0) return null

  return (
    <div className="mpr-card">
      {!(strangersOnly && !readOnly) && <p className="gg-kicker">{t('mp_room.manifest')}</p>}
      <h3>{strangersOnly && !readOnly ? t('mp_room.add_players') : t('mp_room.players', { count: players.length })}</h3>
      {!(strangersOnly && !readOnly) && (
        <div className="mpr-board-head gg-board-head" aria-hidden="true">
          <span>N°</span>
          <span>{t('mp_room.col_player')}</span>
        </div>
      )}
      <ul className="mpr-list">
        {players.map(([id, player], index) => (
          <li key={id} className={`mpr-row${id === playerId ? ' mpr-row--me' : ''}`}>
            {!(strangersOnly && !readOnly) && <span className="mpr-rank" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
            <span className="mpr-name">
              {player.pseudo}
              {id === playerId && ` (${t('mp_room.you')})`}
            </span>
            <BadgeStrip badges={badges[player.uid]} />
            {id === room.hostId && <span className="mpr-badge">{t('mp_room.host')}</span>}
            {!readOnly && canAdd(player) && <AddFriendButton account={account} friendships={friendships} uid={player.uid} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

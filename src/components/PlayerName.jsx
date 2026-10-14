import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReportButton from './ReportButton'
import './PlayerName.css'

// Whether a leaderboard entry belongs to the signed-in account.
export const isMine = (entry, account) => Boolean(account?.uid && entry.uid === account.uid)

// Row class for the signed-in player's own entries.
export const mineClass = (entry, account) => (isMine(entry, account) ? ' leaderboard-row--mine' : '')

// "+" next to another player's name: sends them a friend request (or accepts theirs). Gone once you are friends.
function QuickAdd({ account, entry }) {
  const { t } = useTranslation()
  const friendships = useFriendships(account.uid)
  const [failed, setFailed] = useState(false)
  if (friendships.loading) return null
  const status = friendships.all.find((item) => item.uid === entry.uid)?.status
  if (status === 'friend') return null
  if (status === 'outgoing') return <span className="player-name__sent" title={t('friends.request_sent')}>✓</span>

  const add = async (event) => {
    event.stopPropagation()
    try {
      await sendFriendRequestTo({ uid: account.uid, username: account.username }, entry.uid, friendships.all)
      setFailed(false)
    } catch (error) {
      console.warn('[friends]', error?.code, error)
      setFailed(true)
    }
  }
  return (
    <button
      type="button"
      className={`player-name__add${failed ? ' player-name__add--failed' : ''}`}
      aria-label={t('friends.quick_add', { username: entry.name })}
      title={t('friends.quick_add', { username: entry.name })}
      onClick={add}
    >
      {failed ? '!' : '+'}
    </button>
  )
}

// Name of a leaderboard entry: a link to the player's profile when it belongs to an account,
// with a "you" badge on the signed-in player's own entries. With `reportIn` (the leaderboard's collection, for
// entries that came with their id), the other players' entries get a discreet report button.
export default function PlayerName({ entry, account, reportIn }) {
  const { t } = useTranslation()
  return (
    <>
      {entry.uid ? (
        <Link to={`/player/${entry.uid}`} className="player-name__link" onClick={(event) => event.stopPropagation()}>
          {entry.name}
        </Link>
      ) : (
        entry.name
      )}
      {isMine(entry, account) && <span className="player-name__you">{t('score_save.you')}</span>}
      {reportIn && entry.id && !isMine(entry, account) && <ReportButton collection={reportIn} entry={entry} />}
    </>
  )
}

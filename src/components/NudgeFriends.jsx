import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount } from '../auth'
import { useFriendships } from '../hooks/usePlayerProfile'
import { nudgeFriend } from '../utils/dailyNudge'
import './NudgeFriends.css'

// End of a game: one click sends a friend a "come and beat me" push notification (api/daily-nudge).
// `recent`: a regular game (any game of that type played in the last hours), otherwise the daily challenge.
export default function NudgeFriends({ gameType, recent = false }) {
  const { t } = useTranslation()
  const { account } = useAccount()
  const signedIn = Boolean(account?.username)
  const { friends } = useFriendships(signedIn ? account.uid : null)
  const [states, setStates] = useState({})

  if (!signedIn || !friends?.length) return null

  const send = async (friend) => {
    setStates((current) => ({ ...current, [friend.uid]: 'sending' }))
    const result = await nudgeFriend(friend.uid, gameType, { recent })
    setStates((current) => ({ ...current, [friend.uid]: result }))
  }

  const failedFriend = friends.find((friend) => states[friend.uid] && !['sending', 'sent'].includes(states[friend.uid]))
  const failure = failedFriend ? states[failedFriend.uid] : null
  const anySent = Object.values(states).includes('sent')

  return (
    <div className="nudge-friends">
      <strong>{t('challenge.nudge_title')}</strong>
      <span className="nudge-hint">{t('challenge.nudge_hint')}</span>
      <div className="nudge-chips">
        {friends.map((friend) => {
          const state = states[friend.uid]
          return (
            <button
              key={friend.uid}
              type="button"
              className={`nudge-chip${state === 'sent' ? ' nudge-chip-done' : ''}`}
              disabled={state === 'sending' || state === 'sent'}
              onClick={() => send(friend)}
            >
              {friend.username} {state === 'sent' ? '✓' : state === 'sending' ? '…' : '🔔'}
            </button>
          )
        })}
      </div>
      {failure && (
        <span className="nudge-warning">
          {t(`challenge.nudge_${['unreachable', 'already_sent', 'rate_limited', 'not_played'].includes(failure) ? failure : 'error'}`, {
            username: failedFriend.username,
          })}
        </span>
      )}
      {anySent && !failure && <span className="nudge-ok">{t('challenge.nudge_sent')}</span>}
    </div>
  )
}

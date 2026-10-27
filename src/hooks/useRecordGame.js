import { useEffect, useRef } from 'react'
import { refreshOwnBadges } from '../utils/badges'
import { recordGame } from '../utils/gameHistory'
import { settleChallenges } from '../utils/dailyNudge'
import { claimXp } from '../utils/xp'

// Records `record` in the signed-in player's history once, when it goes from null to a value (the end of a game),
// then keeps the player's public badges up to date and asks for the XP it earned. Back to null (new game), the next
// record is saved again.
export function useRecordGameWith(auth, record) {
  const latest = useRef(record)
  latest.current = record
  const done = useRef(false)
  const finished = record != null

  useEffect(() => {
    if (!finished) {
      done.current = false
      return
    }
    if (done.current) return
    done.current = true
    recordGame(auth, latest.current).then((uid) => {
      if (!uid) return
      refreshOwnBadges(uid)
      claimXp(uid)
      settleChallenges()
    })
  }, [auth, finished])
}

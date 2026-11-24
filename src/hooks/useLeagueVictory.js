import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLastWeek, paidLeagueResult, PODIUM_SIZE, previousWeekKey } from '../utils/league'
import { revealLeagueFlags } from '../utils/leagueFlagReveal'
import { serverNow } from '../utils/serverTime'

// The device remembers the last week it looked at, per account: the victory shows once per device.
const seenKey = (uid) => `geogame_league_seen_${uid}`

function getSeen(uid) {
  try {
    return globalThis.localStorage?.getItem(seenKey(uid)) ?? null
  } catch {
    return null
  }
}

function setSeen(uid, week) {
  try {
    globalThis.localStorage?.setItem(seenKey(uid), week)
  } catch {
    // Storage unavailable: the screen may show again, nothing worse.
  }
}

/**
 * The podium finish of the account `uid` (null for a visitor) in the week that just ended, once per device:
 * { result: { week, rank, points, reward, flagReveal? } | null, dismiss }. A podium result is marked seen when
 * dismissed, which also hands its flag unlocks to the global reveal overlay. Outside the podium, flags are
 * revealed directly. A week that has not closed is checked again on the next visit.
 */
export function useLeagueVictory(uid) {
  const [victory, setVictory] = useState(null)
  const dismissed = useRef(null)
  const result = victory && victory.uid === uid ? victory.result : null

  useEffect(() => {
    setVictory(null)
    if (!uid) return undefined
    const week = previousWeekKey(serverNow())
    if (getSeen(uid) === week) return undefined
    let cancelled = false
    fetchLastWeek()
      .then((last) => {
        if (cancelled || last?.week !== week) return
        const paid = paidLeagueResult(last, uid)
        if (paid && paid.rank <= PODIUM_SIZE) setVictory({ uid, result: paid })
        else {
          revealLeagueFlags(uid, paid?.flagReveal)
          setSeen(uid, week)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [uid])

  const dismiss = useCallback(() => {
    if (!result || dismissed.current === result) return
    dismissed.current = result
    revealLeagueFlags(uid, result.flagReveal)
    setSeen(uid, result.week)
    setVictory(null)
  }, [result, uid])
  return { result, dismiss }
}

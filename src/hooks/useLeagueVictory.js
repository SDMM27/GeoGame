import { useCallback, useEffect, useState } from 'react'
import { fetchLastWeek, podiumResult, previousWeekKey } from '../utils/league'
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
 * { result: { week, rank, points, reward } | null, dismiss }. Once the week is stored on the device nothing is read, so
 * it costs about one read a week. While the server hasn't closed the week yet (weeklyTop/last is older), nothing is
 * stored and the next visit asks again. Failures are silent.
 */
export function useLeagueVictory(uid) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    setResult(null)
    if (!uid) return undefined
    const week = previousWeekKey(serverNow())
    if (getSeen(uid) === week) return undefined
    let cancelled = false
    fetchLastWeek()
      .then((last) => {
        if (cancelled || last?.week !== week) return
        setSeen(uid, week)
        setResult(podiumResult(last, uid))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [uid])

  const dismiss = useCallback(() => setResult(null), [])
  return { result, dismiss }
}

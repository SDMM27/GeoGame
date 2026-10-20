import { useCallback, useEffect, useState } from 'react'
import { fetchGames } from '../utils/gameHistory'
import { BONUS_ID, missionsAt } from '../utils/missions'
import { serverNow } from '../utils/serverTime'
import { claimXp, onXpClaimed } from '../utils/xp'
import { useXp } from './useXp'

// Most games a week can hold that matter here (the week's games are the most recent ones).
const RECENT_GAMES = 300

/**
 * The signed-in player's missions of today and this week, with their progress, plus their XP:
 * { loading, xp, day, week, daily: [{ mission, progress, done, paid }], weekly: [...], dailyBonus, weeklyBonus }
 * (`paid`: the server already paid it; the bonuses say whether the bonus of the period is paid).
 * Asks the server to pay what is due when it loads and after each game (useRecordGame), then reloads the progress.
 * `uid` null (visitor): nothing loads.
 */
export function useMissions(uid) {
  const xp = useXp(uid)
  const [progress, setProgress] = useState(null)

  const load = useCallback(async () => {
    if (!uid) return
    try {
      setProgress(missionsAt(await fetchGames(uid, RECENT_GAMES), serverNow()))
    } catch (error) {
      console.warn('[missions]', error)
    }
  }, [uid])

  useEffect(() => {
    setProgress(null)
    if (!uid) return undefined
    load()
    claimXp(uid)
    return onXpClaimed(load)
  }, [uid, load])

  if (!uid) return { loading: false, xp: null, daily: [], weekly: [] }
  const sameDay = xp && progress && xp.day === progress.day
  const sameWeek = xp && progress && xp.week === progress.week
  const paidOf = (paid, same) => (entry) => ({ ...entry, paid: Boolean(same && paid.includes(entry.mission.id)) })
  return {
    loading: !progress || !xp,
    xp,
    day: progress?.day,
    week: progress?.week,
    daily: progress ? progress.daily.map(paidOf(xp?.dayMissions ?? [], sameDay)) : [],
    weekly: progress ? progress.weekly.map(paidOf(xp?.weekMissions ?? [], sameWeek)) : [],
    dailyBonus: Boolean(sameDay && xp.dayMissions.includes(BONUS_ID)),
    weeklyBonus: Boolean(sameWeek && xp.weekMissions.includes(BONUS_ID)),
  }
}

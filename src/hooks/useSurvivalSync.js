// src/hooks/useSurvivalSync.js
// The shared round of a live survival room (see utils/survivalSync.js), for the website and the app.
// `entries`: the players' progress in this game, with `lastSeen` in server ms. `startAt`: the game's start (server ms).
// Returns the round everyone plays ({ round, startAt }), its time limit on this device's clock (`deadline`, for
// useSurvivalState) and how many players are done with it (`waiting`).
import { useEffect, useRef, useState } from 'react'
import { serverNow } from '../utils/serverTime'
import { furthestRound, nextRoundStart, roundWaiting } from '../utils/survivalSync'

export default function useSurvivalSync({ enabled, startAt, timer, entries }) {
  const [shared, setShared] = useState({ round: 0, startAt })
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  const timerMs = (timer ?? 0) * 1000

  useEffect(() => {
    if (!enabled) return undefined
    const check = () => {
      setShared((previous) => {
        let current = previous
        // Back after a reconnection, or a little behind the others: join the round they are on
        const furthest = furthestRound(entriesRef.current)
        if (furthest && furthest.round > current.round) current = furthest
        const next = nextRoundStart(entriesRef.current, { round: current.round, startAt: current.startAt, timerMs })
        if (serverNow() >= next) current = { round: current.round + 1, startAt: next }
        return current
      })
    }
    check()
    const id = setInterval(check, 250)
    return () => clearInterval(id)
  }, [enabled, timerMs])

  const offset = serverNow() - Date.now()
  return {
    round: shared.round,
    startAt: shared.startAt,
    deadline: enabled && timerMs > 0 ? shared.startAt + timerMs - offset : null,
    waiting: roundWaiting(entries, shared.round),
  }
}

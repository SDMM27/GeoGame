// src/hooks/useSurvivalSync.js
// The shared round of a live survival room (see utils/survivalSync.js), for the website and the app.
// `entries`: the players' progress in this game ({ id, ... }), with `lastSeen` in server ms. `playerId`: this player. `startAt`: the game's start (server ms).
// Returns the round everyone plays ({ round, startAt }), its time limit on this device's clock (`deadline`, for
// useSurvivalState), how many players are done with it (`waiting`) and, once everyone else is out, the round after
// which this player is the last one left (`lastSurvivorRound`, see utils/survivalSync.js).
import { useEffect, useRef, useState } from 'react'
import { serverNow } from '../utils/serverTime'
import { furthestRound, lastSurvivorRound, nextRoundStart, roundWaiting } from '../utils/survivalSync'

export default function useSurvivalSync({ enabled, startAt, timer, entries, playerId = null }) {
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
    lastSurvivorRound: enabled ? lastSurvivorRound(entries, playerId) : null,
  }
}

// { [uid]: { status, room, game } } for the friends (one presence listener each, at most MAX_FRIENDS_PRESENCE).
// The statuses are re-evaluated every 30 s: a friend whose heartbeats stop goes offline without a new snapshot.
import { useEffect, useMemo, useState } from 'react'
import { presenceStatus, subscribePresence } from '../utils/presence'

export const MAX_FRIENDS_PRESENCE = 50
export const PRESENCE_REFRESH_MS = 30 * 1000

export default function useFriendsPresence(friendUids) {
  const key = [...new Set(friendUids ?? [])].slice(0, MAX_FRIENDS_PRESENCE).sort().join(',')
  const [docs, setDocs] = useState({})
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const uids = key ? key.split(',') : []
    setDocs({})
    const unsubscribes = uids.map((uid) =>
      subscribePresence(uid, (data) => setDocs((previous) => ({ ...previous, [uid]: data })))
    )
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [key])

  useEffect(() => {
    if (!key) return undefined
    const interval = setInterval(() => setTick((value) => value + 1), PRESENCE_REFRESH_MS)
    return () => clearInterval(interval)
  }, [key])

  return useMemo(() => {
    const result = {}
    for (const [uid, data] of Object.entries(docs)) {
      const status = presenceStatus(data)
      result[uid] = { status, room: status === 'playing' ? data.room : null, game: status === 'playing' ? (data.game ?? null) : null }
    }
    return result
  }, [docs, tick]) // eslint-disable-line react-hooks/exhaustive-deps
}

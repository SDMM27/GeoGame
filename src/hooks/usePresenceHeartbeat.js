// Keeps presence/{uid} fresh while the account is signed in and the page / app is visible (`isActive`).
// One write at start, then every PRESENCE_HEARTBEAT_MS, and (debounced) as soon as the room being played changes.
import { useEffect } from 'react'
import { getPresenceRoom, PRESENCE_HEARTBEAT_MS, subscribePresenceRoom, writePresence } from '../utils/presence'

export const PRESENCE_ROOM_DEBOUNCE_MS = 2000

export default function usePresenceHeartbeat(account, isActive = true) {
  const uid = account?.uid
  const signedUp = Boolean(account?.username)

  useEffect(() => {
    if (!uid || !signedUp || !isActive) return undefined
    const write = () => {
      const current = getPresenceRoom()
      writePresence(uid, { room: current?.room ?? null, game: current?.game ?? null }).catch((error) => console.warn(error))
    }
    write()
    const interval = setInterval(write, PRESENCE_HEARTBEAT_MS)
    let timer = null
    const unsubscribe = subscribePresenceRoom(() => {
      clearTimeout(timer)
      timer = setTimeout(write, PRESENCE_ROOM_DEBOUNCE_MS)
    })
    return () => {
      clearInterval(interval)
      clearTimeout(timer)
      unsubscribe()
    }
  }, [uid, signedUp, isActive])
}

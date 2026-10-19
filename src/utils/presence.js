// Online status of friends, shared by the website and the app.
// presence/{uid} = { at: serverTimestamp(), room: 'ABC234' | null, game: GAME_TYPES value | null, expiresAt }
// Written by the player every PRESENCE_HEARTBEAT_MS while the page / app is open (src/hooks/usePresenceHeartbeat.js),
// readable by the player and their accepted friends, one document at a time (no queries). expiresAt: daily cleanup.
import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { serverNow } from './serverTime'

export const PRESENCE_HEARTBEAT_MS = 2 * 60 * 1000
export const PRESENCE_ONLINE_MS = 3 * 60 * 1000
const PRESENCE_TTL_MS = 24 * 60 * 60 * 1000

// What firestore.rules accept (presence/{uid}): anything else is sent as null rather than refusing the whole write.
const ROOM_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/
const GAME_TYPE = /^[A-Z_]{1,40}$/

export function writePresence(uid, { room = null, game = null } = {}) {
  const code = typeof room === 'string' && ROOM_CODE.test(room) ? room : null
  return setDoc(doc(firestore, 'presence', uid), {
    at: serverTimestamp(),
    room: code,
    game: code && typeof game === 'string' && GAME_TYPE.test(game) ? game : null,
    expiresAt: Timestamp.fromMillis(serverNow() + PRESENCE_TTL_MS),
  })
}

// callback(doc | null): null when the friend has no presence document, or when it cannot be read.
export function subscribePresence(uid, callback) {
  return onSnapshot(
    doc(firestore, 'presence', uid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    () => callback(null)
  )
}

const millis = (value) => (typeof value?.toMillis === 'function' ? value.toMillis() : null)

// 'playing': online and in a room. 'online': heartbeat seen less than PRESENCE_ONLINE_MS ago. 'offline' otherwise.
export function presenceStatus(presence, nowMs = serverNow()) {
  const at = millis(presence?.at)
  if (at == null || nowMs - at >= PRESENCE_ONLINE_MS) return 'offline'
  return presence.room ? 'playing' : 'online'
}

// The room this device is playing in, if any. Rooms come in and out of screens one after the other (the room screen
// hands over to the game screen), so each set is paired with its clear and the latest set wins.
let rooms = []
const listeners = new Set()

const notify = () => listeners.forEach((listener) => listener(getPresenceRoom()))

export const getPresenceRoom = () => rooms[rooms.length - 1] ?? null

export function setPresenceRoom(code, game = null) {
  rooms.push({ room: code, game })
  notify()
}

// Only clears the room it was set for: a screen leaving after the next one took over changes nothing.
export function clearPresenceRoom(code) {
  const index = rooms.map((entry) => entry.room).lastIndexOf(code)
  if (index === -1) return
  rooms.splice(index, 1)
  notify()
}

export function subscribePresenceRoom(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const resetPresenceRoom = () => {
  rooms = []
  listeners.clear()
}

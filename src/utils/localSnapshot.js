// Last values seen on this device (account, XP, games, league), so the app can draw them at once on start and refresh
// them from the network afterwards (stale-while-revalidate). Shared by the website and the app (localStorage, which the
// app polyfills). Only the data of the account signed in on this device is kept, never other players.
import { Timestamp } from 'firebase/firestore'

const PREFIX = 'geogame-snap:'
const OWN_UID_KEY = 'own-uid'

// JSON.stringify calls toJSON before the replacer, so a Timestamp is read from `this` (the raw value).
function replacer(key, value) {
  const raw = this[key]
  return typeof raw?.toMillis === 'function' ? { __ts: raw.toMillis() } : value
}

const reviver = (key, value) => (value && typeof value === 'object' && typeof value.__ts === 'number' ? Timestamp.fromMillis(value.__ts) : value)

// Parsed values already read or written: render paths read them often (a game screen re-renders with its timer), and
// the app's storage is SQLite. Callers never mutate what they get.
const memory = new Map()

export function readSnapshot(key) {
  if (memory.has(key)) return memory.get(key)
  let value = null
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key)
    value = raw ? JSON.parse(raw, reviver) : null
  } catch {
    return null
  }
  memory.set(key, value)
  return value
}

// null / undefined forgets the snapshot.
export function writeSnapshot(key, value) {
  memory.set(key, value ?? null)
  try {
    if (value === null || value === undefined) globalThis.localStorage?.removeItem(PREFIX + key)
    else globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value, replacer))
  } catch {
    // Storage full or unavailable: the snapshot is only a speed-up.
  }
}

let ownUidValue
// The uid of the account signed in on this device (null when signed out).
export function ownUid() {
  if (ownUidValue === undefined) ownUidValue = readSnapshot(OWN_UID_KEY)
  return ownUidValue
}

// Tests only: forget the parsed values, as on a new start.
export function resetSnapshotMemory() {
  memory.clear()
  ownUidValue = undefined
}

export function setOwnUid(uid) {
  ownUidValue = uid ?? null
  writeSnapshot(OWN_UID_KEY, ownUidValue)
}

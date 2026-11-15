// The public part of a users/{uid} document (badges, decoration), read once per account for a few minutes, so a
// leaderboard or a lobby full of names doesn't read the same accounts again. Shared by the website and the app.
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { ownUid, readSnapshot, writeSnapshot } from './localSnapshot'

const CACHE_FOR = 10 * 60 * 1000
const cache = new Map()
const pending = new Map()
const listeners = new Set()

// The document's data ({} for a visitor, a missing account, or when it can't be read).
export async function fetchPublicData(uid) {
  const cached = cache.get(uid)
  if (cached && Date.now() - cached.at < CACHE_FOR) return cached.data
  if (!pending.has(uid)) {
    pending.set(
      uid,
      getDoc(doc(firestore, 'users', uid))
        .then((snapshot) => ({ data: snapshot.data() ?? {}, failed: false }))
        .catch(() => ({ data: {}, failed: true }))
        .then(({ data, failed }) => {
          cache.set(uid, { at: Date.now(), data })
          // A failed read must not overwrite the last good copy kept for the next start.
          if (!failed && uid === ownUid()) writeSnapshot(`public:${uid}`, data)
          pending.delete(uid)
          return data
        })
    )
  }
  return pending.get(uid)
}

// The cached copy right away, when there is a fresh one (lets a name show its decoration without a flash). For the
// account of this device, the copy kept from the last run (maybe stale) stands in: callers refetch right after, and it
// stays out of `cache` so fetchPublicData still goes to the network.
export function cachedPublicData(uid) {
  const cached = cache.get(uid)
  if (cached && Date.now() - cached.at < CACHE_FOR) return cached.data
  return uid === ownUid() ? readSnapshot(`public:${uid}`) : null
}

// After the player changed their own document: keep the cache in step instead of waiting for it to expire.
export function patchPublicData(uid, fields) {
  // Without a cached copy there is nothing to keep in step: the next read gets the new document.
  const cached = cache.get(uid)
  if (cached) cache.set(uid, { at: Date.now(), data: { ...cached.data, ...fields } })
  if (uid === ownUid()) {
    const data = cached ? { ...cached.data, ...fields } : readSnapshot(`public:${uid}`)
    if (data) writeSnapshot(`public:${uid}`, cached ? data : { ...data, ...fields })
  }
  listeners.forEach((listener) => listener(uid))
}

// Called with the uid whenever patchPublicData changes an account (the player's own names update at once).
export function onPublicDataPatched(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

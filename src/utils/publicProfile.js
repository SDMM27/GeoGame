// The public part of a users/{uid} document (badges, decoration), read once per account for a few minutes, so a
// leaderboard or a lobby full of names doesn't read the same accounts again. Shared by the website and the app.
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'

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
        .then((snapshot) => snapshot.data() ?? {})
        .catch(() => ({}))
        .then((data) => {
          cache.set(uid, { at: Date.now(), data })
          pending.delete(uid)
          return data
        })
    )
  }
  return pending.get(uid)
}

// The cached copy right away, when there is a fresh one (lets a name show its decoration without a flash).
export function cachedPublicData(uid) {
  const cached = cache.get(uid)
  return cached && Date.now() - cached.at < CACHE_FOR ? cached.data : null
}

// After the player changed their own document: keep the cache in step instead of waiting for it to expire.
export function patchPublicData(uid, fields) {
  // Without a cached copy there is nothing to keep in step: the next read gets the new document.
  const cached = cache.get(uid)
  if (cached) cache.set(uid, { at: Date.now(), data: { ...cached.data, ...fields } })
  listeners.forEach((listener) => listener(uid))
}

// Called with the uid whenever patchPublicData changes an account (the player's own names update at once).
export function onPublicDataPatched(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The flag collection and the mastery of an account, read from Firestore (rules and data model: flagCollection.js).
// Shared by the website and the app. users/{uid}.flags comes with the public user document (publicProfile.js); the
// mastery document is read once per account for a few minutes, like it.
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import countriesMeta from '../data/countries.meta.json'
import { fetchPublicData } from './publicProfile'
import { flagPool, masteryProgress, masterySets, readFlags } from './flagCollection'

export const FLAG_POOL = flagPool(countriesMeta.features)
export const MASTERY_SETS = masterySets(countriesMeta.features)

const CACHE_FOR = 10 * 60 * 1000
const cache = new Map()
const pending = new Map()

// mastery/{uid} ({} for a missing document, a visitor, or when it can't be read).
export async function fetchMastery(uid) {
  const cached = cache.get(uid)
  if (cached && Date.now() - cached.at < CACHE_FOR) return cached.data
  if (!pending.has(uid)) {
    pending.set(
      uid,
      getDoc(doc(firestore, 'mastery', uid))
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

// { flagsUnlocked, flagsTotal, masteryFound, masteryTotal } for computeAchievements().
export function collectionSummary(flags, masteryDoc) {
  const mastery = masteryProgress(masteryDoc, MASTERY_SETS)
  return { flagsUnlocked: flags.unlocked.length, flagsTotal: FLAG_POOL.length, masteryFound: mastery.found, masteryTotal: mastery.total }
}

/** The collection of one account: { flags: readFlags(), mastery: masteryProgress(), summary }. */
export async function fetchCollection(uid) {
  const [data, masteryDoc] = await Promise.all([fetchPublicData(uid), fetchMastery(uid)])
  const flags = readFlags(data, FLAG_POOL)
  return { flags, mastery: masteryProgress(masteryDoc, MASTERY_SETS), summary: collectionSummary(flags, masteryDoc) }
}

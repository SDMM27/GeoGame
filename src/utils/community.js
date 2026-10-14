// Community directory: the players who chose to appear in a list that everyone can browse, to find friends
// without knowing their username. Shared by the website and the app.
//
// users/{uid}.communityAt is the opt-in: the server time of joining, absent when the player isn't listed
// (firestore.rules: only the owner, only this field). The list is the members, newest first.
import { collection, deleteField, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, updateDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { readBadges } from './badges'

export const COMMUNITY_PAGE = 20

// { members: [{ uid, username, badges, since }], cursor, done }. `cursor`: the previous page's, for the next one.
export async function fetchCommunity(cursor = null) {
  const base = [collection(firestore, 'users'), orderBy('communityAt', 'desc')]
  const snapshot = await getDocs(query(...base, ...(cursor ? [startAfter(cursor)] : []), limit(COMMUNITY_PAGE)))
  return {
    members: snapshot.docs
      .filter((item) => typeof item.data().username === 'string')
      .map((item) => ({
        uid: item.id,
        username: item.data().username,
        badges: readBadges(item.data()),
        since: item.data().communityAt?.toMillis?.() ?? null,
      })),
    cursor: snapshot.docs[snapshot.docs.length - 1] ?? cursor,
    done: snapshot.docs.length < COMMUNITY_PAGE,
  }
}

export async function isInCommunity(uid) {
  const snapshot = await getDoc(doc(firestore, 'users', uid))
  return snapshot.exists() && snapshot.data().communityAt != null
}

export const joinCommunity = (uid) => updateDoc(doc(firestore, 'users', uid), { communityAt: serverTimestamp() })

export const leaveCommunity = (uid) => updateDoc(doc(firestore, 'users', uid), { communityAt: deleteField() })

// The top of the week, computed once a day by the server (api/_lib/weeklyTop.mjs): [{ uid, name, points, played, golds }],
// best first; empty until the first run.
export async function fetchWeeklyTop() {
  const snapshot = await getDoc(doc(firestore, 'weeklyTop', 'current'))
  const entries = snapshot.exists() ? snapshot.data().entries : []
  return Array.isArray(entries) ? entries.filter((entry) => typeof entry?.uid === 'string' && typeof entry.name === 'string') : []
}

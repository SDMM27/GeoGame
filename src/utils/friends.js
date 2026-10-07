// Friends, shared by the website and the app.
// friendships/{uidA_uidB} (uids sorted): { users: [uidA, uidB], usernames: { uid: username },
//                                         requester, status: 'pending' | 'accepted', createdAt, acceptedAt }
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../Firebase'
import { normalizeUsername } from './account'

class FriendError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

export const friendshipId = (uidA, uidB) => [uidA, uidB].sort().join('_')

// { uid, username } of the account with this username, or null.
export async function findPlayer(username) {
  const name = normalizeUsername(username)
  if (!name) return null
  const snapshot = await getDoc(doc(firestore, 'usernames', name.toLowerCase()))
  return snapshot.exists() ? { uid: snapshot.data().uid, username: snapshot.data().username } : null
}

// { uid, username, createdAt } or null.
export async function fetchPlayer(uid) {
  const snapshot = await getDoc(doc(firestore, 'users', uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return { uid, username: data.username, createdAt: data.createdAt?.toMillis?.() ?? null }
}

// `me` is the signed-in account ({ uid, username }); `known` the current friendships list (see splitFriendships).
export async function sendFriendRequest(me, username, known = []) {
  const player = await findPlayer(username)
  if (!player) throw new FriendError('not_found')
  if (player.uid === me.uid) throw new FriendError('self')
  const existing = known.find((item) => item.uid === player.uid)
  if (existing) {
    // They already asked: accepting is what the player means.
    if (existing.status === 'incoming') return acceptFriendRequest(existing.id)
    throw new FriendError(existing.status === 'friend' ? 'already_friends' : 'already_sent')
  }
  await setDoc(doc(firestore, 'friendships', friendshipId(me.uid, player.uid)), {
    users: [me.uid, player.uid],
    usernames: { [me.uid]: me.username, [player.uid]: player.username },
    requester: me.uid,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return player
}

export function acceptFriendRequest(id) {
  return updateDoc(doc(firestore, 'friendships', id), { status: 'accepted', acceptedAt: serverTimestamp() })
}

// Declines a request, cancels one sent, or removes a friend.
export function removeFriendship(id) {
  return deleteDoc(doc(firestore, 'friendships', id))
}

// [{ id, uid, username, status: 'friend' | 'incoming' | 'outgoing', since }] seen from `uid`.
export function splitFriendships(docs, uid) {
  return docs
    .map((friendship) => {
      const other = friendship.users.find((user) => user !== uid)
      const status =
        friendship.status === 'accepted' ? 'friend' : friendship.requester === uid ? 'outgoing' : 'incoming'
      const since = friendship.acceptedAt ?? friendship.createdAt
      return {
        id: friendship.id,
        uid: other,
        username: friendship.usernames?.[other] ?? '?',
        status,
        since: since?.toMillis?.() ?? null,
      }
    })
    .sort((a, b) => a.username.localeCompare(b.username))
}

export function watchFriendships(uid, callback) {
  return onSnapshot(
    query(collection(firestore, 'friendships'), where('users', 'array-contains', uid)),
    (snapshot) => callback(splitFriendships(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), uid)),
    (error) => {
      console.warn('[friends]', error?.code, error)
      callback([])
    }
  )
}

const FRIEND_ERRORS = ['not_found', 'self', 'already_friends', 'already_sent']

// i18n key under `friends.errors`.
export function friendErrorKey(error) {
  if (error instanceof FriendError && FRIEND_ERRORS.includes(error.code)) return error.code
  console.warn('[friends]', error?.code, error)
  return error?.code === 'unavailable' ? 'network' : 'generic'
}

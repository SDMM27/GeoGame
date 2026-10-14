// Friends, shared by the website and the app.
// friendships/{uidA_uidB} (uids sorted): { users: [uidA, uidB], usernames: { uid: username },
//                                         requester, status: 'pending' | 'accepted', createdAt, acceptedAt }
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  endAt,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestore } from '../Firebase'
import { normalizeUsername } from './account'
import { requestPush } from './pushApi'

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

export const SEARCH_MIN = 2
export const SEARCH_RESULTS = 8

// Usernames starting with `prefix` (case-insensitive), as [{ uid, username }]: a handful, to pick one from.
// The ids of usernames/ are the lowercase usernames, so a range on the id is a prefix search.
export async function searchPlayers(prefix, max = SEARCH_RESULTS) {
  const key = normalizeUsername(prefix).toLowerCase()
  if (key.length < SEARCH_MIN) return []
  const snapshot = await getDocs(
    query(collection(firestore, 'usernames'), orderBy(documentId()), startAt(key), endAt(`${key}`), limit(max))
  )
  return snapshot.docs.map((item) => ({ uid: item.data().uid, username: item.data().username }))
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
  return requestFriendship(me, player, known)
}

// Same, for a player met in a multiplayer room (the room only gives their uid: the username comes from their account).
export async function sendFriendRequestTo(me, uid, known = []) {
  const player = await fetchPlayer(uid)
  if (!player) throw new FriendError('not_found')
  return requestFriendship(me, player, known)
}

async function requestFriendship(me, player, known) {
  if (player.uid === me.uid) throw new FriendError('self')
  const existing = known.find((item) => item.uid === player.uid)
  if (existing) {
    // They already asked: accepting is what the player means.
    if (existing.status === 'incoming') return acceptFriendRequest(existing.id).then(() => player)
    throw new FriendError(existing.status === 'friend' ? 'already_friends' : 'already_sent')
  }
  await setDoc(doc(firestore, 'friendships', friendshipId(me.uid, player.uid)), {
    users: [me.uid, player.uid],
    usernames: { [me.uid]: me.username, [player.uid]: player.username },
    requester: me.uid,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  notifyFriend(friendshipId(me.uid, player.uid))
  return player
}

export async function acceptFriendRequest(id) {
  await updateDoc(doc(firestore, 'friendships', id), { status: 'accepted', acceptedAt: serverTimestamp() })
  notifyFriend(id)
}

// Push notification to the other player (api/friend-push), not awaited: the request or the answer is already saved.
function notifyFriend(id) {
  requestPush('friend-push', { friendshipId: id })
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

const RETRY_DELAYS = [1000, 3000, 8000]

// A listener that fails is dead for good: on iOS it often fails once at start (network or token not ready yet),
// so it is started again a few times instead of showing an empty list until the next visit.
export function watchFriendships(uid, callback) {
  let unsubscribe = null
  let timer = null
  let stopped = false
  let failures = 0

  const start = () => {
    unsubscribe = onSnapshot(
      query(collection(firestore, 'friendships'), where('users', 'array-contains', uid)),
      (snapshot) => {
        failures = 0
        callback(splitFriendships(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), uid))
      },
      (error) => {
        console.warn('[friends]', error?.code, error)
        if (stopped) return
        if (failures < RETRY_DELAYS.length) {
          timer = setTimeout(start, RETRY_DELAYS[failures++])
        } else {
          callback([])
        }
      }
    )
  }
  start()

  return () => {
    stopped = true
    clearTimeout(timer)
    unsubscribe?.()
  }
}

// One listener per account for the whole page, however many components show the friends (a leaderboard has a
// "+" button on every row): the first subscriber starts it, the last one stops it, and a late one gets the
// latest list at once.
const shared = new Map()

export function watchSharedFriendships(uid, callback) {
  let entry = shared.get(uid)
  if (!entry) {
    entry = { callbacks: new Set(), list: null, stop: null }
    shared.set(uid, entry)
    const current = entry
    entry.stop = watchFriendships(uid, (list) => {
      current.list = list
      current.callbacks.forEach((notify) => notify(list))
    })
  }
  entry.callbacks.add(callback)
  if (entry.list) callback(entry.list)
  return () => {
    entry.callbacks.delete(callback)
    if (entry.callbacks.size === 0) {
      entry.stop()
      if (shared.get(uid) === entry) shared.delete(uid)
    }
  }
}

const FRIEND_ERRORS = ['not_found', 'self', 'already_friends', 'already_sent']

// i18n key under `friends.errors`.
export function friendErrorKey(error) {
  if (error instanceof FriendError && FRIEND_ERRORS.includes(error.code)) return error.code
  console.warn('[friends]', error?.code, error)
  return error?.code === 'unavailable' ? 'network' : 'generic'
}

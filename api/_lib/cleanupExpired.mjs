// Daily cleanup of throwaway documents (api/cleanup-expired.mjs, Vercel Cron), in place of Firestore's TTL, which
// needs billing. Each target is a query on one top-level collection, so Firestore's automatic indexes are enough:
//   rooms         expiresAt passed, or created over LEGACY_ROOM_MS ago (rooms from before expiresAt);
//                 deleted with their subcollections (progress, gameResults, keys)
//   invites       created over INVITE_MAX_AGE_MS ago (the app drops them after 3 hours anyway)
//   _clockSync    server time probes (src/utils/serverTime.js) over CLOCK_MAX_AGE_MS old
//   invitePushes, invitePushLimits, friendPushes   server-only push bookkeeping (api/_lib/invitePush.mjs,
//                 friendPush.mjs), in milliseconds
import { Timestamp } from 'firebase-admin/firestore'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const LEGACY_ROOM_MS = 30 * DAY
export const INVITE_MAX_AGE_MS = DAY
export const CLOCK_MAX_AGE_MS = HOUR
export const PUSH_BOOKKEEPING_MAX_AGE_MS = DAY
// Documents read per query; a run goes through pages until nothing matches or MAX_PER_TARGET is reached.
const PAGE = 200
export const MAX_PER_TARGET = 2000

// Deletes the documents `query` returns, page by page. `remove` deletes one document (a room takes its subcollections).
async function drain(query, remove) {
  let deleted = 0
  while (deleted < MAX_PER_TARGET) {
    const snapshot = await query.limit(Math.min(PAGE, MAX_PER_TARGET - deleted)).get()
    if (snapshot.empty) break
    await Promise.all(snapshot.docs.map((item) => remove(item.ref)))
    deleted += snapshot.size
  }
  return deleted
}

// `db`: firebase-admin Firestore. Returns the number of documents deleted per collection.
export async function cleanupExpired({ db, now = Date.now() }) {
  const at = (ms) => Timestamp.fromMillis(ms)
  const deleteDoc = (ref) => ref.delete()
  const deleteRoom = (ref) => db.recursiveDelete(ref)
  const rooms = db.collection('rooms')

  const expiredRooms = await drain(rooms.where('expiresAt', '<', at(now)), deleteRoom)
  const legacyRooms = await drain(rooms.where('createdAt', '<', at(now - LEGACY_ROOM_MS)), deleteRoom)

  return {
    rooms: expiredRooms + legacyRooms,
    invites: await drain(db.collection('invites').where('createdAt', '<', at(now - INVITE_MAX_AGE_MS)), deleteDoc),
    _clockSync: await drain(db.collection('_clockSync').where('t', '<', at(now - CLOCK_MAX_AGE_MS)), deleteDoc),
    invitePushes: await drain(
      db.collection('invitePushes').where('at', '<', now - PUSH_BOOKKEEPING_MAX_AGE_MS),
      deleteDoc
    ),
    friendPushes: await drain(
      db.collection('friendPushes').where('at', '<', now - PUSH_BOOKKEEPING_MAX_AGE_MS),
      deleteDoc
    ),
    invitePushLimits: await drain(
      db.collection('invitePushLimits').where('start', '<', now - PUSH_BOOKKEEPING_MAX_AGE_MS),
      deleteDoc
    ),
  }
}

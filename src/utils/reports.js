// Reports of a leaderboard entry, for the website and the app. Create only (see firestore.rules):
//   reports/{reporter}_{collection}_{scoreId}
//     { reporter, targetCollection, targetId, targetName?, reason, note?, createdAt }
// A signed-in player reports as their uid, a visitor as 'v-' + the id kept on their device, so each can report an
// entry once (a second report has the same id, which the rules refuse as an update).
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { firestore } from '../Firebase'

export const REPORT_REASONS = ['offensive_name', 'cheating', 'other']
export const REPORT_NOTE_MAX = 200
// The leaderboard collections whose entries can be reported.
export const REPORTABLE = ['scores', 'ascension_scores', 'daily_scores']

// The id kept on the device for multiplayer (same key as getOrCreatePlayerId in multiplayerRoom.js and the app's
// getPlayerId), made here when it doesn't exist yet: crypto.randomUUID isn't in React Native.
function deviceId() {
  try {
    let id = globalThis.localStorage?.getItem('mp_player_id')
    if (!id) {
      id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
      globalThis.localStorage?.setItem('mp_player_id', id)
    }
    return id
  } catch {
    return Math.random().toString(36).slice(2, 14).padEnd(12, '0')
  }
}

export const reporterId = (uid) => uid || `v-${deviceId()}`

export const reportDocId = (reporter, collection, id) => `${reporter}_${collection}_${id}`

// Reports entry `id` of `collection`. Resolves { status: 'sent' }, or { status: 'already' } when this player had
// reported it (the rules answer permission-denied, which an entry that no longer exists gets too: both end the same).
export async function reportEntry({ collection, id, name, reason, note, uid }) {
  const reporter = reporterId(uid)
  const text = note?.trim().slice(0, REPORT_NOTE_MAX)
  const data = {
    reporter,
    targetCollection: collection,
    targetId: id,
    reason,
    ...(name && { targetName: String(name).slice(0, 60) }),
    ...(text && { note: text }),
    createdAt: serverTimestamp(),
  }
  try {
    await setDoc(doc(firestore, 'reports', reportDocId(reporter, collection, id)), data)
  } catch (error) {
    if (error?.code === 'permission-denied') return { status: 'already' }
    throw error
  }
  return { status: 'sent' }
}

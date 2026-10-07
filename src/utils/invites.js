// Invitations to a multiplayer room, sent to a friend from inside the app.
// invites/{room}_{to}: { from, fromUsername, to, room, gameId, mode, createdAt }
// One invite per friend and room: inviting again only refreshes it. The guest deletes it when they join or dismiss it.
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { firestore } from '../Firebase'

// Past this, the room has most likely been played: the invite is dropped.
const INVITE_TTL_MS = 3 * 60 * 60 * 1000

export const inviteId = (room, to) => `${room}_${to}`

// `me` is the signed-in account ({ uid, username }), `room` { id, mode, game: { id } }.
export function sendRoomInvite(me, friendUid, room) {
  return setDoc(doc(firestore, 'invites', inviteId(room.id, friendUid)), {
    from: me.uid,
    fromUsername: me.username,
    to: friendUid,
    room: room.id,
    gameId: room.game.id,
    mode: room.mode,
    createdAt: serverTimestamp(),
  })
}

export function dismissInvite(id) {
  return deleteDoc(doc(firestore, 'invites', id)).catch((error) => console.warn('[invites]', error?.code, error))
}

// Invites received by `uid`, newest first: [{ id, from, fromUsername, room, gameId, mode, at }].
export function watchInvites(uid, callback) {
  return onSnapshot(
    query(collection(firestore, 'invites'), where('to', '==', uid)),
    (snapshot) => {
      const now = Date.now()
      const invites = []
      snapshot.docs.forEach((item) => {
        const data = item.data()
        // Pending server timestamp (just written): counts as now.
        const at = data.createdAt?.toMillis?.() ?? now
        if (now - at > INVITE_TTL_MS) dismissInvite(item.id)
        else invites.push({ id: item.id, from: data.from, fromUsername: data.fromUsername, room: data.room, gameId: data.gameId, mode: data.mode, at })
      })
      callback(invites.sort((a, b) => b.at - a.at))
    },
    (error) => {
      console.warn('[invites]', error?.code, error)
      callback([])
    }
  )
}

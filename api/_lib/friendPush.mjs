// Push notifications for friend requests (src/utils/friends.js), to every device of the other player (api/_lib/push.mjs):
//   the request was just sent       → to the player asked ("X wants to be your friend")
//   the request was just accepted   → to the player who asked ("X accepted your friend request")
// The player who acted calls POST /api/friend-push once the friendship document is written; what to send is read from
// that document, so nobody can push anything else. friendPushes/{friendshipId}_{kind} = { at }: last push of that
// kind, server only, so cancelling and asking again can't spam the same player.
import { callerUid, countSenderPush, pushToAccount, reply } from './push.mjs'

const BODY = {
  request: {
    fr: '{{username}} veut être ton ami',
    en: '{{username}} sent you a friend request',
    ru: '{{username}} хочет добавить тебя в друзья',
    es: '{{username}} quiere ser tu amigo',
    pt: '{{username}} quer ser seu amigo',
    de: '{{username}} möchte mit dir befreundet sein',
    it: '{{username}} vuole essere tuo amico',
    uk: '{{username}} хоче додати тебе в друзі',
  },
  accepted: {
    fr: '{{username}} a accepté ta demande d’ami',
    en: '{{username}} accepted your friend request',
    ru: 'Теперь вы с {{username}} друзья',
    es: '{{username}} ha aceptado tu solicitud de amistad',
    pt: '{{username}} aceitou seu pedido de amizade',
    de: '{{username}} hat deine Freundschaftsanfrage angenommen',
    it: '{{username}} ha accettato la tua richiesta di amicizia',
    uk: 'Тепер ви з {{username}} друзі',
  },
}

// A second push of the same kind for the same pair waits this long.
export const FRIEND_RESEND_DELAY_MS = 24 * 60 * 60 * 1000

export function friendMessage(kind, lang, username) {
  const bodies = BODY[kind]
  return (bodies[lang] ?? bodies.en).replace('{{username}}', username)
}

// `db` and `auth`: firebase-admin Firestore and Auth; `webPush`: see pushToAccount. Returns { status, body } for the HTTP response.
export async function sendFriendPush({ db, auth, idToken, friendshipId, fetchImpl = fetch, now = Date.now(), accessToken, webPush = null }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  if (typeof friendshipId !== 'string' || !friendshipId || friendshipId.includes('/')) return reply(400, { error: 'bad_request' })
  const uid = await callerUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthenticated' })

  const friendshipRef = db.doc(`friendships/${friendshipId}`)
  const limitRef = db.doc(`invitePushLimits/${uid}`)
  let push
  try {
    push = await db.runTransaction(async (transaction) => {
      const [snapshot, limit] = await Promise.all([transaction.get(friendshipRef), transaction.get(limitRef)])
      if (!snapshot.exists) throw reply(404, { error: 'not_found' })
      const friendship = snapshot.data()
      if (!friendship.users?.includes(uid)) throw reply(403, { error: 'forbidden' })
      const other = friendship.users.find((user) => user !== uid)
      let kind, to
      if (friendship.status === 'pending' && friendship.requester === uid) [kind, to] = ['request', other]
      else if (friendship.status === 'accepted' && friendship.requester !== uid) [kind, to] = ['accepted', friendship.requester]
      else throw reply(409, { error: 'nothing_to_notify' })

      const pushRef = db.doc(`friendPushes/${friendshipId}_${kind}`)
      const lastPush = await transaction.get(pushRef)
      const pushedAt = lastPush.exists ? lastPush.data().at : null
      if (pushedAt != null && now - pushedAt < FRIEND_RESEND_DELAY_MS) throw reply(429, { error: 'too_soon' })
      countSenderPush(transaction, limitRef, limit, now)
      transaction.set(pushRef, { at: now })
      return { kind, to, username: friendship.usernames?.[uid] ?? '?' }
    })
  } catch (error) {
    if (error?.status) return error
    throw error
  }

  return pushToAccount({
    db,
    uid: push.to,
    message: (lang) => ({
      body: friendMessage(push.kind, lang, push.username),
      data: { type: push.kind === 'request' ? 'friend_request' : 'friend_accepted', uid },
    }),
    channelId: 'friends',
    fetchImpl,
    accessToken,
    webPush,
  })
}

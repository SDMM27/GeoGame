// Push notification for a room invite (see src/utils/invites.js), sent through Expo's push service.
// The inviter's app calls POST /api/invite-push once the invite is written; only the invite's sender may trigger it.
// Devices: users/{uid}/pushTokens/{expoToken} = { token, lang, platform, updatedAt } (mobile/src/notifications/push.ts).
// invitePushes/{inviteId} = { at }: last push per invite, server only (no client access in firestore.rules), since
// inviting again rewrites the invite itself. invitePushLimits/{uid}: pushes per sender, also server only.
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const LOCALES = {
  fr: require('../../src/i18n/locales/fr.json'),
  en: require('../../src/i18n/locales/en.json'),
  ru: require('../../src/i18n/locales/ru.json'),
}

const BODY = {
  fr: '{{username}} t’invite à jouer à {{game}}',
  en: '{{username}} invites you to play {{game}}',
  ru: '{{username}} приглашает тебя сыграть в {{game}}',
}

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
// A second push for the same invite (invited again) waits this long.
export const RESEND_DELAY_MS = 60 * 1000
// Pushes one account can send per hour, whoever they invite (rooms are free to create, so the per-invite delay
// alone doesn't stop spamming a friend). Counted in invitePushLimits/{uid} = { start, count }, server only.
export const SENDER_PUSH_LIMIT = 20
export const SENDER_WINDOW_MS = 60 * 60 * 1000
// Same lifetime as the app gives an invite.
const INVITE_TTL_MS = 3 * 60 * 60 * 1000

export function inviteMessage(lang, username, gameId) {
  const locale = LOCALES[lang] ? lang : 'en'
  const game = LOCALES[locale].games?.[gameId]?.title ?? gameId
  return BODY[locale].replace('{{username}}', username).replace('{{game}}', game)
}

const reply = (status, body) => ({ status, body })

// `db` and `auth`: firebase-admin Firestore and Auth. Returns { status, body } for the HTTP response.
export async function sendInvitePush({ db, auth, idToken, inviteId, fetchImpl = fetch, now = Date.now(), accessToken }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  if (typeof inviteId !== 'string' || !inviteId || inviteId.includes('/')) return reply(400, { error: 'bad_request' })

  let uid
  try {
    uid = (await auth.verifyIdToken(idToken)).uid
  } catch {
    return reply(401, { error: 'unauthenticated' })
  }

  const inviteRef = db.doc(`invites/${inviteId}`)
  const pushRef = db.doc(`invitePushes/${inviteId}`)
  const limitRef = db.doc(`invitePushLimits/${uid}`)
  // Claims the push in a transaction, so a double tap or a re-invite can't spam the friend.
  let invite
  try {
    invite = await db.runTransaction(async (transaction) => {
      const [snapshot, lastPush, limit] = await Promise.all([
        transaction.get(inviteRef),
        transaction.get(pushRef),
        transaction.get(limitRef),
      ])
      if (!snapshot.exists) throw reply(404, { error: 'not_found' })
      const data = snapshot.data()
      if (data.from !== uid) throw reply(403, { error: 'forbidden' })
      const createdAt = data.createdAt?.toMillis?.() ?? now
      if (now - createdAt > INVITE_TTL_MS) throw reply(410, { error: 'expired' })
      const pushedAt = lastPush.exists ? lastPush.data().at : null
      if (pushedAt != null && now - pushedAt < RESEND_DELAY_MS) throw reply(429, { error: 'too_soon' })
      const window = limit.exists ? limit.data() : null
      const inWindow = window != null && now - window.start >= 0 && now - window.start < SENDER_WINDOW_MS
      if (inWindow && window.count >= SENDER_PUSH_LIMIT) throw reply(429, { error: 'rate_limited' })
      transaction.set(limitRef, inWindow ? { start: window.start, count: window.count + 1 } : { start: now, count: 1 })
      transaction.set(pushRef, { at: now })
      return data
    })
  } catch (error) {
    if (error?.status) return error
    throw error
  }

  const devices = await db.collection(`users/${invite.to}/pushTokens`).get()
  if (devices.empty) return reply(200, { sent: 0 })

  const messages = devices.docs.map((device) => ({
    to: device.data().token,
    title: 'GeoGame',
    body: inviteMessage(device.data().lang, invite.fromUsername, invite.gameId),
    data: { type: 'invite', room: invite.room, inviteId },
    sound: 'default',
    priority: 'high',
    channelId: 'invites',
  }))

  const response = await fetchImpl(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  })
  if (!response.ok) return reply(502, { error: 'push_failed' })

  // Tickets come back in the order of the messages: forget the devices the app was removed from.
  const tickets = (await response.json())?.data ?? []
  const gone = devices.docs.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered')
  await Promise.all(gone.map((device) => device.ref.delete()))

  return reply(200, { sent: tickets.filter((ticket) => ticket?.status === 'ok').length })
}

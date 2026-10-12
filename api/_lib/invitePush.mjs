// Push notification for a room invite (see src/utils/invites.js), to every device of the invited friend (api/_lib/push.mjs).
// The inviter's app calls POST /api/invite-push once the invite is written; only the invite's sender may trigger it.
// invitePushes/{inviteId} = { at }: last push per invite, server only (no client access in firestore.rules), since
// inviting again rewrites the invite itself.
import { createRequire } from 'module'

import { callerUid, countSenderPush, pushToAccount, reply } from './push.mjs'

export { EXPO_PUSH_URL, SENDER_PUSH_LIMIT, SENDER_WINDOW_MS, isWebPushEndpoint } from './push.mjs'

const require = createRequire(import.meta.url)
const LOCALES = {
  fr: require('../../src/i18n/locales/fr.json'),
  en: require('../../src/i18n/locales/en.json'),
  ru: require('../../src/i18n/locales/ru.json'),
  es: require('../../src/i18n/locales/es.json'),
  pt: require('../../src/i18n/locales/pt.json'),
  de: require('../../src/i18n/locales/de.json'),
  it: require('../../src/i18n/locales/it.json'),
}

const BODY = {
  fr: '{{username}} t’invite à jouer à {{game}}',
  en: '{{username}} invites you to play {{game}}',
  ru: '{{username}} приглашает тебя сыграть в {{game}}',
  es: '{{username}} te invita a jugar a {{game}}',
  pt: '{{username}} convida você para jogar {{game}}',
  de: '{{username}} lädt dich zu {{game}} ein',
  it: '{{username}} ti invita a giocare a {{game}}',
}

// A second push for the same invite (invited again) waits this long.
export const RESEND_DELAY_MS = 60 * 1000
// Same lifetime as the app gives an invite.
const INVITE_TTL_MS = 3 * 60 * 60 * 1000

export function inviteMessage(lang, username, gameId) {
  const locale = LOCALES[lang] ? lang : 'en'
  const game = LOCALES[locale].games?.[gameId]?.title ?? gameId
  return BODY[locale].replace('{{username}}', username).replace('{{game}}', game)
}

// `db` and `auth`: firebase-admin Firestore and Auth; `webPush`: see pushToAccount. Returns { status, body } for the HTTP response.
export async function sendInvitePush({ db, auth, idToken, inviteId, fetchImpl = fetch, now = Date.now(), accessToken, webPush = null }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  if (typeof inviteId !== 'string' || !inviteId || inviteId.includes('/')) return reply(400, { error: 'bad_request' })
  const uid = await callerUid(auth, idToken)
  if (!uid) return reply(401, { error: 'unauthenticated' })

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
      countSenderPush(transaction, limitRef, limit, now)
      transaction.set(pushRef, { at: now })
      return data
    })
  } catch (error) {
    if (error?.status) return error
    throw error
  }

  return pushToAccount({
    db,
    uid: invite.to,
    message: (lang) => ({
      body: inviteMessage(lang, invite.fromUsername, invite.gameId),
      data: { type: 'invite', room: invite.room, inviteId },
    }),
    channelId: 'invites',
    fetchImpl,
    accessToken,
    webPush,
  })
}

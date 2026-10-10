// Push notification for a room invite (see src/utils/invites.js), sent through Expo's push service to the app and
// through Web Push to the web app installed on the home screen (iPhone: iOS 16.4+, no App Store needed).
// The inviter's app calls POST /api/invite-push once the invite is written; only the invite's sender may trigger it.
// Devices: users/{uid}/pushTokens/{expoToken} = { token, lang, platform, updatedAt } (mobile/src/notifications/push.ts),
// or users/{uid}/pushTokens/{hash} = { token: hash, lang, platform: 'web', subscription, updatedAt } (push.web.ts).
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

// Web Push only goes to the browsers' own push services, never to any URL a client stored.
const WEB_PUSH_HOSTS = [/^web\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/]

export function isWebPushEndpoint(endpoint) {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && WEB_PUSH_HOSTS.some((host) => host.test(url.hostname))
  } catch {
    return false
  }
}

export function inviteMessage(lang, username, gameId) {
  const locale = LOCALES[lang] ? lang : 'en'
  const game = LOCALES[locale].games?.[gameId]?.title ?? gameId
  return BODY[locale].replace('{{username}}', username).replace('{{game}}', game)
}

const reply = (status, body) => ({ status, body })

// `db` and `auth`: firebase-admin Firestore and Auth. Returns { status, body } for the HTTP response.
// `webPush`: the web-push module with its VAPID details set, or null when they aren't configured (web devices skipped).
export async function sendInvitePush({ db, auth, idToken, inviteId, fetchImpl = fetch, now = Date.now(), accessToken, webPush = null }) {
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

  const isWeb = (device) => device.data().platform === 'web'
  const [expoSent, webSent] = await Promise.all([
    sendExpo(devices.docs.filter((device) => !isWeb(device)), invite, inviteId, fetchImpl, accessToken),
    sendWeb(devices.docs.filter(isWeb), invite, inviteId, webPush),
  ])
  if (expoSent == null && webSent === 0) return reply(502, { error: 'push_failed' })
  return reply(200, { sent: (expoSent ?? 0) + webSent })
}

// Number of pushes Expo accepted, or null if its service failed.
async function sendExpo(devices, invite, inviteId, fetchImpl, accessToken) {
  if (!devices.length) return 0
  const messages = devices.map((device) => ({
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
  if (!response.ok) return null

  // Tickets come back in the order of the messages: forget the devices the app was removed from.
  const tickets = (await response.json())?.data ?? []
  const gone = devices.filter((_, index) => tickets[index]?.details?.error === 'DeviceNotRegistered')
  await Promise.all(gone.map((device) => device.ref.delete()))
  return tickets.filter((ticket) => ticket?.status === 'ok').length
}

// Number of Web Push notifications delivered; subscriptions the browser dropped (404/410) are forgotten.
async function sendWeb(devices, invite, inviteId, webPush) {
  if (!devices.length || !webPush) return 0
  const results = await Promise.all(
    devices.map(async (device) => {
      const { subscription, lang } = device.data()
      if (!isWebPushEndpoint(subscription?.endpoint)) return false
      const payload = JSON.stringify({
        title: 'GeoGame',
        body: inviteMessage(lang, invite.fromUsername, invite.gameId),
        data: { type: 'invite', room: invite.room, inviteId },
      })
      try {
        await webPush.sendNotification(subscription, payload, { TTL: 60 * 60, urgency: 'high' })
        return true
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await device.ref.delete()
        else console.warn('[invite-push] web push', error?.statusCode, error?.body)
        return false
      }
    })
  )
  return results.filter(Boolean).length
}

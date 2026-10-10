// Sends a push notification to every device of one account: through Expo's push service to the app (Android, iOS
// builds), and through Web Push to the web app added to the home screen (iPhone: iOS 16.4+, no App Store needed).
// Devices: users/{uid}/pushTokens/{expoToken} = { token, lang, platform, updatedAt } (mobile/src/notifications/push.ts),
// or users/{uid}/pushTokens/{hash} = { token: hash, lang, platform: 'web', subscription, updatedAt } (push.web.ts).
// invitePushLimits/{uid} = { start, count }: pushes one account triggered in the current window, whatever their kind
// (the name predates the other kinds). Server only, like every push bookkeeping collection (see firestore.rules).

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
// Pushes one account can trigger per hour, whoever they reach (rooms and friend requests are free to create, so the
// per-event delays alone don't stop spamming someone).
export const SENDER_PUSH_LIMIT = 20
export const SENDER_WINDOW_MS = 60 * 60 * 1000

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

export const reply = (status, body) => ({ status, body })

// Inside a transaction (after its reads): counts one push for `uid`, or throws a 429 reply past the limit.
export function countSenderPush(transaction, limitRef, limit, now) {
  const window = limit.exists ? limit.data() : null
  const inWindow = window != null && now - window.start >= 0 && now - window.start < SENDER_WINDOW_MS
  if (inWindow && window.count >= SENDER_PUSH_LIMIT) throw reply(429, { error: 'rate_limited' })
  transaction.set(limitRef, inWindow ? { start: window.start, count: window.count + 1 } : { start: now, count: 1 })
}

// `message(lang)`: { body, data } in the device's language. `webPush`: the web-push module with its VAPID details set,
// or null when they aren't configured (web devices skipped). Returns the { status, body } HTTP reply.
export async function pushToAccount({ db, uid, message, channelId, fetchImpl = fetch, accessToken, webPush = null }) {
  const devices = await db.collection(`users/${uid}/pushTokens`).get()
  if (devices.empty) return reply(200, { sent: 0 })

  const isWeb = (device) => device.data().platform === 'web'
  const [expoSent, webSent] = await Promise.all([
    sendExpo(devices.docs.filter((device) => !isWeb(device)), message, channelId, fetchImpl, accessToken),
    sendWeb(devices.docs.filter(isWeb), message, webPush),
  ])
  if (expoSent == null && webSent === 0) return reply(502, { error: 'push_failed' })
  return reply(200, { sent: (expoSent ?? 0) + webSent })
}

// Number of pushes Expo accepted, or null if its service failed.
async function sendExpo(devices, message, channelId, fetchImpl, accessToken) {
  if (!devices.length) return 0
  const messages = devices.map((device) => ({
    to: device.data().token,
    title: 'GeoGame',
    ...message(device.data().lang),
    sound: 'default',
    priority: 'high',
    channelId,
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
async function sendWeb(devices, message, webPush) {
  if (!devices.length || !webPush) return 0
  const results = await Promise.all(
    devices.map(async (device) => {
      const { subscription, lang } = device.data()
      if (!isWebPushEndpoint(subscription?.endpoint)) return false
      const payload = JSON.stringify({ title: 'GeoGame', ...message(lang) })
      try {
        await webPush.sendNotification(subscription, payload, { TTL: 60 * 60, urgency: 'high' })
        return true
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await device.ref.delete()
        else console.warn('[push] web push', error?.statusCode, error?.body)
        return false
      }
    })
  )
  return results.filter(Boolean).length
}

// Verified uid of the caller's Firebase ID token, or null.
export async function callerUid(auth, idToken) {
  if (!idToken) return null
  try {
    return (await auth.verifyIdToken(idToken)).uid
  } catch {
    return null
  }
}

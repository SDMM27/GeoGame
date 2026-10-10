// @vitest-environment node
// api/friend-push against the Auth and Firestore emulators (npm run test:emulator); Expo's push service is faked.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { FRIEND_RESEND_DELAY_MS, friendMessage, sendFriendPush } from '../../api/_lib/friendPush.mjs'
import { EXPO_PUSH_URL, SENDER_PUSH_LIMIT } from '../../api/_lib/push.mjs'

const PROJECT = 'geogame-sdmm'
const FRIENDSHIP = 'alice_bob'

let db
let auth
const tokens = {}

async function idTokenFor(uid) {
  const email = `${uid}@test.local`
  const password = `pw-${uid}-test`
  await auth.createUser({ uid, email, password }).catch(() => {})
  const response = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) }
  )
  return (await response.json()).idToken
}

const fakeExpo = () =>
  vi.fn(async (url, options) => ({
    ok: true,
    json: async () => ({ data: JSON.parse(options.body).map((message) => ({ status: 'ok', id: `ticket-${message.to}` })) }),
  }))

const fakeWebPush = () => ({ sendNotification: vi.fn(async () => ({ statusCode: 201 })) })

async function clearFirestore() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
}

const friendship = (data = {}) =>
  db.doc(`friendships/${FRIENDSHIP}`).set({
    users: ['alice', 'bob'],
    usernames: { alice: 'Alice', bob: 'Bob' },
    requester: 'alice',
    status: 'pending',
    createdAt: Timestamp.now(),
    ...data,
  })

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
  for (const uid of ['alice', 'bob', 'carol']) tokens[uid] = await idTokenFor(uid)
})

beforeEach(async () => {
  await clearFirestore()
  await db.doc('users/alice/pushTokens/ExponentPushToken[alice]').set({ token: 'ExponentPushToken[alice]', lang: 'en', platform: 'android' })
  await db.doc('users/bob/pushTokens/ExponentPushToken[bob]').set({ token: 'ExponentPushToken[bob]', lang: 'fr', platform: 'android' })
  await db.doc('users/bob/pushTokens/web1').set({
    token: 'web1',
    lang: 'fr',
    platform: 'web',
    subscription: { endpoint: 'https://web.push.apple.com/bob', keys: { p256dh: 'k', auth: 'a' } },
  })
})

const send = (uid, options = {}) => sendFriendPush({ db, auth, idToken: tokens[uid], friendshipId: FRIENDSHIP, ...options })

describe('sendFriendPush', () => {
  it('tells the player asked about a new request, on the app and the web app', async () => {
    await friendship()
    const fetchImpl = fakeExpo()
    const webPush = fakeWebPush()
    expect(await send('alice', { fetchImpl, webPush })).toEqual({ status: 200, body: { sent: 2 } })
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe(EXPO_PUSH_URL)
    expect(JSON.parse(options.body)).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[bob]',
        body: 'Alice veut être ton ami',
        data: { type: 'friend_request', uid: 'alice' },
        channelId: 'friends',
      }),
    ])
    expect(JSON.parse(webPush.sendNotification.mock.calls[0][1])).toEqual({
      title: 'GeoGame',
      body: 'Alice veut être ton ami',
      data: { type: 'friend_request', uid: 'alice' },
    })
  })

  it('tells the player who asked that the request was accepted', async () => {
    await friendship({ status: 'accepted', acceptedAt: Timestamp.now() })
    const fetchImpl = fakeExpo()
    expect(await send('bob', { fetchImpl })).toEqual({ status: 200, body: { sent: 1 } })
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual([
      expect.objectContaining({ to: 'ExponentPushToken[alice]', body: 'Bob accepted your friend request', data: { type: 'friend_accepted', uid: 'bob' } }),
    ])
  })

  it('only pushes what the friendship says the caller just did', async () => {
    await friendship()
    const fetchImpl = fakeExpo()
    // Bob didn't send the request, and hasn't accepted it
    expect(await send('bob', { fetchImpl })).toEqual({ status: 409, body: { error: 'nothing_to_notify' } })
    expect(await send('carol', { fetchImpl })).toEqual({ status: 403, body: { error: 'forbidden' } })
    await friendship({ status: 'accepted', acceptedAt: Timestamp.now() })
    // Alice asked: she can't send "accepted" to herself
    expect(await send('alice', { fetchImpl })).toEqual({ status: 409, body: { error: 'nothing_to_notify' } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('pushes a request once a day, even when cancelled and sent again', async () => {
    await friendship()
    const now = Date.now()
    const fetchImpl = fakeExpo()
    expect((await send('alice', { fetchImpl, now })).status).toBe(200)
    await db.doc(`friendships/${FRIENDSHIP}`).delete()
    await friendship()
    expect(await send('alice', { fetchImpl, now: now + 1000 })).toEqual({ status: 429, body: { error: 'too_soon' } })
    expect((await send('alice', { fetchImpl, now: now + FRIEND_RESEND_DELAY_MS + 1 })).status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('counts towards the hourly limit of the sender', async () => {
    await friendship()
    await db.doc('invitePushLimits/alice').set({ start: Date.now(), count: SENDER_PUSH_LIMIT })
    expect(await send('alice', { fetchImpl: fakeExpo() })).toEqual({ status: 429, body: { error: 'rate_limited' } })
  })

  it('refuses unknown or malformed friendships, and unsigned callers', async () => {
    expect((await send('alice', { fetchImpl: fakeExpo() })).status).toBe(404)
    expect((await sendFriendPush({ db, auth, idToken: tokens.alice, friendshipId: '../x' })).status).toBe(400)
    expect((await sendFriendPush({ db, auth, idToken: 'nope', friendshipId: FRIENDSHIP })).status).toBe(401)
  })
})

describe('friendMessage', () => {
  it('speaks the device language, English otherwise', () => {
    expect(friendMessage('request', 'ru', 'Alice')).toBe('Alice хочет добавить тебя в друзья')
    expect(friendMessage('accepted', 'de', 'Alice')).toBe('Alice accepted your friend request')
  })
})

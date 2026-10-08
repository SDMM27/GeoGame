// @vitest-environment node
// api/invite-push against the Auth and Firestore emulators (npm run test:emulator); Expo's push service is faked.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../api/invite-push.mjs'
import { EXPO_PUSH_URL, RESEND_DELAY_MS, SENDER_PUSH_LIMIT, SENDER_WINDOW_MS, inviteMessage, sendInvitePush } from '../../api/_lib/invitePush.mjs'

const PROJECT = 'geogame-sdmm'
const ROOM = 'ABC234'
const INVITE = `${ROOM}_bob`
const BOB_TOKENS = ['ExponentPushToken[bob-phone]', 'ExponentPushToken[bob-old]']

let db
let auth
const tokens = {}

// ID token of a test account of the Auth emulator.
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

// Fake Expo push service: first device ok, second one uninstalled.
function fakeExpo() {
  return vi.fn(async (url, options) => ({
    ok: true,
    json: async () => ({
      data: JSON.parse(options.body).map((message) =>
        message.to === BOB_TOKENS[1]
          ? { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }
          : { status: 'ok', id: `ticket-${message.to}` }
      ),
    }),
  }))
}

async function clearFirestore() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
}

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
  tokens.alice = await idTokenFor('alice')
  tokens.carol = await idTokenFor('carol')
})

beforeEach(async () => {
  await clearFirestore()
  await db.doc(`invites/${INVITE}`).set({
    from: 'alice',
    fromUsername: 'Alice',
    to: 'bob',
    room: ROOM,
    gameId: 'flags',
    mode: 'live',
    createdAt: Timestamp.now(),
  })
  await db.doc(`users/bob/pushTokens/${BOB_TOKENS[0]}`).set({ token: BOB_TOKENS[0], lang: 'fr', platform: 'android' })
  await db.doc(`users/bob/pushTokens/${BOB_TOKENS[1]}`).set({ token: BOB_TOKENS[1], lang: 'en', platform: 'ios' })
})

afterEach(() => vi.unstubAllGlobals())

const send = (options) => sendInvitePush({ db, auth, inviteId: INVITE, ...options })

describe('sendInvitePush', () => {
  it("sends the invite to each of the friend's devices, in their language", async () => {
    const fetchImpl = fakeExpo()
    const result = await send({ idToken: tokens.alice, fetchImpl })

    expect(result).toEqual({ status: 200, body: { sent: 1 } })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe(EXPO_PUSH_URL)
    const messages = JSON.parse(options.body)
    expect(messages).toHaveLength(2)
    const byToken = Object.fromEntries(messages.map((message) => [message.to, message]))
    expect(byToken[BOB_TOKENS[0]]).toMatchObject({
      title: 'GeoGame',
      body: 'Alice t’invite à jouer à Trouve le Drapeau',
      data: { type: 'invite', room: ROOM, inviteId: INVITE },
      channelId: 'invites',
    })
    expect(byToken[BOB_TOKENS[1]].body).toBe('Alice invites you to play Find the Flag')
  })

  it('forgets the devices Expo reports as uninstalled', async () => {
    await send({ idToken: tokens.alice, fetchImpl: fakeExpo() })
    const left = await db.collection('users/bob/pushTokens').get()
    expect(left.docs.map((doc) => doc.id)).toEqual([BOB_TOKENS[0]])
  })

  it('pushes once per minute and invite, even when invited again', async () => {
    const now = Date.now()
    const fetchImpl = fakeExpo()
    expect((await send({ idToken: tokens.alice, fetchImpl, now })).status).toBe(200)
    // Re-invite rewrites the invite document
    await db.doc(`invites/${INVITE}`).update({ createdAt: Timestamp.now() })
    expect((await send({ idToken: tokens.alice, fetchImpl, now: now + 1000 })).status).toBe(429)
    expect((await send({ idToken: tokens.alice, fetchImpl, now: now + RESEND_DELAY_MS + 1 })).status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('limits the pushes one sender can send per hour, across invites', async () => {
    const now = Date.now()
    const fetchImpl = fakeExpo()
    const invitation = (from, room) => ({ from, fromUsername: from, to: 'bob', room, gameId: 'flags', mode: 'live', createdAt: Timestamp.now() })
    for (let index = 0; index < SENDER_PUSH_LIMIT; index++) {
      await db.doc(`invites/R${index}_bob`).set(invitation('alice', `R${index}`))
      expect((await send({ idToken: tokens.alice, fetchImpl, now, inviteId: `R${index}_bob` })).status).toBe(200)
    }
    await db.doc('invites/EXTRA1_bob').set(invitation('alice', 'EXTRA1'))
    const refused = await send({ idToken: tokens.alice, fetchImpl, now: now + 1000, inviteId: 'EXTRA1_bob' })
    expect(refused).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(fetchImpl).toHaveBeenCalledTimes(SENDER_PUSH_LIMIT)
    expect((await db.doc('invitePushLimits/alice').get()).data().count).toBe(SENDER_PUSH_LIMIT)
    // Another sender is not affected
    await db.doc('invites/ZZZ234_bob').set(invitation('carol', 'ZZZ234'))
    expect((await send({ idToken: tokens.carol, fetchImpl, inviteId: 'ZZZ234_bob', now })).status).toBe(200)
    // The window passes
    const later = now + SENDER_WINDOW_MS + 1
    await db.doc('invites/EXTRA1_bob').update({ createdAt: Timestamp.fromMillis(later) })
    expect((await send({ idToken: tokens.alice, fetchImpl, now: later, inviteId: 'EXTRA1_bob' })).status).toBe(200)
    expect((await db.doc('invitePushLimits/alice').get()).data().count).toBe(1)
  })

  it('only lets the inviter trigger it', async () => {
    const fetchImpl = fakeExpo()
    expect(await send({ idToken: tokens.carol, fetchImpl })).toEqual({ status: 403, body: { error: 'forbidden' } })
    expect(await send({ idToken: 'not-a-token', fetchImpl })).toEqual({ status: 401, body: { error: 'unauthenticated' } })
    expect(await send({ idToken: undefined, fetchImpl })).toEqual({ status: 401, body: { error: 'unauthenticated' } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuses unknown, malformed or expired invites', async () => {
    const fetchImpl = fakeExpo()
    expect((await sendInvitePush({ db, auth, idToken: tokens.alice, inviteId: 'ZZZZZZ_bob', fetchImpl })).status).toBe(404)
    expect((await sendInvitePush({ db, auth, idToken: tokens.alice, inviteId: '../users/bob', fetchImpl })).status).toBe(400)
    expect((await send({ idToken: tokens.alice, fetchImpl, now: Date.now() + 4 * 60 * 60 * 1000 })).status).toBe(410)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does nothing when the friend has no device', async () => {
    const fetchImpl = fakeExpo()
    for (const token of BOB_TOKENS) await db.doc(`users/bob/pushTokens/${token}`).delete()
    expect(await send({ idToken: tokens.alice, fetchImpl })).toEqual({ status: 200, body: { sent: 0 } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports a failure of the push service', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    expect((await send({ idToken: tokens.alice, fetchImpl })).status).toBe(502)
  })
})

describe('inviteMessage', () => {
  it('falls back to English for other languages', () => {
    expect(inviteMessage('de', 'Alice', 'quiz')).toBe('Alice invites you to play Geo Quiz')
  })
})

describe('HTTP handler', () => {
  function call({ method = 'POST', headers = {}, body }) {
    const res = {
      statusCode: 0,
      headers: {},
      payload: undefined,
      setHeader(name, value) {
        this.headers[name] = value
      },
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.payload = payload
        return this
      },
      end() {
        return this
      },
    }
    return handler({ method, headers, body }, res).then(() => res)
  }

  it('answers the CORS preflight', async () => {
    const res = await call({ method: 'OPTIONS' })
    expect(res.statusCode).toBe(204)
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization')
  })

  it('sends the push from a POST with the bearer token', async () => {
    const expo = fakeExpo()
    vi.stubGlobal('fetch', expo)
    const res = await call({ headers: { authorization: `Bearer ${tokens.alice}` }, body: { inviteId: INVITE } })
    expect(res.statusCode).toBe(200)
    expect(res.payload).toEqual({ sent: 1 })
    expect(expo).toHaveBeenCalledOnce()
  })

  it('refuses other methods and missing tokens', async () => {
    expect((await call({ method: 'GET' })).statusCode).toBe(405)
    expect((await call({ body: JSON.stringify({ inviteId: INVITE }) })).statusCode).toBe(401)
  })
})

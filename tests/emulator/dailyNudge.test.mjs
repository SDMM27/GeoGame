// @vitest-environment node
// api/daily-nudge against the Auth and Firestore emulators (npm run test:emulator); Expo's push service is faked.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { NUDGE_GAMES, nudgeMessage, sendDailyNudge } from '../../api/_lib/dailyNudge.mjs'
import { EXPO_PUSH_URL, SENDER_PUSH_LIMIT } from '../../api/_lib/push.mjs'

const PROJECT = 'geogame-sdmm'
// 18:00 in Paris
const NOW = Date.parse('2026-10-10T16:00:00Z')
const TODAY = '2026-10-10'

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

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
  for (const uid of ['alice', 'bob', 'carol']) tokens[uid] = await idTokenFor(uid)
})

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
  // Alice and Bob are friends, Alice played today's Quiz, Bob has a phone and the web app.
  await db.doc('friendships/alice_bob').set({
    users: ['alice', 'bob'],
    usernames: { alice: 'Alice', bob: 'Bob' },
    requester: 'alice',
    status: 'accepted',
    createdAt: Timestamp.now(),
    acceptedAt: Timestamp.now(),
  })
  await db.doc(`users/alice/games/daily_QUIZ_${TODAY}`).set({ gameType: 'QUIZ', mode: 'daily', dailyKey: TODAY })
  await db.doc('users/bob/pushTokens/ExponentPushToken[bob]').set({ token: 'ExponentPushToken[bob]', lang: 'fr', platform: 'android' })
  await db.doc('users/bob/pushTokens/web1').set({
    token: 'web1',
    lang: 'en',
    platform: 'web',
    subscription: { endpoint: 'https://web.push.apple.com/bob', keys: { p256dh: 'k', auth: 'a' } },
  })
})

const send = (uid, options = {}) =>
  sendDailyNudge({ db, auth, idToken: tokens[uid], friendUid: 'bob', gameType: 'QUIZ', now: NOW, fetchImpl: fakeExpo(), ...options })

describe('sendDailyNudge', () => {
  it('tells the friend to come and beat the player, on the app and the web app', async () => {
    const fetchImpl = fakeExpo()
    const webPush = fakeWebPush()
    expect(await send('alice', { fetchImpl, webPush })).toEqual({ status: 200, body: { sent: 2 } })
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe(EXPO_PUSH_URL)
    expect(JSON.parse(options.body)).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[bob]',
        body: expect.stringContaining('Alice a fini Quiz Géo du jour. Bah alors, viens me battre'),
        data: { type: 'daily_nudge', uid: 'alice', gameType: 'QUIZ' },
        channelId: 'daily',
      }),
    ])
    expect(JSON.parse(webPush.sendNotification.mock.calls[0][1])).toMatchObject({
      title: 'GeoGame',
      body: expect.stringContaining('Alice just finished today’s'),
      data: { type: 'daily_nudge', uid: 'alice', gameType: 'QUIZ' },
    })
  })

  it('reports a friend with no device as not reached', async () => {
    await db.doc('users/bob/pushTokens/ExponentPushToken[bob]').delete()
    await db.doc('users/bob/pushTokens/web1').delete()
    expect(await send('alice')).toEqual({ status: 200, body: { sent: 0 } })
  })

  it('only nudges friends', async () => {
    const fetchImpl = fakeExpo()
    expect(await send('alice', { fetchImpl, friendUid: 'carol' })).toEqual({ status: 403, body: { error: 'not_friends' } })
    await db.doc('friendships/alice_carol').set({ users: ['alice', 'carol'], usernames: {}, requester: 'alice', status: 'pending' })
    expect(await send('alice', { fetchImpl, friendUid: 'carol' })).toEqual({ status: 403, body: { error: 'not_friends' } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('needs the sender to have played that daily challenge today', async () => {
    const fetchImpl = fakeExpo()
    // Carol is Bob's friend but played nothing
    await db.doc('friendships/bob_carol').set({
      users: ['bob', 'carol'],
      usernames: { bob: 'Bob', carol: 'Carol' },
      requester: 'bob',
      status: 'accepted',
    })
    expect(await send('carol', { fetchImpl })).toEqual({ status: 409, body: { error: 'not_played' } })
    // Alice played the Quiz, not the Border Guess, and yesterday's doesn't count
    expect(await send('alice', { fetchImpl, gameType: 'BORDER_GUESS' })).toEqual({ status: 409, body: { error: 'not_played' } })
    expect(await send('alice', { fetchImpl, now: NOW + 24 * 60 * 60 * 1000 })).toEqual({ status: 409, body: { error: 'not_played' } })
    // A game that isn't a daily one doesn't count either
    await db.doc(`users/alice/games/daily_QUIZ_${TODAY}`).set({ gameType: 'QUIZ', mode: 'standard' })
    expect(await send('alice', { fetchImpl })).toEqual({ status: 409, body: { error: 'not_played' } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('nudges a friend once per game per day', async () => {
    const fetchImpl = fakeExpo()
    expect((await send('alice', { fetchImpl })).status).toBe(200)
    expect(await send('alice', { fetchImpl, now: NOW + 1000 })).toEqual({ status: 429, body: { error: 'already_sent' } })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    // Another game the same day is another nudge
    await db.doc(`users/alice/games/daily_RANKING_${TODAY}`).set({ gameType: 'RANKING', mode: 'daily', dailyKey: TODAY })
    expect((await send('alice', { fetchImpl, gameType: 'RANKING' })).status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    // And the same game the next day, once played
    const tomorrow = NOW + 24 * 60 * 60 * 1000
    await db.doc('users/alice/games/daily_QUIZ_2026-10-11').set({ gameType: 'QUIZ', mode: 'daily', dailyKey: '2026-10-11' })
    expect((await send('alice', { fetchImpl, now: tomorrow })).status).toBe(200)
  })

  it('counts towards the hourly limit of the sender', async () => {
    await db.doc('invitePushLimits/alice').set({ start: NOW, count: SENDER_PUSH_LIMIT })
    const fetchImpl = fakeExpo()
    expect(await send('alice', { fetchImpl })).toEqual({ status: 429, body: { error: 'rate_limited' } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuses malformed requests and unsigned callers', async () => {
    expect((await send('alice', { gameType: 'FLAGS' })).status).toBe(400)
    expect((await send('alice', { gameType: '__proto__' })).status).toBe(400)
    expect((await send('alice', { gameType: undefined })).status).toBe(400)
    expect((await send('alice', { friendUid: '../x' })).status).toBe(400)
    expect((await send('alice', { friendUid: 'alice' })).status).toBe(400)
    expect((await send('alice', { friendUid: 42 })).status).toBe(400)
    expect((await send('alice', { idToken: 'nope' })).status).toBe(401)
    expect((await send('alice', { idToken: undefined })).status).toBe(401)
  })
})

describe('nudgeMessage', () => {
  it('speaks the device language, English otherwise, with the translated game', () => {
    expect(nudgeMessage('fr', 'Alice', 'QUIZ')).toContain('Alice a fini Quiz Géo du jour')
    expect(nudgeMessage('ja', 'Alice', 'QUIZ')).toContain('Alice just finished today’s')
    expect(nudgeMessage('de', 'Alice', 'BORDER_GUESS')).toContain('Alice hat')
  })

  it('names the Daily Challenge without repeating "of the day"', () => {
    expect(nudgeMessage('fr', 'Alice', 'DAILY_CHALLENGE')).toBe('Alice a terminé le Challenge du jour. Bah alors, viens me battre ! 😏')
    expect(nudgeMessage('en', 'Alice', 'DAILY_CHALLENGE')).toContain('finished the Daily Challenge')
  })

  it('has a title for every game with a daily challenge', () => {
    for (const [gameType, id] of Object.entries(NUDGE_GAMES)) {
      for (const lang of ['fr', 'en', 'ru', 'es', 'pt', 'de', 'it', 'uk']) {
        expect(nudgeMessage(lang, 'A', gameType), `${lang} ${gameType}`).not.toContain(gameType)
      }
      expect(id).toBe(gameType.toLowerCase())
    }
  })
})

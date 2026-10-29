// @vitest-environment node
// api/challenge-result against the Auth and Firestore emulators (npm run test:emulator); Expo's push service is faked.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendChallengeResult } from '../../api/_lib/challengeResult.mjs'
import { sendDailyNudge } from '../../api/_lib/dailyNudge.mjs'
import { SENDER_PUSH_LIMIT } from '../../api/_lib/push.mjs'

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

const pushed = (fetchImpl) => fetchImpl.mock.calls.flatMap(([, options]) => JSON.parse(options.body))

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
  for (const uid of ['alice', 'bob']) tokens[uid] = await idTokenFor(uid)
})

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
  // Alice and Bob are friends; Alice found today's Border Guess in 5 attempts and has a phone.
  await db.doc('friendships/alice_bob').set({
    users: ['alice', 'bob'],
    usernames: { alice: 'Alice', bob: 'Bob' },
    requester: 'alice',
    status: 'accepted',
  })
  await db.doc(`users/alice/games/daily_BORDER_GUESS_${TODAY}`).set({
    gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: TODAY, attempts: 5, solved: true, playedAt: Timestamp.fromMillis(NOW - 60000),
  })
  await db.doc('users/alice/pushTokens/ExponentPushToken[alice]').set({ token: 'ExponentPushToken[alice]', lang: 'fr', platform: 'android' })
})

const nudge = (options = {}) =>
  sendDailyNudge({ db, auth, idToken: tokens.alice, friendUid: 'bob', gameType: 'BORDER_GUESS', now: NOW, fetchImpl: fakeExpo(), ...options })

const settle = (options = {}) => sendChallengeResult({ db, auth, idToken: tokens.bob, now: NOW + 1000, fetchImpl: fakeExpo(), ...options })

const bobPlaysBorderGuess = (attempts, solved = true) =>
  db.doc(`users/bob/games/daily_BORDER_GUESS_${TODAY}`).set({
    gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: TODAY, attempts, solved, playedAt: Timestamp.fromMillis(NOW + 500),
  })

describe('sendChallengeResult', () => {
  it('keeps the challenger’s result on the nudge', async () => {
    expect((await nudge()).status).toBe(200)
    expect((await db.doc('dailyNudges/alice_bob_BORDER_GUESS').get()).data()).toMatchObject({
      from: 'alice', to: 'bob', gameType: 'BORDER_GUESS', mode: 'daily', resolved: false, challenger: { score: 5, solved: true, mode: 'daily' },
    })
  })

  it('tells the challenger the friend beat them, once', async () => {
    await nudge()
    await bobPlaysBorderGuess(3)
    const fetchImpl = fakeExpo()
    expect(await settle({ fetchImpl })).toEqual({ status: 200, body: { notified: 1 } })
    expect(pushed(fetchImpl)).toEqual([
      expect.objectContaining({
        to: 'ExponentPushToken[alice]',
        body: expect.stringContaining('Bob t’a battu sur BorderGuess'),
        data: { type: 'challenge_result', uid: 'bob', gameType: 'BORDER_GUESS', outcome: 'win' },
        channelId: 'daily',
      }),
    ])
    expect((await db.doc('dailyNudges/alice_bob_BORDER_GUESS').get()).data().resolved).toBe(true)

    // The next game doesn't tell it again
    const again = fakeExpo()
    expect(await settle({ fetchImpl: again, now: NOW + 5000 })).toEqual({ status: 200, body: { notified: 0 } })
    expect(again).not.toHaveBeenCalled()
  })

  it('tells a loss when the friend needed more attempts or didn’t find it', async () => {
    await nudge()
    await bobPlaysBorderGuess(6, false)
    const fetchImpl = fakeExpo()
    await settle({ fetchImpl })
    expect(pushed(fetchImpl)[0]).toMatchObject({ body: expect.stringContaining('Bob a perdu contre toi'), data: { outcome: 'lose' } })
  })

  it('waits while the friend hasn’t played the game', async () => {
    await nudge()
    const fetchImpl = fakeExpo()
    expect(await settle({ fetchImpl })).toEqual({ status: 200, body: { notified: 0 } })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect((await db.doc('dailyNudges/alice_bob_BORDER_GUESS').get()).data().resolved).toBe(false)
  })

  it('compares a regular game with one of the same mode and difficulty, on points', async () => {
    await db.doc('users/alice/games/flags1').set({
      gameType: 'FLAGS', mode: 'standard', difficulty: 'easy', score: 90, playedAt: Timestamp.fromMillis(NOW - 60000),
    })
    expect((await nudge({ gameType: 'FLAGS', mode: 'recent' })).status).toBe(200)
    // Bob's Ascension run doesn't answer it, his easy standard game does
    await db.doc('users/bob/games/flags2').set({ gameType: 'FLAGS', mode: 'ascension', score: 900, playedAt: Timestamp.fromMillis(NOW + 200) })
    const fetchImpl = fakeExpo()
    expect(await settle({ fetchImpl })).toEqual({ status: 200, body: { notified: 0 } })
    await db.doc('users/bob/games/flags3').set({
      gameType: 'FLAGS', mode: 'standard', difficulty: 'easy', score: 90, playedAt: Timestamp.fromMillis(NOW + 300),
    })
    expect(await settle({ fetchImpl })).toEqual({ status: 200, body: { notified: 1 } })
    expect(pushed(fetchImpl)[0]).toMatchObject({ body: expect.stringContaining('égalité'), data: { gameType: 'FLAGS', outcome: 'tie' } })
  })

  it('says nothing to a former friend', async () => {
    await nudge()
    await bobPlaysBorderGuess(3)
    await db.doc('friendships/alice_bob').delete()
    const fetchImpl = fakeExpo()
    expect(await settle({ fetchImpl })).toEqual({ status: 200, body: { notified: 0 } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('counts towards the hourly limit of the friend and retries after it', async () => {
    await nudge()
    await bobPlaysBorderGuess(3)
    await db.doc('invitePushLimits/bob').set({ start: NOW, count: SENDER_PUSH_LIMIT })
    const fetchImpl = fakeExpo()
    expect(await settle({ fetchImpl })).toEqual({ status: 200, body: { notified: 0 } })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await settle({ fetchImpl, now: NOW + 2 * 60 * 60 * 1000 })).toEqual({ status: 200, body: { notified: 1 } })
  })

  it('ignores nudges sent before results existed, and unsigned callers', async () => {
    await db.doc('dailyNudges/alice_bob_BORDER_GUESS').set({ from: 'alice', to: 'bob', day: TODAY, at: NOW })
    await bobPlaysBorderGuess(3)
    expect(await settle()).toEqual({ status: 200, body: { notified: 0 } })
    expect((await settle({ idToken: 'nope' })).status).toBe(401)
    expect((await settle({ idToken: undefined })).status).toBe(401)
  })
})

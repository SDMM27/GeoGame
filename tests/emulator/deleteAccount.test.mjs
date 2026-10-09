// @vitest-environment node
// api/delete-account and the deletion of inactive accounts, against the Auth and Firestore emulators (npm run test:emulator).
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import handler from '../../api/delete-account.mjs'
import {
  INACTIVE_ACCOUNT_MS,
  RECENT_SIGN_IN_MS,
  deleteAccount,
  deleteInactiveAccounts,
  lastActivity,
} from '../../api/_lib/deleteAccount.mjs'

const PROJECT = 'geogame-sdmm'

let db
let auth

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

async function clearFirestore() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
}

const exists = async (path) => (await db.doc(path).get()).exists
const accountExists = (uid) => auth.getUser(uid).then(() => true, () => false)

// Alice's data, and Bob's and Carol's, which must stay.
const ALICE = [
  'users/alice', 'users/alice/games/g1', 'users/alice/pushTokens/t1', 'usernames/alice',
  'scores/s1', 'daily_scores/d1', 'survival_scores/v1', 'ascension_scores/a1',
  'reports/bob_scores_s1', 'reports/alice_scores_s2',
  'friendships/alice_bob', 'invites/ROOM01_alice', 'invites/ROOM02_bob', 'invitePushLimits/alice',
]
const OTHERS = [
  'users/bob', 'usernames/bob', 'users/bob/games/g1', 'scores/s2', 'daily_scores/s1', 'reports/carol_daily_scores_s1',
  'reports/carol_scores_s2', 'friendships/bob_carol', 'invites/ROOM03_carol',
]

async function seed() {
  const docs = {
    'users/alice': { username: 'Alice', usernameKey: 'alice' },
    'users/alice/games/g1': { gameType: 'FLAGS', mode: 'standard' },
    'users/alice/pushTokens/t1': { token: 't1', lang: 'fr', platform: 'android' },
    'usernames/alice': { uid: 'alice', username: 'Alice' },
    'scores/s1': { uid: 'alice', name: 'Alice', score: 10 },
    'daily_scores/d1': { uid: 'alice', name: 'Alice' },
    'survival_scores/v1': { uid: 'alice', name: 'Alice' },
    'ascension_scores/a1': { uid: 'alice', name: 'Alice' },
    'reports/bob_scores_s1': { reporter: 'bob', targetCollection: 'scores', targetId: 's1', targetName: 'Alice' },
    'reports/alice_scores_s2': { reporter: 'alice', targetCollection: 'scores', targetId: 's2' },
    'friendships/alice_bob': { users: ['alice', 'bob'] },
    'invites/ROOM01_alice': { from: 'bob', to: 'alice' },
    'invites/ROOM02_bob': { from: 'alice', to: 'bob' },
    'invitePushLimits/alice': { start: 0, count: 1 },
    'users/bob': { username: 'Bob', usernameKey: 'bob' },
    'usernames/bob': { uid: 'bob', username: 'Bob' },
    'users/bob/games/g1': { gameType: 'FLAGS', mode: 'standard' },
    'scores/s2': { uid: 'bob', name: 'Bob', score: 12 },
    // Same id as Alice's solo entry, in another collection: its report stays.
    'daily_scores/s1': { name: 'Visiteur' },
    'reports/carol_daily_scores_s1': { reporter: 'carol', targetCollection: 'daily_scores', targetId: 's1' },
    'reports/carol_scores_s2': { reporter: 'carol', targetCollection: 'scores', targetId: 's2' },
    'friendships/bob_carol': { users: ['bob', 'carol'] },
    'invites/ROOM03_carol': { from: 'bob', to: 'carol' },
  }
  const batch = db.batch()
  for (const [path, data] of Object.entries(docs)) batch.set(db.doc(path), data)
  await batch.commit()
}

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
})

beforeEach(async () => {
  await clearFirestore()
  await seed()
})

describe('deleteAccount', () => {
  it('deletes the account and all its data, and nothing else', async () => {
    const idToken = await idTokenFor('alice')
    await idTokenFor('bob')

    expect(await deleteAccount({ db, auth, idToken })).toEqual({ status: 200, body: { deleted: true } })

    for (const path of ALICE) expect(await exists(path), path).toBe(false)
    for (const path of OTHERS) expect(await exists(path), path).toBe(true)
    expect(await accountExists('alice')).toBe(false)
    expect(await accountExists('bob')).toBe(true)
  })

  it('asks for a recent sign-in', async () => {
    const idToken = await idTokenFor('alice')

    const result = await deleteAccount({ db, auth, idToken, now: Date.now() + RECENT_SIGN_IN_MS + 60000 })

    expect(result).toEqual({ status: 403, body: { error: 'requires_recent_login' } })
    expect(await exists('users/alice')).toBe(true)
    expect(await accountExists('alice')).toBe(true)
  })

  it('refuses a missing or invalid token', async () => {
    expect((await deleteAccount({ db, auth })).status).toBe(401)
    expect((await deleteAccount({ db, auth, idToken: 'not-a-token' })).status).toBe(401)
    expect(await exists('users/alice')).toBe(true)
  })

  it('does not free a username that belongs to another account', async () => {
    await db.doc('usernames/alice').set({ uid: 'bob', username: 'Alice' })
    const idToken = await idTokenFor('alice')

    await deleteAccount({ db, auth, idToken })

    expect(await exists('usernames/alice')).toBe(true)
  })
})

describe('POST /api/delete-account', () => {
  function call(method, headers = {}) {
    return new Promise((resolve) => {
      const res = {
        statusCode: 200,
        setHeader() {},
        status(code) { this.statusCode = code; return this },
        json(body) { resolve({ statusCode: this.statusCode, body }) },
        end() { resolve({ statusCode: this.statusCode }) },
      }
      handler({ method, headers, body: {} }, res)
    })
  }

  it('deletes the signed-in account', async () => {
    const idToken = await idTokenFor('alice')

    expect((await call('POST', { authorization: `Bearer ${idToken}` })).statusCode).toBe(200)
    expect(await exists('users/alice')).toBe(false)
  })

  it('answers the preflight and refuses other methods', async () => {
    expect((await call('OPTIONS')).statusCode).toBe(204)
    expect((await call('GET')).statusCode).toBe(405)
    expect((await call('POST')).statusCode).toBe(401)
  })
})

describe('deleteInactiveAccounts', () => {
  it('takes the latest of sign-in, session refresh and creation', () => {
    const user = (metadata) => ({ metadata })
    expect(lastActivity(user({ creationTime: 'Mon, 01 Jan 2024 00:00:00 GMT', lastSignInTime: 'Mon, 01 Apr 2024 00:00:00 GMT', lastRefreshTime: '2025-06-01T00:00:00.000Z' })))
      .toBe(Date.parse('2025-06-01T00:00:00.000Z'))
    expect(lastActivity(user({ creationTime: 'Mon, 01 Jan 2024 00:00:00 GMT', lastSignInTime: null, lastRefreshTime: null })))
      .toBe(Date.parse('Mon, 01 Jan 2024 00:00:00 GMT'))
    expect(lastActivity(user({}))).toBe(0)
  })

  it('keeps recent accounts and deletes the ones unused for too long', async () => {
    await idTokenFor('alice')

    expect(await deleteInactiveAccounts({ db, auth })).toEqual({ inactiveAccounts: 0 })
    expect(await accountExists('alice')).toBe(true)

    const later = Date.now() + INACTIVE_ACCOUNT_MS + 24 * 60 * 60 * 1000
    const { inactiveAccounts } = await deleteInactiveAccounts({ db, auth, now: later, limit: 1000 })

    expect(inactiveAccounts).toBeGreaterThanOrEqual(1)
    expect(await accountExists('alice')).toBe(false)
    expect(await exists('users/alice')).toBe(false)
    expect(await exists('scores/s1')).toBe(false)
  })
})

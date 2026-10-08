// @vitest-environment node
// firestore.rules for room invites and push tokens, against the Firestore emulator (npm run test:emulator).
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const ROOM = 'ABC234'
const now = () => firebase.firestore.FieldValue.serverTimestamp()

let env

const invite = (overrides = {}) => ({
  from: 'alice',
  fromUsername: 'Alice',
  to: 'bob',
  room: ROOM,
  gameId: 'flags',
  mode: 'live',
  createdAt: now(),
  ...overrides,
})

const as = (uid) => env.authenticatedContext(uid).firestore()

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'geogame-sdmm',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await db.doc('users/alice').set({ username: 'Alice' })
    await db.doc('users/bob').set({ username: 'Bob' })
    await db.doc('users/carol').set({ username: 'Carol' })
    await db.doc(`rooms/${ROOM}`).set({ hostId: 'p1', status: 'lobby' })
    await db.doc('friendships/alice_bob').set({ users: ['alice', 'bob'], requester: 'alice', status: 'accepted' })
    await db.doc('friendships/alice_carol').set({ users: ['alice', 'carol'], requester: 'alice', status: 'pending' })
  })
})

describe('invites', () => {
  it('lets a player invite a friend into an existing room', async () => {
    await assertSucceeds(as('alice').doc(`invites/${ROOM}_bob`).set(invite()))
  })

  it('accepts an invite that expires (TTL), and refuses an expiry that is too far or in the past', async () => {
    const inHours = (hours) => firebase.firestore.Timestamp.fromMillis(Date.now() + hours * 3600000)
    await assertSucceeds(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ expiresAt: inHours(3) })))
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ expiresAt: inHours(100) })))
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ expiresAt: inHours(-1) })))
  })

  it('works whichever way the friendship id is sorted', async () => {
    await assertSucceeds(as('bob').doc(`invites/${ROOM}_alice`).set(invite({ from: 'bob', fromUsername: 'Bob', to: 'alice' })))
  })

  it('lets the inviter invite again (refreshes the invite)', async () => {
    await as('alice').doc(`invites/${ROOM}_bob`).set(invite())
    await assertSucceeds(as('alice').doc(`invites/${ROOM}_bob`).set(invite()))
  })

  it('refuses a request that was not accepted yet', async () => {
    await assertFails(as('alice').doc(`invites/${ROOM}_carol`).set(invite({ to: 'carol' })))
  })

  it('refuses someone who is not a friend', async () => {
    await assertFails(as('carol').doc(`invites/${ROOM}_bob`).set(invite({ from: 'carol', fromUsername: 'Carol' })))
  })

  it('refuses inviting in the name of someone else', async () => {
    await assertFails(as('carol').doc(`invites/${ROOM}_bob`).set(invite()))
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ fromUsername: 'Bob' })))
  })

  it('refuses a room that does not exist, or an id not matching the invite', async () => {
    await assertFails(as('alice').doc('invites/ZZZZZZ_bob').set(invite({ room: 'ZZZZZZ' })))
    await assertFails(as('alice').doc(`invites/${ROOM}_carol`).set(invite()))
  })

  it('refuses unknown fields, a bad mode, a client-chosen date or no account', async () => {
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ extra: 1 })))
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ mode: 'party' })))
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite({ createdAt: new Date(2000, 0, 1) })))
    await assertFails(env.unauthenticatedContext().firestore().doc(`invites/${ROOM}_bob`).set(invite()))
  })

  it('shows invites to the guest and the inviter only', async () => {
    await as('alice').doc(`invites/${ROOM}_bob`).set(invite())
    await assertSucceeds(as('bob').collection('invites').where('to', '==', 'bob').get())
    await assertSucceeds(as('alice').doc(`invites/${ROOM}_bob`).get())
    await assertFails(as('carol').doc(`invites/${ROOM}_bob`).get())
    await assertFails(as('carol').collection('invites').where('to', '==', 'bob').get())
  })

  it('lets the guest dismiss an invite, but not a stranger', async () => {
    await as('alice').doc(`invites/${ROOM}_bob`).set(invite())
    await assertFails(as('carol').doc(`invites/${ROOM}_bob`).delete())
    await assertSucceeds(as('bob').doc(`invites/${ROOM}_bob`).delete())
    // Opening a room clears its invite even when there is none.
    await assertSucceeds(as('bob').doc(`invites/${ROOM}_bob`).delete())
  })

  it('keeps the server-side push log out of reach', async () => {
    await assertFails(as('alice').doc(`invitePushes/${ROOM}_bob`).set({ at: 0 }))
    await assertFails(as('alice').doc(`invitePushes/${ROOM}_bob`).get())
  })
})

describe('push tokens', () => {
  const TOKEN = 'ExponentPushToken[abc123]'
  const device = (overrides = {}) => ({ token: TOKEN, lang: 'fr', platform: 'android', updatedAt: now(), ...overrides })

  it('lets a player register, read and remove their own devices', async () => {
    const ref = as('bob').doc(`users/bob/pushTokens/${TOKEN}`)
    await assertSucceeds(ref.set(device()))
    await assertSucceeds(ref.get())
    await assertSucceeds(ref.delete())
  })

  it("hides a player's devices from everyone else", async () => {
    await as('bob').doc(`users/bob/pushTokens/${TOKEN}`).set(device())
    await assertFails(as('alice').doc(`users/bob/pushTokens/${TOKEN}`).get())
    await assertFails(as('alice').collection('users/bob/pushTokens').get())
    await assertFails(env.unauthenticatedContext().firestore().doc(`users/bob/pushTokens/${TOKEN}`).get())
    await assertFails(as('alice').doc(`users/bob/pushTokens/${TOKEN}`).set(device()))
  })

  it('refuses a token not matching its id, or unknown fields', async () => {
    await assertFails(as('bob').doc('users/bob/pushTokens/other').set(device()))
    await assertFails(as('bob').doc(`users/bob/pushTokens/${TOKEN}`).set(device({ platform: 'web' })))
    await assertFails(as('bob').doc(`users/bob/pushTokens/${TOKEN}`).set(device({ extra: true })))
  })
})

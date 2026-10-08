// @vitest-environment node
// firestore.rules for friendships (and the fake-friendship attack on invites), against the Firestore emulator.
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const ROOM = 'ABC234'
const now = () => firebase.firestore.FieldValue.serverTimestamp()
const NAMES = { alice: 'Alice', alice2: 'Alice Two', bob: 'Bob', carol: 'Carol' }

let env
const as = (uid) => env.authenticatedContext(uid).firestore()

const friendship = (a, b, overrides = {}) => ({
  users: [a, b],
  usernames: { [a]: NAMES[a], [b]: NAMES[b] },
  requester: a,
  status: 'pending',
  createdAt: now(),
  ...overrides,
})
const id = (a, b) => [a, b].sort().join('_')
const invite = (overrides = {}) => ({
  from: 'alice', fromUsername: 'Alice', to: 'bob', room: ROOM, gameId: 'flags', mode: 'live', createdAt: now(), ...overrides,
})

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
    for (const [uid, username] of Object.entries(NAMES)) await db.doc(`users/${uid}`).set({ username })
    await db.doc(`rooms/${ROOM}`).set({ hostId: 'p1', status: 'lobby' })
  })
})

describe('friendship requests', () => {
  it('lets an account ask another one, whichever way the ids sort', async () => {
    await assertSucceeds(as('alice').doc(`friendships/${id('alice', 'bob')}`).set(friendship('alice', 'bob')))
    await assertSucceeds(as('carol').doc(`friendships/${id('carol', 'bob')}`).set(friendship('carol', 'bob')))
  })

  it('refuses an id that is not the two sorted uids', async () => {
    await assertFails(as('alice').doc('friendships/alice_alice2').set(friendship('alice', 'bob')))
    await assertFails(as('alice').doc('friendships/bob_alice').set(friendship('alice', 'bob')))
    await assertFails(as('alice').doc('friendships/anything').set(friendship('alice', 'bob')))
  })

  it('refuses a request made for someone else, or without being part of it', async () => {
    await assertFails(as('carol').doc(`friendships/${id('alice', 'bob')}`).set(friendship('alice', 'bob')))
    await assertFails(as('bob').doc(`friendships/${id('alice', 'bob')}`).set(friendship('alice', 'bob')))
    await assertFails(as('alice').doc(`friendships/${id('alice', 'bob')}`).set(friendship('alice', 'bob', { requester: 'bob' })))
  })

  it('refuses already accepted friendships, extra fields and a client date', async () => {
    const ref = as('alice').doc(`friendships/${id('alice', 'bob')}`)
    await assertFails(ref.set(friendship('alice', 'bob', { status: 'accepted' })))
    await assertFails(ref.set(friendship('alice', 'bob', { acceptedAt: now() })))
    await assertFails(ref.set(friendship('alice', 'bob', { extra: 1 })))
    await assertFails(ref.set(friendship('alice', 'bob', { createdAt: new Date(2000, 0, 1) })))
  })

  it('refuses a malformed users list', async () => {
    await assertFails(as('alice').doc('friendships/alice_alice').set(friendship('alice', 'alice')))
    await assertFails(as('alice').doc(`friendships/${id('alice', 'bob')}`).set(friendship('alice', 'bob', { users: ['alice', 'bob', 'carol'] })))
    await assertFails(as('alice').doc(`friendships/${id('alice', 'bob')}`).set(friendship('alice', 'bob', { users: ['alice'] })))
  })

  it("refuses usernames that are not the accounts' own", async () => {
    const ref = as('alice').doc(`friendships/${id('alice', 'bob')}`)
    await assertFails(ref.set(friendship('alice', 'bob', { usernames: { alice: 'Bob', bob: 'Bob' } })))
    await assertFails(ref.set(friendship('alice', 'bob', { usernames: { alice: 'Alice', bob: 'Mallory' } })))
    await assertFails(ref.set(friendship('alice', 'bob', { usernames: { alice: 'Alice' } })))
    await assertFails(ref.set(friendship('alice', 'bob', { usernames: { alice: 'Alice', bob: 'Bob', carol: 'Carol' } })))
  })
})

describe('accepting, declining, removing', () => {
  const path = `friendships/${id('alice', 'bob')}`
  beforeEach(() => as('alice').doc(path).set(friendship('alice', 'bob')))

  it('lets the recipient accept', async () => {
    await assertSucceeds(as('bob').doc(path).update({ status: 'accepted', acceptedAt: now() }))
  })

  it('refuses the requester accepting their own request, and strangers', async () => {
    await assertFails(as('alice').doc(path).update({ status: 'accepted', acceptedAt: now() }))
    await assertFails(as('carol').doc(path).update({ status: 'accepted', acceptedAt: now() }))
  })

  it('refuses any other change when accepting', async () => {
    const ref = as('bob').doc(path)
    await assertFails(ref.update({ status: 'accepted', acceptedAt: now(), requester: 'bob' }))
    await assertFails(ref.update({ status: 'accepted', acceptedAt: now(), users: ['bob', 'carol'] }))
    await assertFails(ref.update({ status: 'accepted', acceptedAt: now(), 'usernames.alice': 'Bob' }))
    await assertFails(ref.update({ status: 'accepted', acceptedAt: new Date(2000, 0, 1) }))
    await assertFails(ref.update({ status: 'accepted' }))
    await assertFails(ref.update({ status: 'accepted', acceptedAt: now(), extra: 1 }))
    await assertFails(ref.update({ status: 'pending' }))
  })

  it('refuses editing a friendship once accepted', async () => {
    await as('bob').doc(path).update({ status: 'accepted', acceptedAt: now() })
    await assertFails(as('bob').doc(path).update({ status: 'accepted', acceptedAt: now() }))
    await assertFails(as('alice').doc(path).update({ 'usernames.alice': 'Bob' }))
  })

  it('lets either account decline, cancel or remove, but not a stranger', async () => {
    await assertFails(as('carol').doc(path).delete())
    await assertSucceeds(as('bob').doc(path).delete())
    await as('alice').doc(path).set(friendship('alice', 'bob'))
    await assertSucceeds(as('alice').doc(path).delete())
    await as('alice').doc(path).set(friendship('alice', 'bob'))
    await as('bob').doc(path).update({ status: 'accepted', acceptedAt: now() })
    await assertSucceeds(as('bob').doc(path).delete())
  })

  it("lets an account list its own friendships (deleteAccount, friends panel) but not others'", async () => {
    await assertSucceeds(as('alice').collection('friendships').where('users', 'array-contains', 'alice').get())
    await assertFails(as('carol').collection('friendships').where('users', 'array-contains', 'alice').get())
    await assertFails(as('carol').doc(path).get())
  })
})

describe('fake friendship attack', () => {
  // alice wants to invite bob (no friendship with him) using a second account alice2.
  it('does not let alice invite bob through a friendship with her other account', async () => {
    await assertFails(as('alice').doc('friendships/alice_bob').set(friendship('alice', 'alice2')))
    // The honest id is allowed but only links alice and alice2.
    await assertSucceeds(as('alice').doc('friendships/alice_alice2').set(friendship('alice', 'alice2')))
    await as('alice2').doc('friendships/alice_alice2').update({ status: 'accepted', acceptedAt: now() })
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite()))
  })

  it('refuses an invite whose friendship does not list both accounts', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('friendships/alice_bob').set({ users: ['alice', 'alice2'], requester: 'alice', status: 'accepted' })
    })
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite()))
  })
})

describe('invites between real friends', () => {
  it('works after the full request and accept flow, then clears', async () => {
    await as('alice').doc('friendships/alice_bob').set(friendship('alice', 'bob'))
    await assertFails(as('alice').doc(`invites/${ROOM}_bob`).set(invite()))
    await as('bob').doc('friendships/alice_bob').update({ status: 'accepted', acceptedAt: now() })
    await assertSucceeds(as('alice').doc(`invites/${ROOM}_bob`).set(invite()))
    await assertSucceeds(as('bob').doc(`invites/${ROOM}_bob`).delete())
  })

  it('keeps the push counters out of reach', async () => {
    await assertFails(as('alice').doc('invitePushLimits/alice').set({ start: 0, count: 0 }))
    await assertFails(as('alice').doc('invitePushLimits/alice').get())
  })
})

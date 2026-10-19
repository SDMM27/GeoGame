// @vitest-environment node
// firestore.rules for presence/{uid} (src/utils/presence.js), against the Firestore emulator.
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const HOUR = 60 * 60 * 1000
const now = () => firebase.firestore.FieldValue.serverTimestamp()
const inMs = (ms) => firebase.firestore.Timestamp.fromMillis(Date.now() + ms)
const id = (a, b) => [a, b].sort().join('_')

let env
const as = (uid) => env.authenticatedContext(uid).firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

const presence = (overrides = {}) => ({ at: now(), room: null, game: null, expiresAt: inMs(24 * HOUR), ...overrides })

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
    for (const [uid, username] of Object.entries({ alice: 'Alice', bob: 'Bob', carol: 'Carol', dave: 'Dave' })) {
      await db.doc(`users/${uid}`).set({ username })
    }
    await db.doc('users/nameless').set({})
    await db.doc(`friendships/${id('alice', 'bob')}`).set({ users: ['alice', 'bob'], status: 'accepted' })
    await db.doc(`friendships/${id('alice', 'carol')}`).set({ users: ['alice', 'carol'], status: 'pending' })
    await db.doc('presence/alice').set({ at: new Date(), room: 'ABC234', game: 'FLAGS', expiresAt: inMs(24 * HOUR) })
  })
})

describe('writing presence', () => {
  it('lets a player write their own presence, in a room or not', async () => {
    await assertSucceeds(as('bob').doc('presence/bob').set(presence()))
    await assertSucceeds(as('bob').doc('presence/bob').set(presence({ room: 'XYZ789', game: 'SURVIVAL' })))
    await assertSucceeds(as('bob').doc('presence/bob').delete())
  })

  it("refuses someone else's presence, a visitor, or an account without a username", async () => {
    await assertFails(as('bob').doc('presence/alice').set(presence()))
    await assertFails(anonymous().doc('presence/bob').set(presence()))
    await assertFails(as('nameless').doc('presence/nameless').set(presence()))
    await assertFails(as('bob').doc('presence/alice').delete())
  })

  it('refuses a made-up time, room, game, expiry or extra field', async () => {
    const bob = as('bob').doc('presence/bob')
    await assertFails(bob.set(presence({ at: inMs(HOUR) })))
    await assertFails(bob.set(presence({ room: 'abc234' })))
    await assertFails(bob.set(presence({ room: 'ABC2345' })))
    await assertFails(bob.set(presence({ game: 'flags; drop' })))
    await assertFails(bob.set(presence({ expiresAt: inMs(10 * 24 * HOUR) })))
    await assertFails(bob.set(presence({ expiresAt: inMs(60 * 1000) })))
    await assertFails(bob.set(presence({ uid: 'bob' })))
    const { expiresAt: _, ...noExpiry } = presence()
    await assertFails(bob.set(noExpiry))
  })
})

describe('reading presence', () => {
  it('shows a presence to the player and their accepted friends', async () => {
    await assertSucceeds(as('alice').doc('presence/alice').get())
    await assertSucceeds(as('bob').doc('presence/alice').get())
  })

  it('hides it from a pending friend, a stranger and a visitor', async () => {
    await assertFails(as('carol').doc('presence/alice').get())
    await assertFails(as('dave').doc('presence/alice').get())
    await assertFails(anonymous().doc('presence/alice').get())
  })

  it('never lists the collection', async () => {
    await assertFails(as('bob').collection('presence').get())
    await assertFails(as('alice').collection('presence').where('room', '!=', null).get())
  })
})

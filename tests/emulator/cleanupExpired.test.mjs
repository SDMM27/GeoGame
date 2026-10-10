// @vitest-environment node
// api/cleanup-expired against the Firestore emulator (npm run test:emulator).
import { getApps, initializeApp } from 'firebase-admin/app'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import handler from '../../api/cleanup-expired.mjs'
import {
  CLOCK_MAX_AGE_MS,
  INVITE_MAX_AGE_MS,
  LEGACY_ROOM_MS,
  PUSH_BOOKKEEPING_MAX_AGE_MS,
  cleanupExpired,
} from '../../api/_lib/cleanupExpired.mjs'

const PROJECT = 'geogame-sdmm'
const NOW = Date.UTC(2026, 9, 8, 4, 0, 0)
const ts = (ms) => Timestamp.fromMillis(ms)

let db

async function clearFirestore() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
}

const exists = async (path) => (await db.doc(path).get()).exists

// A room with one document in each subcollection.
async function addRoom(code, fields) {
  await db.doc(`rooms/${code}`).set({ source: 'app2', ...fields })
  await db.doc(`rooms/${code}/progress/p1`).set({ found: 1 })
  await db.doc(`rooms/${code}/gameResults/0_p1`).set({ playerId: 'p1' })
  await db.doc(`rooms/${code}/keys/p1`).set({ key: 'secret' })
}

// Minimal stand-in for Vercel's req / res.
function call({ method = 'GET', authorization } = {}) {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  return handler({ method, headers: authorization ? { authorization } : {} }, res).then(() => res)
}

beforeAll(() => {
  db = getFirestore(getApps()[0] ?? initializeApp({ projectId: PROJECT }))
})

beforeEach(clearFirestore)

describe('cleanupExpired', () => {
  it('deletes expired rooms with their subcollections and keeps live ones', async () => {
    await addRoom('EXPIRD', { createdAt: ts(NOW - 8 * 86400000), expiresAt: ts(NOW - 1000) })
    await addRoom('LIVE22', { createdAt: ts(NOW - 1000), expiresAt: ts(NOW + 86400000) })

    const deleted = await cleanupExpired({ db, now: NOW })

    expect(deleted.rooms).toBe(1)
    for (const path of ['rooms/EXPIRD', 'rooms/EXPIRD/progress/p1', 'rooms/EXPIRD/gameResults/0_p1', 'rooms/EXPIRD/keys/p1']) {
      expect(await exists(path)).toBe(false)
    }
    for (const path of ['rooms/LIVE22', 'rooms/LIVE22/progress/p1', 'rooms/LIVE22/gameResults/0_p1', 'rooms/LIVE22/keys/p1']) {
      expect(await exists(path)).toBe(true)
    }
  })

  it('deletes rooms from before expiresAt once they are old enough', async () => {
    await addRoom('OLDAPP', { source: 'app', createdAt: ts(NOW - LEGACY_ROOM_MS - 1000) })
    await addRoom('NEWAPP', { source: 'app', createdAt: ts(NOW - LEGACY_ROOM_MS + 86400000) })

    await cleanupExpired({ db, now: NOW })

    expect(await exists('rooms/OLDAPP')).toBe(false)
    expect(await exists('rooms/OLDAPP/keys/p1')).toBe(false)
    expect(await exists('rooms/NEWAPP')).toBe(true)
  })

  it('deletes old invites, clock probes and push bookkeeping only', async () => {
    await db.doc('invites/OLD_bob').set({ createdAt: ts(NOW - INVITE_MAX_AGE_MS - 1000) })
    await db.doc('invites/NEW_bob').set({ createdAt: ts(NOW - 1000) })
    await db.doc('_clockSync/old').set({ t: ts(NOW - CLOCK_MAX_AGE_MS - 1000) })
    await db.doc('_clockSync/new').set({ t: ts(NOW - 1000) })
    await db.doc('invitePushes/OLD_bob').set({ at: NOW - PUSH_BOOKKEEPING_MAX_AGE_MS - 1000 })
    await db.doc('invitePushes/NEW_bob').set({ at: NOW - 1000 })
    await db.doc('friendPushes/alice_bob_request').set({ at: NOW - PUSH_BOOKKEEPING_MAX_AGE_MS - 1000 })
    await db.doc('friendPushes/alice_carol_request').set({ at: NOW - 1000 })
    await db.doc('invitePushLimits/alice').set({ start: NOW - PUSH_BOOKKEEPING_MAX_AGE_MS - 1000, count: 3 })
    await db.doc('invitePushLimits/carol').set({ start: NOW - 1000, count: 3 })

    const deleted = await cleanupExpired({ db, now: NOW })

    expect(deleted).toEqual({ rooms: 0, invites: 1, _clockSync: 1, invitePushes: 1, friendPushes: 1, invitePushLimits: 1 })
    expect(await exists('invites/NEW_bob')).toBe(true)
    expect(await exists('_clockSync/new')).toBe(true)
    expect(await exists('invitePushes/NEW_bob')).toBe(true)
    expect(await exists('friendPushes/alice_carol_request')).toBe(true)
    expect(await exists('invitePushLimits/carol')).toBe(true)
  })

  it('goes through several pages', async () => {
    const batch = db.batch()
    for (let i = 0; i < 450; i++) batch.set(db.doc(`_clockSync/p${i}`), { t: ts(NOW - CLOCK_MAX_AGE_MS - 1000) })
    await batch.commit()

    expect((await cleanupExpired({ db, now: NOW }))._clockSync).toBe(450)
    expect((await db.collection('_clockSync').get()).size).toBe(0)
  })
})

describe('GET /api/cleanup-expired', () => {
  const previous = process.env.CRON_SECRET

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  })

  it('refuses to run without a configured secret', async () => {
    delete process.env.CRON_SECRET
    expect((await call({ authorization: 'Bearer anything' })).statusCode).toBe(500)
  })

  it('refuses a missing or wrong secret', async () => {
    process.env.CRON_SECRET = 'cron-secret-for-tests'
    await db.doc('_clockSync/old').set({ t: ts(Date.now() - CLOCK_MAX_AGE_MS - 1000) })

    expect((await call()).statusCode).toBe(401)
    expect((await call({ authorization: 'Bearer wrong-secret-for-test' })).statusCode).toBe(401)
    expect(await exists('_clockSync/old')).toBe(true)
  })

  it('cleans up with the right secret', async () => {
    process.env.CRON_SECRET = 'cron-secret-for-tests'
    await db.doc('_clockSync/old').set({ t: ts(Date.now() - CLOCK_MAX_AGE_MS - 1000) })

    const res = await call({ authorization: 'Bearer cron-secret-for-tests' })

    expect(res.statusCode).toBe(200)
    expect(res.body.deleted._clockSync).toBe(1)
    expect(await exists('_clockSync/old')).toBe(false)
  })
})

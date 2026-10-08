// @vitest-environment node
// firestore.rules for reports (create only), against the Firestore emulator (npm run test:emulator).
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const now = () => firebase.firestore.FieldValue.serverTimestamp()

let env

const as = (uid) => env.authenticatedContext(uid).firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

const VISITOR = 'v-1a2b3c4d5e6f'

// A report as src/utils/reports.js writes it; the id follows from the reporter and the target.
const report = (overrides = {}) => {
  const data = { reporter: 'bob', targetCollection: 'scores', targetId: 'score1', reason: 'cheating', createdAt: now(), ...overrides }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}
const idOf = (data) => `${data.reporter}_${data.targetCollection}_${data.targetId}`
const send = (db, overrides) => {
  const data = report(overrides)
  return db.doc(`reports/${overrides?.id ?? idOf(data)}`).set(data)
}

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
    await db.doc('scores/score1').set({ name: 'Zoe', score: 10, difficulty: 'Facile', gameType: 'PLACEMENT' })
    await db.doc('ascension_scores/asc1').set({ name: 'Zoe' })
    await db.doc('daily_scores/daily1').set({ name: 'Zoe' })
  })
})

describe('reports', () => {
  it('lets a signed-in player report a score of each leaderboard', async () => {
    await assertSucceeds(send(as('bob')))
    await assertSucceeds(send(as('bob'), { targetCollection: 'ascension_scores', targetId: 'asc1', reason: 'offensive_name' }))
    await assertSucceeds(send(as('bob'), { targetCollection: 'daily_scores', targetId: 'daily1', reason: 'other' }))
  })

  it('lets a visitor report, under an id made of v- and the id kept on the device', async () => {
    await assertSucceeds(send(anonymous(), { reporter: VISITOR }))
  })

  it('accepts a target name and a short note, and nothing longer', async () => {
    await assertSucceeds(send(as('bob'), { targetName: 'Zoe', note: 'x'.repeat(200) }))
    await assertFails(send(as('carol'), { reporter: 'carol', note: 'x'.repeat(201) }))
    await assertFails(send(as('carol'), { reporter: 'carol', targetName: 'x'.repeat(61) }))
    await assertFails(send(as('carol'), { reporter: 'carol', note: 42 }))
  })

  it('accepts one report per reporter and entry: a second one is an update', async () => {
    await assertSucceeds(send(as('bob')))
    await assertFails(send(as('bob'), { reason: 'other' }))
    await assertSucceeds(send(as('carol'), { reporter: 'carol' }))
  })

  it('refuses a reporter that is not the signed-in account, or a visitor id without the v- prefix', async () => {
    await assertFails(send(as('bob'), { reporter: 'carol' }))
    await assertFails(send(as('bob'), { reporter: VISITOR }))
    await assertFails(send(anonymous(), { reporter: 'bob' }))
    await assertFails(send(anonymous(), { reporter: 'v-short' }))
  })

  it('refuses a document id that is not reporter_collection_target', async () => {
    await assertFails(send(as('bob'), { id: 'bob_scores_other' }))
    await assertFails(send(as('bob'), { id: 'anything' }))
  })

  it('refuses a reason outside the list, a missing field, an extra field, or another createdAt', async () => {
    await assertFails(send(as('bob'), { reason: 'because' }))
    await assertFails(send(as('bob'), { reason: undefined }))
    await assertFails(send(as('bob'), { extra: true }))
    await assertFails(send(as('bob'), { createdAt: new Date('2020-01-01') }))
    await assertFails(send(as('bob'), { createdAt: undefined }))
  })

  it('refuses another collection, an entry that does not exist, or an id that is not a string', async () => {
    await assertFails(send(as('bob'), { targetCollection: 'users', targetId: 'bob' }))
    await assertFails(send(as('bob'), { targetId: 'missing' }))
    await assertFails(send(as('bob'), { targetId: 42 }))
  })

  it('cannot be read, listed, edited or deleted from a client', async () => {
    await assertSucceeds(send(as('bob')))
    await assertFails(as('bob').doc('reports/bob_scores_score1').get())
    await assertFails(as('bob').collection('reports').get())
    await assertFails(as('bob').doc('reports/bob_scores_score1').update({ reason: 'other' }))
    await assertFails(as('bob').doc('reports/bob_scores_score1').delete())
    await assertFails(anonymous().doc('reports/bob_scores_score1').get())
  })
})

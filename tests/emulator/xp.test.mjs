// @vitest-environment node
// api/xp (missions and XP), against the Auth and Firestore emulators (npm run test:emulator).
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { handleXp } from '../../api/_lib/xp.mjs'
import { PIECES_PER_FLAG } from '../../src/utils/flagCollection.js'
import { GAMES_PER_DAY, GAME_XP, MISSIONS_PER_PERIOD, levelOf, missionsAt } from '../../src/utils/missions.js'

const PROJECT = 'geogame-sdmm'
// Monday 2026-10-19, 12:00 in Paris.
const NOW = Date.UTC(2026, 9, 19, 10)
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

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

async function clearFirestore() {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
}

const call = (uid, now = NOW) => handleXp({ db, auth, idToken: tokens[uid], now, Timestamp })
const xpOf = async (uid) => (await db.doc(`users/${uid}`).get()).data().xp

async function addGames(uid, games) {
  const batch = db.batch()
  for (const game of games) {
    const { playedAt = NOW - HOUR, ...rest } = game
    batch.set(db.collection(`users/${uid}/games`).doc(), { gameType: 'QUIZ', mode: 'infinite', ...rest, playedAt: Timestamp.fromMillis(playedAt) })
  }
  await batch.commit()
}

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
  for (const uid of ['alice', 'carol']) tokens[uid] = await idTokenFor(uid)
})

beforeEach(async () => {
  await clearFirestore()
  await db.doc('users/alice').set({ username: 'Alice' })
})

describe('requests', () => {
  it('refuses a missing token and a visitor without an account', async () => {
    expect((await handleXp({ db, auth, now: NOW, Timestamp })).status).toBe(401)
    expect(await call('carol')).toEqual({ status: 403, body: { error: 'no_account' } })
  })
})

describe('paying XP', () => {
  it('starts at level 1 with nothing to pay', async () => {
    const { status, body } = await call('alice')
    expect(status).toBe(200)
    expect(body).toMatchObject({ gained: 0, levelUp: false, xp: { total: 0, level: 1, day: '2026-10-19', week: '2026-W43' } })
  })

  it('pays the games of today up to the cap, and nothing more when asked again', async () => {
    await addGames('alice', Array.from({ length: GAMES_PER_DAY + 3 }, () => ({})))
    const first = await call('alice')
    expect(first.body.xp.dayGames).toBe(GAMES_PER_DAY)
    expect(first.body.gained).toBeGreaterThanOrEqual(GAMES_PER_DAY * GAME_XP)
    expect(await xpOf('alice')).toEqual(first.body.xp)
    const again = await call('alice')
    expect(again.body.gained).toBe(0)
    expect((await xpOf('alice')).total).toBe(first.body.xp.total)
  })

  it('pays the same as the shared rules, with the level they give', async () => {
    const games = [
      ...Array.from({ length: 3 }, () => ({ gameType: 'DAILY_CHALLENGE', mode: 'daily', solved: true, dailyKey: '2026-10-19' })),
      { gameType: 'FLAGS', mode: 'standard', found: 20, total: 20 },
      { gameType: 'PLACEMENT', mode: 'ascension', found: 20, total: 20 },
      { gameType: 'CAPITALS', mode: 'standard', found: 15, total: 15 },
      { gameType: 'SURVIVAL', mode: 'survival' },
    ]
    await addGames('alice', games)
    const { body } = await call('alice')
    const daily = missionsAt(games.map((game) => ({ ...game, playedAt: NOW - HOUR })), NOW).daily
    expect(body.xp.dayMissions).toEqual([...daily.map((entry) => entry.mission.id), 'bonus'])
    expect(body.xp.level).toBe(levelOf(body.xp.total).level)
    expect(body.levelUp).toBe(true)
  })

  it("ignores yesterday's games for today, and starts the next day afresh", async () => {
    await addGames('alice', [{ playedAt: NOW - DAY }, { playedAt: NOW - DAY }])
    expect((await call('alice')).body.xp.dayGames).toBe(0)
    await addGames('alice', [{}])
    const today = await call('alice')
    expect(today.body.xp.dayGames).toBe(1)
    const tomorrow = await call('alice', NOW + DAY)
    expect(tomorrow.body.xp).toMatchObject({ day: '2026-10-20', dayGames: 0, dayMissions: [], total: today.body.xp.total })
  })

  it('pays the fragments of the missions into the flag collection with the XP, once', async () => {
    const games = [
      ...Array.from({ length: 3 }, () => ({ gameType: 'DAILY_CHALLENGE', mode: 'daily', solved: true, dailyKey: '2026-10-19' })),
      { gameType: 'FLAGS', mode: 'standard', found: 20, total: 20 },
      { gameType: 'PLACEMENT', mode: 'ascension', found: 20, total: 20 },
      { gameType: 'CAPITALS', mode: 'standard', found: 15, total: 15 },
      { gameType: 'SURVIVAL', mode: 'survival' },
    ]
    await addGames('alice', games)
    const { body } = await call('alice')
    expect(body.fragments).toBeGreaterThanOrEqual(MISSIONS_PER_PERIOD + 1)
    const stored = (await db.doc('users/alice').get()).data().flags
    expect(stored).toEqual(body.flags)
    expect(stored.unlocked.length * PIECES_PER_FLAG + stored.pieces).toBe(body.fragments)
    expect(body.unlockedFlags).toEqual(stored.unlocked)

    const again = await call('alice')
    expect(again.body).toMatchObject({ gained: 0, fragments: 0, unlockedFlags: [], flags: stored })
    expect((await db.doc('users/alice').get()).data().flags).toEqual(stored)
  })

  it('leaves the flag collection alone when no mission was paid', async () => {
    await addGames('alice', [{}])
    const { body } = await call('alice')
    expect(body).toMatchObject({ fragments: 0, unlockedFlags: [], flags: { unlocked: [], current: null, pieces: 0 } })
    expect((await db.doc('users/alice').get()).data().flags).toBeUndefined()
  })

  it('keeps the rest of the users document', async () => {
    await db.doc('users/alice').update({ decoration: { frame: 'gold', color: 'sky' } })
    await addGames('alice', [{}])
    await call('alice')
    const data = (await db.doc('users/alice').get()).data()
    expect(data).toMatchObject({ username: 'Alice', decoration: { frame: 'gold', color: 'sky' } })
  })
})

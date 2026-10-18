// @vitest-environment node
// api/elo (solo answers and duels), against the Auth and Firestore emulators (npm run test:emulator).
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { Timestamp } from 'firebase-admin/firestore'

import { DUEL_ACCOUNT_DAILY_LIMIT, DUEL_PAIR_DAILY_LIMIT, MIN_DUEL_ACCOUNT_AGE_MS, handleElo } from '../../api/_lib/elo.mjs'
import { QUESTION_START, duelResult, seasonKeyAt, seasonReset, soloResult } from '../../src/utils/eloRating.js'

const PROJECT = 'geogame-sdmm'
const NOW = Date.UTC(2026, 9, 18, 12)
const SEASON = seasonKeyAt(new Date(NOW))

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

const data = async (path) => (await db.doc(path).get()).data()
const call = (uid, body, now = NOW) => handleElo({ db, auth, idToken: tokens[uid], body, now })
const solo = (uid, results, mode = 'FLAGS', now) => call(uid, { kind: 'solo', mode, results }, now)

beforeAll(async () => {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT })
  db = getFirestore(app)
  auth = getAuth(app)
  for (const uid of ['alice', 'bob', 'carol']) tokens[uid] = await idTokenFor(uid)
})

beforeEach(async () => {
  await clearFirestore()
  const batch = db.batch()
  for (const [uid, username] of [['alice', 'Alice'], ['bob', 'Bob']]) batch.set(db.doc(`users/${uid}`), { username })
  await batch.commit()
})

describe('requests', () => {
  it('refuses a missing token, a visitor without an account and malformed bodies', async () => {
    expect((await handleElo({ db, auth, body: { kind: 'solo' } })).status).toBe(401)
    expect(await solo('carol', [{ country: 'France', found: true, errors: 0 }])).toEqual({ status: 403, body: { error: 'no_account' } })
    expect((await call('alice', { kind: 'solo', mode: 'QUIZ', results: [] })).body).toEqual({ error: 'bad_mode' })
    for (const results of [[], [{ country: 'Atlantis', found: true, errors: 0 }], [{ country: 'France', found: 'yes', errors: 0 }],
      [{ country: 'France', found: true, errors: -1 }], Array(51).fill({ country: 'France', found: true, errors: 0 })]) {
      expect((await solo('alice', results)).body).toEqual({ error: 'bad_results' })
    }
    expect((await call('alice', { kind: 'duel', room: 'nope', gameIndex: 0 })).body).toEqual({ error: 'bad_room' })
    expect((await call('alice', { kind: 'other' })).body).toEqual({ error: 'bad_kind' })
  })
})

describe('solo', () => {
  it('gains against the country, which starts from its difficulty in the mode', async () => {
    const first = soloResult({ rating: 1000, question: QUESTION_START.Impossible, found: true, errors: 0, alreadyWon: false, rateQuestion: true })

    const { status, body } = await solo('alice', [{ country: 'Aruba', found: true, errors: 0 }])

    expect(status).toBe(200)
    expect(body).toEqual({ season: SEASON, mode: 'FLAGS', rating: 1000 + first.gain, gained: first.gain })
    expect(await data('elo/alice')).toMatchObject({
      uid: 'alice', name: 'Alice', season: SEASON, solo: { FLAGS: { rating: 1000 + first.gain, found: 1 } }, carry: {},
    })
    expect(await data('eloQuestions/FLAGS_Aruba')).toEqual({ mode: 'FLAGS', country: 'Aruba', rating: first.question, answers: 1 })
  })

  it('gains less after errors and never loses', async () => {
    const { body } = await solo('alice', [
      { country: 'France', found: true, errors: 2 },
      { country: 'Aruba', found: false, errors: 3 },
    ])
    const france = soloResult({ rating: 1000, question: QUESTION_START.Facile, found: true, errors: 2, alreadyWon: false, rateQuestion: true })
    expect(body.gained).toBe(france.gain)
    expect((await data('eloQuestions/FLAGS_Aruba')).rating).toBeGreaterThan(QUESTION_START.Impossible)
    expect(await data(`eloGains/alice_${SEASON}_FLAGS_Aruba`)).toMatchObject({ won: false })
  })

  it('pays a country once per mode and season, and lets a missed one be won later', async () => {
    await solo('alice', [{ country: 'France', found: true, errors: 0 }, { country: 'Aruba', found: false, errors: 1 }])
    const before = await data('elo/alice')
    const questionBefore = await data('eloQuestions/FLAGS_France')

    const again = await solo('alice', [{ country: 'France', found: true, errors: 0 }])
    expect(again.body.gained).toBe(0)
    expect(await data('elo/alice')).toEqual(before)
    expect(await data('eloQuestions/FLAGS_France')).toEqual(questionBefore)

    const later = await solo('alice', [{ country: 'Aruba', found: true, errors: 0 }])
    expect(later.body.gained).toBeGreaterThan(0)
    expect((await data('elo/alice')).solo.FLAGS.found).toBe(2)
    // Another mode is another country to win.
    expect((await solo('alice', [{ country: 'France', found: true, errors: 0 }], 'CAPITALS')).body.gained).toBeGreaterThan(0)
  })

  it('skips an unknown country', async () => {
    const { body } = await solo('alice', [{ country: 'Atlantis', found: true, errors: 0 }, { country: 'France', found: true, errors: 0 }])
    expect(body.gained).toBeGreaterThan(0)
    expect((await data('elo/alice')).solo.FLAGS.found).toBe(1)
  })

  it('counts a country once within a request', async () => {
    const { body } = await solo('alice', [{ country: 'France', found: true, errors: 0 }, { country: 'France', found: true, errors: 0 }])
    expect((await data('elo/alice')).solo.FLAGS.found).toBe(1)
    expect(body.gained).toBe(soloResult({ rating: 1000, question: QUESTION_START.Facile, found: true, errors: 0, alreadyWon: false, rateQuestion: true }).gain)
  })

  it('does not list a player who won nothing', async () => {
    await solo('alice', [{ country: 'Aruba', found: false, errors: 1 }])
    expect((await db.doc('elo/alice').get()).exists).toBe(false)
  })

  it('starts a new season from the carried ratings, with every country to win again', async () => {
    await db.doc('elo/alice').set({
      uid: 'alice', name: 'Alice', season: '2026-Q3', duel: { rating: 1100, games: 3, wins: 2 },
      solo: { FLAGS: { rating: 1400, found: 80 } }, carry: {},
    })
    await db.doc('eloGains/alice_2026-Q3_FLAGS_France').set({ uid: 'alice', won: true, at: 0 })

    const { body } = await solo('alice', [{ country: 'France', found: true, errors: 0 }])

    expect(body.gained).toBeGreaterThan(0)
    expect(body.rating).toBe(seasonReset(1400) + body.gained)
    const doc = await data('elo/alice')
    expect(doc.season).toBe(SEASON)
    expect(doc.solo).toEqual({ FLAGS: { rating: body.rating, found: 1 } })
    expect(doc.duel).toBeUndefined()
    expect(doc.carry).toEqual({ duel: seasonReset(1100) })
  })
})

describe('duels', () => {
  const ROOM = 'ABC234'
  const game = { id: 'flags', type: 'FLAGS', difficulty: 'Moyen' }

  async function seedRoom({ code = ROOM, source = 'app2', players, results }) {
    await db.doc(`rooms/${code}`).set({ source, mode: 'live', games: [game], game, gameIndex: 0, players })
    for (const [playerId, result] of Object.entries(results)) {
      await db.doc(`rooms/${code}/gameResults/0_${playerId}`).set({ playerId, gameIndex: 0, elapsedTime: 1000, total: 10, countriesSolved: 5, attempts: 6, ...result })
    }
  }
  const twoPlayers = { p1: { pseudo: 'Alice', uid: 'alice' }, p2: { pseudo: 'Bob', uid: 'bob' } }
  const duel = (uid, room = ROOM) => call(uid, { kind: 'duel', room, gameIndex: 0 })

  it('waits for both results, then rates the duel once', async () => {
    await seedRoom({ players: twoPlayers, results: { p1: { weightedScore: 30 } } })
    expect((await duel('alice')).body).toEqual({ status: 'pending' })

    await db.doc(`rooms/${ROOM}/gameResults/0_p2`).set({ playerId: 'p2', gameIndex: 0, weightedScore: 20, elapsedTime: 900, total: 10, countriesSolved: 5, attempts: 6 })
    const expected = duelResult(1000, 1000, 1)
    expect((await duel('alice')).body).toEqual({ status: 'rated', rating: expected.a, delta: expected.a - 1000 })
    // The other player's call reads the same outcome.
    expect((await duel('bob')).body).toEqual({ status: 'rated', rating: expected.b, delta: expected.b - 1000 })
    expect((await data('elo/alice')).duel).toEqual({ rating: expected.a, games: 1, wins: 1 })
    expect((await data('elo/bob')).duel).toEqual({ rating: expected.b, games: 1, wins: 0 })
  })

  it('scores a tie as a draw', async () => {
    await seedRoom({ players: twoPlayers, results: { p1: { weightedScore: 20 }, p2: { weightedScore: 20 } } })
    expect((await duel('bob')).body).toEqual({ status: 'rated', rating: 1000, delta: 0 })
    expect((await data('elo/alice')).duel.wins).toBe(0)
  })

  it('only rates two-player rooms of signed-in accounts, for one of them', async () => {
    await seedRoom({ players: twoPlayers, results: { p1: { weightedScore: 1 }, p2: { weightedScore: 2 } } })
    expect((await duel('carol')).status).toBe(403)

    await seedRoom({ code: 'DEF234', players: { ...twoPlayers, p3: { pseudo: 'Carol' } }, results: { p1: { weightedScore: 1 }, p2: { weightedScore: 2 } } })
    expect((await duel('alice', 'DEF234')).body).toEqual({ status: 'unrated', reason: 'not_a_duel' })

    await seedRoom({ code: 'GHJ234', players: { p1: twoPlayers.p1, p2: { pseudo: 'Bob' } }, results: { p1: { weightedScore: 1 }, p2: { weightedScore: 2 } } })
    expect((await duel('alice', 'GHJ234')).body).toEqual({ status: 'unrated', reason: 'not_signed_in' })

    await seedRoom({ code: 'KLM234', source: 'app', players: twoPlayers, results: { p1: { weightedScore: 1 }, p2: { weightedScore: 2 } } })
    expect((await duel('alice', 'KLM234')).body).toEqual({ status: 'unrated', reason: 'legacy_room' })

    expect((await db.doc('elo/alice').get()).exists).toBe(false)
  })

  it(`rates ${DUEL_PAIR_DAILY_LIMIT} duels a day between the same two accounts`, async () => {
    const codes = ['AAA234', 'BBB234', 'CCC234', 'DDD234']
    for (const code of codes) {
      await seedRoom({ code, players: twoPlayers, results: { p1: { weightedScore: 30 }, p2: { weightedScore: 20 } } })
    }
    for (const code of codes.slice(0, DUEL_PAIR_DAILY_LIMIT)) expect((await duel('alice', code)).body.status).toBe('rated')
    expect((await duel('alice', codes[DUEL_PAIR_DAILY_LIMIT])).body).toEqual({ status: 'unrated', reason: 'pair_limit' })
    expect((await data('elo/alice')).duel.games).toBe(DUEL_PAIR_DAILY_LIMIT)
  })

  it(`rates ${DUEL_ACCOUNT_DAILY_LIMIT} duels a day per account, whoever the opponent`, async () => {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date(NOW))
    await db.doc(`eloDuelAccounts/alice_${day}`).set({ uid: 'alice', count: DUEL_ACCOUNT_DAILY_LIMIT, at: NOW })
    await seedRoom({ players: twoPlayers, results: { p1: { weightedScore: 30 }, p2: { weightedScore: 20 } } })
    expect((await duel('bob')).body).toEqual({ status: 'unrated', reason: 'account_limit' })
    expect((await db.doc('elo/bob').get()).exists).toBe(false)
  })

  it('does not rate implausible results', async () => {
    const cases = [
      { p1: { weightedScore: 91 }, p2: { weightedScore: 20 } }, // more than 9 points per country
      { p1: { weightedScore: 30, countriesSolved: 11 }, p2: { weightedScore: 20 } }, // more found than played
      { p1: { weightedScore: 30, total: 12 }, p2: { weightedScore: 20 } }, // not the same game
      { p1: { weightedScore: -1 }, p2: { weightedScore: 20 } },
      { p1: { weightedScore: 30, elapsedTime: 0 }, p2: { weightedScore: 20 } },
    ]
    for (const [index, results] of cases.entries()) {
      const code = `PLA${'BCDEF'[index]}23`
      await seedRoom({ code, players: twoPlayers, results })
      expect((await duel('alice', code)).body, code).toEqual({ status: 'unrated', reason: 'implausible' })
    }
    expect((await db.doc('elo/alice').get()).exists).toBe(false)
  })

  it('does not rate a duel with an account created less than 3 days ago', async () => {
    await db.doc('users/bob').set({ username: 'Bob', createdAt: Timestamp.fromMillis(NOW - MIN_DUEL_ACCOUNT_AGE_MS + 60000) })
    await seedRoom({ players: twoPlayers, results: { p1: { weightedScore: 30 }, p2: { weightedScore: 20 } } })
    expect((await duel('alice')).body).toEqual({ status: 'unrated', reason: 'new_account' })

    await db.doc('users/bob').set({ username: 'Bob', createdAt: Timestamp.fromMillis(NOW - MIN_DUEL_ACCOUNT_AGE_MS - 60000) })
    expect((await duel('alice')).body.status).toBe('rated')
  })
})

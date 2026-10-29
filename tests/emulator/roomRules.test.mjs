// @vitest-environment node
// firestore.rules for multiplayer rooms (rooms, progress, gameResults, keys) and _clockSync, against the Firestore
// emulator (npm run test:emulator). The writes are the ones of src/utils/multiplayerRoom.js: players have no account,
// so each write goes in a batch that also sets rooms/{room}/keys/{playerId} = { key, at } (the player's secret).
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const ROOM = 'ABC234'
const LEGACY_CUTOFF = Date.UTC(2026, 11, 1)
const legacyOpen = Date.now() < LEGACY_CUTOFF

const serverTime = () => firebase.firestore.FieldValue.serverTimestamp()
const timestamp = (ms) => firebase.firestore.Timestamp.fromMillis(ms)
const inDays = (days) => timestamp(Date.now() + days * 86400000)
const DAY = 86400000

// Each test player has an id and a secret
const KEYS = {
  host: 'host-secret-0123456789abcdef',
  p2: 'p2-secret-0123456789abcdef-x',
  p3: 'p3-secret-0123456789abcdef-y',
  intruder: 'intruder-secret-0123456789ab',
}
const BAD_KEY = 'not-the-secret-0123456789abcd'

let env
let db

const game = (overrides = {}) => ({ id: 'flags', type: 'FLAGS', difficulty: 'Moyen', continent: null, phases: null, presetName: null, ...overrides })

const roomData = (overrides = {}) => ({
  source: 'app2',
  createdOn: 'web',
  hostId: 'host',
  mode: 'live',
  status: 'lobby',
  games: [game()],
  gameIndex: 0,
  game: game(),
  seed: 123456,
  startAt: null,
  players: { host: { pseudo: 'Hôte', seenAt: serverTime() } },
  createdAt: serverTime(),
  expiresAt: inDays(7),
  by: 'host',
  ...overrides,
})

const keyDoc = (player, key = KEYS[player]) => ({ key, at: serverTime() })

/** The batch every client write goes through: the secret of `player`, plus the writes added by `fill`. */
function owned(player, fill, { key, room = ROOM } = {}) {
  const batch = db.batch()
  batch.set(db.doc(`rooms/${room}/keys/${player}`), keyDoc(player, key))
  fill(batch, db.doc(`rooms/${room}`))
  return batch
}

const createRoom = (overrides = {}, as = 'host', options) =>
  owned(as, (batch, ref) => batch.set(ref, roomData(overrides)), options).commit()

const joinAs = (player, pseudo = player, options = {}) =>
  owned(player, (batch, ref) =>
    batch.update(ref, { [`players.${player}`]: { pseudo, seenAt: serverTime() }, by: options.by ?? player }), options).commit()

const updateRoom = (player, changes, options) =>
  owned(player, (batch, ref) => batch.update(ref, { by: player, ...changes }), options).commit()

const progressDoc = (overrides = {}) => ({
  gameIndex: 0, found: 3, total: 10, finished: false, lastSeen: serverTime(), expiresAt: inDays(7), ...overrides,
})

const reportProgress = (player, data = progressDoc(), { docPlayer = player, ...options } = {}) =>
  owned(player, (batch) => batch.set(db.doc(`rooms/${ROOM}/progress/${docPlayer}`), data, { merge: true }), options).commit()

const resultDoc = (player, overrides = {}) => ({
  playerId: player, pseudo: player, gameIndex: 0, weightedScore: 120, countriesSolved: 8, attempts: 12,
  elapsedTime: 45, total: 10, finishedAt: serverTime(), expiresAt: inDays(7), ...overrides,
})

const submitResult = (player, data = resultDoc(player), { id = `0_${player}`, ...options } = {}) =>
  owned(player, (batch) => batch.set(db.doc(`rooms/${ROOM}/gameResults/${id}`), data), options).commit()

/** A live lobby with the host and p2 already in it (written without the rules, as a previous session would have). */
async function seedRoom({ extra = {}, keys = ['host', 'p2'], playersExtra = {} } = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore()
    await admin.doc(`rooms/${ROOM}`).set(roomData({
      createdAt: new Date(),
      players: {
        host: { pseudo: 'Hôte', seenAt: new Date() },
        p2: { pseudo: 'Deux', seenAt: new Date() },
        ...playersExtra,
      },
      expiresAt: timestamp(Date.now() + 7 * DAY),
      ...extra,
    }))
    for (const player of keys) await admin.doc(`rooms/${ROOM}/keys/${player}`).set({ key: KEYS[player], at: new Date() })
  })
}

const manyGames = (count) => Array.from({ length: count }, (_, i) => game({ id: `flags${i}` }))

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'geogame-sdmm',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  })
})

afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  db = env.unauthenticatedContext().firestore()
})

describe('creating a room', () => {
  it('creates a live room and a challenge room', async () => {
    await assertSucceeds(createRoom())
    await assertSucceeds(createRoom({ mode: 'challenge', status: 'playing' }, 'host', { room: 'XYZ789' }))
  })

  it('creates a room with one game, then adds the others one by one, up to 20', async () => {
    await assertSucceeds(createRoom({ games: manyGames(1), game: manyGames(1)[0] }))
    for (let count = 2; count <= 20; count++) await assertSucceeds(updateRoom('host', { games: manyGames(count) }))
    await assertFails(updateRoom('host', { games: manyGames(21) }))
  })

  it('refuses a room created with several games at once', async () => {
    await assertFails(createRoom({ games: manyGames(2), game: manyGames(2)[0] }))
  })

  it('refuses an explicitly offensive pseudo, when creating a room or joining one', async () => {
    await assertFails(createRoom({ players: { host: { pseudo: 'Fuck you', seenAt: serverTime() } } }))
    await assertSucceeds(createRoom())
    await assertFails(joinAs('p2', 'Salope'))
    await assertSucceeds(joinAs('p3', 'Scunthorpe'))
  })

  it('creates a room whose host has an account, only under their own uid', async () => {
    const hostWith = (uid) => ({ players: { host: { pseudo: 'Hôte', uid, seenAt: serverTime() } } })
    await assertFails(createRoom(hostWith('some-account-uid')))
    db = env.authenticatedContext('some-account-uid').firestore()
    await assertFails(createRoom(hostWith('someone-else')))
    await assertSucceeds(createRoom(hostWith('some-account-uid')))
  })

  it('creates an Ascension room', async () => {
    const ascension = game({ difficulty: null, phases: { Facile: 5, Moyen: 3, Difficile: 1, Impossible: 0 }, presetName: 'Challenge' })
    await assertSucceeds(createRoom({ games: [ascension], game: ascension }))
  })

  it('creates a quiz room', async () => {
    const quiz = game({ id: 'quiz', type: 'QUIZ', difficulty: null, count: 10, quizDifficulty: 'Moyen', answerMode: 'free' })
    await assertSucceeds(createRoom({ games: [quiz], game: quiz }))
  })

  it('creates a survival room, with known games and lives only', async () => {
    const survival = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS+BORDER_GUESS+CAPITALS', lives: 3, timer: 30, ramp: { Facile: 2, Moyen: 0, Difficile: 6 } })
    await assertSucceeds(createRoom({ games: [survival], game: survival }))
    // The hidden Geo Quiz can no longer be a survival round
    const quizRounds = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS+QUIZ', lives: 3 })
    await assertFails(createRoom({ games: [quizRounds], game: quizRounds }, 'host', { room: 'XYZ784' }))
    const cheat = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS+CHEAT', lives: 3 })
    await assertFails(createRoom({ games: [cheat], game: cheat }, 'host', { room: 'XYZ789' }))
    const lives = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS', lives: 99 })
    await assertFails(createRoom({ games: [lives], game: lives }, 'host', { room: 'XYZ788' }))
    const timer = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS', lives: 3, timer: 45 })
    await assertFails(createRoom({ games: [timer], game: timer }, 'host', { room: 'XYZ787' }))
    const ramp = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS', lives: 3, ramp: { Facile: 51 } })
    await assertFails(createRoom({ games: [ramp], game: ramp }, 'host', { room: 'XYZ786' }))
    const rampKey = game({ id: 'survival', type: 'SURVIVAL', difficulty: null, modes: 'FLAGS', lives: 3, ramp: { Impossible: 3 } })
    await assertFails(createRoom({ games: [rampKey], game: rampKey }, 'host', { room: 'XYZ785' }))
  })

  it('refuses a room code that is not 6 characters of the alphabet', async () => {
    for (const room of ['ABC23', 'ABC2345', 'abc234', 'ABCO34', 'ABC1E4']) {
      await assertFails(createRoom({}, 'host', { room }))
    }
  })

  it('refuses unknown fields', async () => {
    await assertFails(createRoom({ admin: true }))
  })

  it('refuses a missing field', async () => {
    const { expiresAt, ...withoutExpiry } = roomData()
    await assertFails(owned('host', (batch, ref) => batch.set(ref, withoutExpiry)).commit())
  })

  it('refuses a game with unknown or oversized fields', async () => {
    await assertFails(createRoom({ games: [game({ hack: 1 })], game: game({ hack: 1 }) }))
    await assertFails(createRoom({ games: [game({ presetName: 'x'.repeat(5000) })], game: game() }))
    await assertFails(createRoom({ games: [game({ count: 100000 })], game: game({ count: 100000 }) }))
  })

  it('refuses a game that is not a copy of the first one', async () => {
    await assertFails(createRoom({ game: game({ id: 'capitals' }) }))
  })

  it('refuses a 1 MB document', async () => {
    await assertFails(createRoom({ games: [game({ presetName: 'x'.repeat(900000) })], game: game() }))
  })

  it('refuses a room created by someone else than the host id', async () => {
    await assertFails(createRoom({ by: 'p2' }))
    await assertFails(createRoom({ hostId: 'p2' }))
  })

  it('refuses a room without the host secret', async () => {
    await assertFails(owned('host', (batch, ref) => batch.set(ref, roomData()), { key: 'short' }).commit())
    await assertFails(db.doc(`rooms/${ROOM}`).set(roomData()))
  })

  it('refuses more than one player, or a missing host entry', async () => {
    await assertFails(createRoom({ players: { host: { pseudo: 'A' }, p2: { pseudo: 'B' } } }))
    await assertFails(createRoom({ players: { p2: { pseudo: 'B' } } }))
    await assertFails(createRoom({ players: {} }))
  })

  it('refuses invalid pseudos', async () => {
    await assertFails(createRoom({ players: { host: { pseudo: '', seenAt: serverTime() } } }))
    await assertFails(createRoom({ players: { host: { pseudo: 'x'.repeat(31), seenAt: serverTime() } } }))
    await assertFails(createRoom({ players: { host: { pseudo: 'A', seenAt: serverTime(), admin: true } } }))
  })

  it('refuses a status that does not match the mode', async () => {
    await assertFails(createRoom({ status: 'playing' }))
    await assertFails(createRoom({ mode: 'challenge', status: 'lobby' }))
    await assertFails(createRoom({ mode: 'solo' }))
  })

  it('refuses a started room, a forged creation time, a bad seed', async () => {
    await assertFails(createRoom({ startAt: timestamp(Date.now()) }))
    await assertFails(createRoom({ gameIndex: 1 }))
    await assertFails(createRoom({ createdAt: timestamp(0) }))
    await assertFails(createRoom({ seed: -1 }))
    await assertFails(createRoom({ seed: 2 ** 40 }))
    await assertFails(createRoom({ seed: 1.5 }))
  })

  it('refuses a missing or out of range expiresAt', async () => {
    await assertFails(createRoom({ expiresAt: inDays(60) }))
    await assertFails(createRoom({ expiresAt: timestamp(Date.now() + 3600000) }))
    await assertFails(createRoom({ expiresAt: timestamp(Date.now() - DAY) }))
    await assertFails(createRoom({ expiresAt: 'tomorrow' }))
  })

  it('does not let a created room be overwritten', async () => {
    await assertSucceeds(createRoom())
    await assertFails(createRoom({ hostId: 'intruder', by: 'intruder', players: { intruder: { pseudo: 'Me' } } }, 'intruder'))
    await assertFails(createRoom({ games: [game({ id: 'capitals' })], game: game({ id: 'capitals' }) }))
  })

  it('does not let rooms be listed, but reads one by its code', async () => {
    await assertSucceeds(createRoom())
    await assertSucceeds(db.doc(`rooms/${ROOM}`).get())
    await assertFails(db.collection('rooms').get())
  })

  it('does not let a room be deleted', async () => {
    await assertSucceeds(createRoom())
    await assertFails(db.doc(`rooms/${ROOM}`).delete())
  })
})

describe('joining and heartbeat', () => {
  beforeEach(() => assertSucceeds(createRoom()))

  it('lets a player join, then join again under another pseudo', async () => {
    await assertSucceeds(joinAs('p2', 'Deux'))
    await assertSucceeds(joinAs('p2', 'Deux bis'))
  })

  it('lets a player with an account join under their own uid only', async () => {
    const joinWith = (uid) => owned('p2', (batch, ref) =>
      batch.update(ref, { 'players.p2': { pseudo: 'Deux', uid, seenAt: serverTime() }, by: 'p2' })).commit()
    // Signed out, or someone else's account: a duel against that account could be rated (api/_lib/elo.mjs).
    await assertFails(joinWith('acc-1'))
    db = env.authenticatedContext('acc-2').firestore()
    await assertFails(joinWith('acc-1'))
    db = env.authenticatedContext('acc-1').firestore()
    await assertSucceeds(joinWith('acc-1'))
    await assertSucceeds(updateRoom('p2', { 'players.p2.seenAt': serverTime() }))
  })

  it('lets a player send a heartbeat', async () => {
    await joinAs('p2')
    await assertSucceeds(updateRoom('p2', { 'players.p2.seenAt': serverTime() }))
    await assertSucceeds(updateRoom('host', { 'players.host.seenAt': serverTime() }))
  })

  it('refuses a join without the secret batch', async () => {
    await assertFails(db.doc(`rooms/${ROOM}`).update({ 'players.p2': { pseudo: 'Deux' }, by: 'p2' }))
  })

  it('refuses a join that does not register the player', async () => {
    // key for p2 but the entry added is p3's
    await assertFails(owned('p2', (batch, ref) => batch.update(ref, { 'players.p3': { pseudo: 'Trois' }, by: 'p3' })).commit())
  })

  it('refuses to join as a player whose entry exists, with another secret', async () => {
    await joinAs('p2')
    await assertFails(joinAs('p2', 'Hijack', { key: BAD_KEY }))
    await assertFails(updateRoom('p2', { 'players.p2': { pseudo: 'Hijack' } }, { key: BAD_KEY }))
  })

  it('refuses to claim the host entry', async () => {
    await assertFails(joinAs('host', 'Fake host', { key: BAD_KEY }))
    await assertFails(joinAs('intruder', 'x', { by: 'host' }))
  })

  it("refuses to write another player's entry", async () => {
    await joinAs('p2', 'Deux')
    await assertFails(updateRoom('intruder', { 'players.p2': { pseudo: 'Pwned' } }))
    await assertFails(updateRoom('p2', { 'players.host': { pseudo: 'Pwned' } }))
    await assertFails(updateRoom('p2', { 'players.host.pseudo': 'Pwned' }))
    await assertFails(updateRoom('p2', { 'players.host.seenAt': serverTime() }))
  })

  it('refuses a write that claims another player with its own secret', async () => {
    await joinAs('p2')
    await assertFails(updateRoom('p2', { 'players.p2.seenAt': serverTime() }, { key: KEYS.intruder }))
    await assertFails(owned('intruder', (batch, ref) => batch.update(ref, { 'players.p2.seenAt': serverTime(), by: 'p2' })).commit())
  })

  it('refuses to remove a player or to empty the players', async () => {
    await joinAs('p2')
    await assertFails(updateRoom('p2', { players: {} }))
    await assertFails(updateRoom('p2', { 'players.host': firebase.firestore.FieldValue.delete() }))
    await assertFails(updateRoom('p2', { 'players.p2': firebase.firestore.FieldValue.delete() }))
    await assertFails(updateRoom('host', { players: { host: { pseudo: 'Hôte', seenAt: serverTime() } } }))
  })

  it('refuses a forged heartbeat time and invalid entries', async () => {
    await joinAs('p2')
    await assertFails(updateRoom('p2', { 'players.p2.seenAt': timestamp(Date.now() + 10 * DAY) }))
    await assertFails(updateRoom('p2', { 'players.p2': { pseudo: 'x'.repeat(31) } }))
    await assertFails(updateRoom('p2', { 'players.p2': { pseudo: 'A', isHost: true } }))
    await assertFails(updateRoom('p2', { 'players.p2': { pseudo: 'A', uid: 'u'.repeat(200) } }))
    await assertFails(updateRoom('p2', { 'players.p2': { pseudo: 'A', seenAt: serverTime(), big: 'x'.repeat(100000) } }))
  })

  it('accepts 50 players and refuses the 51st', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const players = Object.fromEntries(Array.from({ length: 49 }, (_, i) => [`fill${i}`, { pseudo: `F${i}`, seenAt: new Date() }]))
      await context.firestore().doc(`rooms/${ROOM}`).update(Object.fromEntries(Object.entries(players).map(([id, value]) => [`players.${id}`, value])))
    })
    // 50 players now (host + 49)
    await assertFails(joinAs('p2'))
    await env.withSecurityRulesDisabled((context) => context.firestore().doc(`rooms/${ROOM}`).update({ 'players.fill48': firebase.firestore.FieldValue.delete() }))
    await assertSucceeds(joinAs('p2'))
    await env.withSecurityRulesDisabled((context) => context.firestore().doc(`rooms/${ROOM}`).update({ 'players.fill47': firebase.firestore.FieldValue.delete() }))
    await assertSucceeds(joinAs('p3'))
  })

  it('refuses player ids that are not safe document ids', async () => {
    await assertFails(joinAs('x'.repeat(65), 'x', { key: KEYS.p2 }))
  })
})

describe('the host drives the room', () => {
  beforeEach(async () => {
    await assertSucceeds(createRoom())
    await assertSucceeds(updateRoom('host', { games: [game(), game({ id: 'capitals', type: 'CAPITALS' })] }))
    await joinAs('p2', 'Deux')
  })

  const startAt = () => timestamp(Date.now() + 5000)

  it('launches the game, then the next one, and adds a game', async () => {
    await assertSucceeds(updateRoom('host', { status: 'playing', startAt: startAt() }))
    await assertSucceeds(updateRoom('host', {
      gameIndex: 1, game: game({ id: 'capitals', type: 'CAPITALS' }), status: 'playing', startAt: startAt(),
    }))
    await assertSucceeds(updateRoom('host', {
      games: [game(), game({ id: 'capitals', type: 'CAPITALS' }), game({ id: 'quiz', type: 'QUIZ', count: 10 })],
    }))
  })

  it('refuses a non-host who launches or moves on', async () => {
    await assertFails(updateRoom('p2', { status: 'playing', startAt: startAt() }))
    await assertFails(updateRoom('intruder', { status: 'playing', startAt: startAt() }))
    await updateRoom('host', { status: 'playing', startAt: startAt() })
    await assertFails(updateRoom('p2', { gameIndex: 1, game: game({ id: 'capitals', type: 'CAPITALS' }), startAt: startAt() }))
  })

  it('refuses a non-host who changes the host, the games, the seed or the mode', async () => {
    await assertFails(updateRoom('p2', { hostId: 'p2' }))
    await assertFails(updateRoom('p2', { games: [game({ id: 'rigged' })] }))
    await assertFails(updateRoom('p2', { game: game({ id: 'rigged' }) }))
    await assertFails(updateRoom('p2', { gameIndex: 1 }))
    await assertFails(updateRoom('p2', { seed: 1 }))
    await assertFails(updateRoom('p2', { mode: 'challenge' }))
    await assertFails(updateRoom('p2', { status: 'playing' }))
    await assertFails(updateRoom('p2', { startAt: null }))
    await assertFails(updateRoom('p2', { expiresAt: inDays(9) }))
    await assertFails(updateRoom('p2', { source: 'app' }))
    await assertFails(updateRoom('p2', { createdAt: timestamp(0) }))
    await assertFails(updateRoom('p2', { by: 'host', hostId: 'p2' }))
  })

  it('refuses a player who writes as the host without the host secret', async () => {
    await assertFails(updateRoom('host', { status: 'playing', startAt: startAt() }, { key: BAD_KEY }))
    await assertFails(owned('p2', (batch, ref) => batch.update(ref, { status: 'playing', startAt: startAt(), by: 'host' })).commit())
    await assertFails(db.doc(`rooms/${ROOM}`).update({ status: 'playing', startAt: startAt(), by: 'host' }))
  })

  it('does not let the host change what is fixed, or break the room', async () => {
    await assertFails(updateRoom('host', { seed: 1 }))
    await assertFails(updateRoom('host', { mode: 'challenge' }))
    await assertFails(updateRoom('host', { expiresAt: inDays(9) }))
    await assertFails(updateRoom('host', { players: {} }))
    await assertFails(updateRoom('host', { 'players.p2': { pseudo: 'Edited by the host' } }))
    await assertFails(updateRoom('host', { status: 'lobby', mystery: true }))
    await assertFails(updateRoom('host', { status: 'playing', startAt: timestamp(Date.now() + 30 * DAY) }))
    await assertFails(updateRoom('host', { status: 'playing', startAt: 'now' }))
  })

  it('refuses a launch that was already done, and a next game out of order', async () => {
    await updateRoom('host', { status: 'playing', startAt: startAt() })
    await assertFails(updateRoom('host', { status: 'playing', startAt: startAt() }))
    await assertFails(updateRoom('host', { gameIndex: 2, game: game(), status: 'playing', startAt: startAt() }))
    await assertFails(updateRoom('host', { gameIndex: 1, game: game({ id: 'rigged' }), status: 'playing', startAt: startAt() }))
    await assertFails(updateRoom('host', { gameIndex: 1, game: game({ id: 'capitals', type: 'CAPITALS' }), status: 'lobby', startAt: startAt() }))
  })

  it('refuses games that are replaced, removed, or too many', async () => {
    await assertFails(updateRoom('host', { games: [game({ id: 'rigged' })] }))
    await assertFails(updateRoom('host', { games: [game()] }))
    await assertFails(updateRoom('host', { games: [game({ id: 'rigged' }), game({ id: 'capitals', type: 'CAPITALS' }), game()] }))
    await assertFails(updateRoom('host', { games: [game(), game({ id: 'capitals', type: 'CAPITALS' }), game({ hack: 1 })] }))
    await assertFails(updateRoom('host', { games: [game(), game({ id: 'capitals', type: 'CAPITALS' }), game({ id: 'x'.repeat(100) })] }))
    await assertFails(updateRoom('host', { games: [...manyGames(21)] }))
    // 19 games, then one more is the 20th, the next is refused
    await env.withSecurityRulesDisabled((context) => context.firestore().doc(`rooms/${ROOM}`).update({ games: manyGames(19) }))
    await assertSucceeds(updateRoom('host', { games: manyGames(20) }))
    await env.withSecurityRulesDisabled((context) => context.firestore().doc(`rooms/${ROOM}`).update({ games: manyGames(20) }))
    await assertFails(updateRoom('host', { games: manyGames(21) }))
  })
})

describe('host hand-over', () => {
  const longAgo = (ms) => new Date(Date.now() - ms)

  it('lets a player take the lobby over when the host stopped sending heartbeats', async () => {
    await seedRoom({ extra: { players: { host: { pseudo: 'Hôte', seenAt: longAgo(5 * 60000) }, p2: { pseudo: 'Deux', seenAt: new Date() } } } })
    await assertSucceeds(updateRoom('p2', { hostId: 'p2' }))
    // the new host can launch
    await assertSucceeds(updateRoom('p2', { status: 'playing', startAt: timestamp(Date.now() + 5000) }))
    // the former host no longer can
    await assertFails(updateRoom('host', { hostId: 'host' }))
  })

  it('refuses the take over while the host is still around', async () => {
    await seedRoom()
    await assertFails(updateRoom('p2', { hostId: 'p2' }))
    await seedRoom({ extra: { players: { host: { pseudo: 'Hôte', seenAt: longAgo(60000) }, p2: { pseudo: 'Deux', seenAt: new Date() } } } })
    await assertFails(updateRoom('p2', { hostId: 'p2' }))
  })

  it('refuses a take over for someone else, by a stranger, or once the game started', async () => {
    await seedRoom({
      playersExtra: {},
      extra: { players: { host: { pseudo: 'Hôte', seenAt: longAgo(5 * 60000) }, p2: { pseudo: 'Deux', seenAt: new Date() } } },
    })
    await assertFails(updateRoom('p2', { hostId: 'intruder' }))
    await assertFails(updateRoom('intruder', { hostId: 'intruder' }))
    await assertFails(updateRoom('p2', { hostId: 'p2', status: 'playing' }))
    await env.withSecurityRulesDisabled((context) => context.firestore().doc(`rooms/${ROOM}`).update({ status: 'playing' }))
    await assertFails(updateRoom('p2', { hostId: 'p2' }))
  })

  it('never replaces a host that has no heartbeat at all', async () => {
    await seedRoom({ extra: { players: { host: { pseudo: 'Hôte' }, p2: { pseudo: 'Deux', seenAt: new Date() } } } })
    await assertFails(updateRoom('p2', { hostId: 'p2' }))
  })
})

describe('progress and results', () => {
  beforeEach(async () => {
    await assertSucceeds(createRoom({ mode: 'challenge', status: 'playing' }))
    await joinAs('p2', 'Deux')
  })

  it('lets a player report progress and then finish', async () => {
    await assertSucceeds(reportProgress('p2'))
    await assertSucceeds(reportProgress('p2', { gameIndex: 0, found: 10, total: 10, finished: true, lastSeen: serverTime(), expiresAt: inDays(7) }))
    await assertSucceeds(reportProgress('host'))
  })

  it('lets a survival player report their lives left, within bounds', async () => {
    await assertSucceeds(reportProgress('p2', progressDoc({ lives: 2 })))
    await assertSucceeds(reportProgress('p2', progressDoc({ lives: 0, finished: true })))
    await assertFails(reportProgress('p2', progressDoc({ lives: 11 })))
    await assertFails(reportProgress('p2', progressDoc({ lives: -1 })))
  })

  it('lets a survival player of a live room report the round they play, within bounds', async () => {
    const round = { lives: 2, round: 4, roundAt: Date.now(), roundDone: false }
    await assertSucceeds(reportProgress('p2', progressDoc(round)))
    await assertSucceeds(reportProgress('p2', progressDoc({ ...round, roundDone: true })))
    await assertFails(reportProgress('p2', progressDoc({ ...round, round: 301 })))
    await assertFails(reportProgress('p2', progressDoc({ ...round, roundAt: 'now' })))
    await assertFails(reportProgress('p2', progressDoc({ ...round, roundDone: 'yes' })))
  })

  it('lets a player submit a result, for each game', async () => {
    await assertSucceeds(submitResult('p2'))
    await assertSucceeds(submitResult('p2', resultDoc('p2', { gameIndex: 1 }), { id: '1_p2' }))
    await assertSucceeds(submitResult('host', resultDoc('host', { pseudo: '?' })))
  })

  it('lets everyone read the progress and the results', async () => {
    await reportProgress('p2')
    await submitResult('p2')
    await assertSucceeds(db.collection(`rooms/${ROOM}/progress`).get())
    await assertSucceeds(db.collection(`rooms/${ROOM}/gameResults`).get())
  })

  it("refuses to write another player's progress or result", async () => {
    await assertFails(reportProgress('intruder', progressDoc(), { docPlayer: 'p2' }))
    await assertFails(reportProgress('p2', progressDoc(), { docPlayer: 'host' }))
    await assertFails(submitResult('intruder', resultDoc('p2'), { id: '0_p2' }))
    await assertFails(submitResult('p2', resultDoc('host'), { id: '0_host' }))
    await assertFails(submitResult('p2', resultDoc('host'), { id: '0_p2' }))
    await assertFails(submitResult('p2', resultDoc('p2'), { id: '0_host' }))
  })

  it('refuses a result or progress without the right secret', async () => {
    await assertFails(reportProgress('p2', progressDoc(), { key: BAD_KEY }))
    await assertFails(submitResult('p2', resultDoc('p2'), { key: BAD_KEY }))
    await assertFails(db.doc(`rooms/${ROOM}/progress/p2`).set(progressDoc()))
    await assertFails(db.doc(`rooms/${ROOM}/gameResults/0_p2`).set(resultDoc('p2')))
  })

  it('does not let a stranger overwrite a result that exists', async () => {
    await submitResult('p2')
    await assertFails(submitResult('intruder', resultDoc('p2', { weightedScore: 99999 }), { id: '0_p2' }))
    await assertFails(db.doc(`rooms/${ROOM}/gameResults/0_p2`).set(resultDoc('p2', { weightedScore: 99999 })))
  })

  it('refuses giant documents, unknown fields and out of range numbers', async () => {
    await assertFails(reportProgress('p2', progressDoc({ junk: 'x'.repeat(900000) })))
    await assertFails(reportProgress('p2', progressDoc({ admin: true })))
    await assertFails(reportProgress('p2', progressDoc({ found: 1e9 })))
    await assertFails(reportProgress('p2', progressDoc({ gameIndex: 25 })))
    await assertFails(reportProgress('p2', progressDoc({ finished: 'yes' })))
    await assertFails(reportProgress('p2', progressDoc({ lastSeen: timestamp(0) })))
    await assertFails(submitResult('p2', resultDoc('p2', { pseudo: 'x'.repeat(900000) })))
    await assertFails(submitResult('p2', resultDoc('p2', { junk: 'x'.repeat(900000) })))
    await assertFails(submitResult('p2', resultDoc('p2', { weightedScore: 1e15 })))
    await assertFails(submitResult('p2', resultDoc('p2', { countriesSolved: -1 })))
    await assertFails(submitResult('p2', resultDoc('p2', { finishedAt: timestamp(0) })))
    await assertFails(submitResult('p2', resultDoc('p2', { gameIndex: 1 })))
  })

  it('refuses a missing or out of range expiresAt', async () => {
    const { expiresAt, ...withoutExpiry } = progressDoc()
    await assertFails(reportProgress('p2', withoutExpiry))
    await assertFails(reportProgress('p2', progressDoc({ expiresAt: inDays(90) })))
    await assertFails(submitResult('p2', resultDoc('p2', { expiresAt: inDays(90) })))
    await assertFails(submitResult('p2', resultDoc('p2', { expiresAt: timestamp(Date.now() - DAY) })))
  })

  it('does not delete progress or results', async () => {
    await reportProgress('p2')
    await submitResult('p2')
    await assertFails(db.doc(`rooms/${ROOM}/progress/p2`).delete())
    await assertFails(db.doc(`rooms/${ROOM}/gameResults/0_p2`).delete())
  })

  it('refuses progress in a room that does not exist', async () => {
    await assertFails(owned('p2', (batch) => batch.set(db.doc('rooms/NOROOM/progress/p2'), progressDoc()), { room: 'NOROOM' }).commit())
  })
})

describe('the secrets', () => {
  beforeEach(async () => {
    await assertSucceeds(createRoom())
    await joinAs('p2')
  })

  it('can neither be read nor listed', async () => {
    await assertFails(db.doc(`rooms/${ROOM}/keys/host`).get())
    await assertFails(db.doc(`rooms/${ROOM}/keys/p2`).get())
    await assertFails(db.collection(`rooms/${ROOM}/keys`).get())
  })

  it('can neither be replaced nor deleted', async () => {
    await assertFails(db.doc(`rooms/${ROOM}/keys/host`).set(keyDoc('host', BAD_KEY)))
    await assertFails(db.doc(`rooms/${ROOM}/keys/host`).delete())
    await assertFails(owned('host', () => {}, { key: BAD_KEY }).commit())
  })

  it('cannot be created for a player who did not join', async () => {
    await assertFails(db.doc(`rooms/${ROOM}/keys/ghost`).set(keyDoc('intruder')))
    await assertFails(db.doc(`rooms/NOROOM/keys/ghost`).set(keyDoc('intruder')))
  })

  it('cannot be created too short or with other fields', async () => {
    await assertFails(owned('p3', (batch, ref) => batch.update(ref, { 'players.p3': { pseudo: 'T' }, by: 'p3' }), { key: 'short' }).commit())
    const batch = db.batch()
    batch.set(db.doc(`rooms/${ROOM}/keys/p3`), { ...keyDoc('p3'), extra: 1 })
    batch.update(db.doc(`rooms/${ROOM}`), { 'players.p3': { pseudo: 'T' }, by: 'p3' })
    await assertFails(batch.commit())
  })
})

describe('rooms from before the secrets (until the cutoff)', () => {
  const oldRoom = (overrides = {}) => ({
    source: 'app',
    createdOn: 'app',
    hostId: 'oldhost',
    mode: 'live',
    status: 'lobby',
    games: [game()],
    gameIndex: 0,
    game: game(),
    seed: 99,
    startAt: null,
    players: { oldhost: { pseudo: 'Old' } },
    createdAt: serverTime(),
    ...overrides,
  })

  const run = legacyOpen ? describe : describe.skip

  run('while the cutoff has not passed', () => {
    it('lets an old client create, join, launch, report and submit as before', async () => {
      await assertSucceeds(db.doc('rooms/KLM234').set(oldRoom()))
      await assertSucceeds(db.doc('rooms/KLM234').update({ 'players.p2': { pseudo: 'Deux', uid: 'u' } }))
      await assertSucceeds(db.doc('rooms/KLM234').update({ 'players.p2.seenAt': serverTime() }))
      await assertSucceeds(db.doc('rooms/KLM234').update({ hostId: 'p2' }))
      await assertSucceeds(db.doc('rooms/KLM234').update({ status: 'playing', startAt: timestamp(Date.now() + 5000) }))
      await assertSucceeds(db.doc('rooms/KLM234/progress/p2').set({ gameIndex: 0, found: 1, total: 10, finished: false, lastSeen: serverTime() }, { merge: true }))
      await assertSucceeds(db.doc('rooms/KLM234/gameResults/0_p2').set({
        playerId: 'p2', pseudo: 'Deux', gameIndex: 0, weightedScore: 5, countriesSolved: 5, attempts: 6, elapsedTime: 30, total: 10, finishedAt: serverTime(),
      }))
    })

    it('lets an old website create a room with several games, and add one', async () => {
      await assertSucceeds(db.doc('rooms/KLM236').set(oldRoom({ games: manyGames(3), game: manyGames(3)[0] })))
      await assertSucceeds(db.doc('rooms/KLM236').update({ games: manyGames(4) }))
      await assertFails(db.doc('rooms/KLM236').update({ games: [...manyGames(4), game({ hack: 1 }), game()] }))
      await assertFails(db.doc('rooms/KLM236').update({ games: [...manyGames(4), game({ hack: 1 })] }))
    })

    it('lets the first app rooms (one game, no createdOn) work', async () => {
      const { createdOn, games, gameIndex, ...first } = oldRoom()
      await assertSucceeds(db.doc('rooms/KLM235').set(first))
      await assertSucceeds(db.doc('rooms/KLM235').update({ 'players.p2': { pseudo: 'Deux' } }))
    })

    it('still bounds old rooms: size, unknown fields, the number of players', async () => {
      await assertFails(db.doc('rooms/KLM234').set(oldRoom({ admin: true })))
      await assertFails(db.doc('rooms/KLM234').set(oldRoom({ games: manyGames(21) })))
      await assertFails(db.doc('rooms/KLM234').set(oldRoom({ game: game({ presetName: 'x'.repeat(900000) }) })))
      await assertFails(db.doc('rooms/KLM234').set(oldRoom({ source: 'other' })))
      await db.doc('rooms/KLM234').set(oldRoom())
      await assertFails(db.doc('rooms/KLM234').update({ junk: 1 }))
      await assertFails(db.doc('rooms/KLM234').update({ games: manyGames(25) }))
      await assertFails(db.doc('rooms/KLM234').update({ seed: 5 }))
      await assertFails(db.doc('rooms/KLM234').update({ 'players.a': { pseudo: 'A' }, 'players.b': { pseudo: 'B' } }))
      await assertFails(db.doc('rooms/KLM234/progress/p2').set({ found: 1, junk: 'x'.repeat(900000) }))
      await assertFails(db.doc('rooms/KLM234/gameResults/0_p2').set({ playerId: 'p2', pseudo: 'x'.repeat(5000) }))
    })

    it('lets a new client write to an old room', async () => {
      await db.doc('rooms/KLM234').set(oldRoom())
      await assertSucceeds(joinAs('p2', 'Deux', { room: 'KLM234' }))
      await assertSucceeds(updateRoom('p2', { 'players.p2.seenAt': serverTime() }, { room: 'KLM234' }))
      await assertSucceeds(owned('p2', (batch) => batch.set(db.doc('rooms/KLM234/progress/p2'), progressDoc(), { merge: true }), { room: 'KLM234' }).commit())
    })

    it('lets an old client still use _clockSync without expiresAt', async () => {
      await assertSucceeds(db.doc('_clockSync/old').set({ t: serverTime() }))
    })
  })

  it('does not let new rooms use the old format as a way around the rules', async () => {
    await createRoom()
    await assertFails(db.doc(`rooms/${ROOM}`).update({ hostId: 'p2' }))
    await assertFails(db.doc(`rooms/${ROOM}`).update({ source: 'app' }))
    await assertFails(db.doc(`rooms/${ROOM}/progress/p2`).set({ gameIndex: 0, found: 1, total: 10, finished: false }))
  })
})

describe('_clockSync', () => {
  it('creates a probe with an expiry, and nothing else', async () => {
    await assertSucceeds(db.doc('_clockSync/a').set({ t: serverTime(), expiresAt: timestamp(Date.now() + 10 * 60000) }))
    await assertFails(db.doc('_clockSync/b').set({ t: serverTime(), expiresAt: inDays(30) }))
    await assertFails(db.doc('_clockSync/c').set({ t: serverTime(), expiresAt: timestamp(Date.now() - 60000) }))
    await assertFails(db.doc('_clockSync/d').set({ t: serverTime(), expiresAt: timestamp(Date.now() + 600000), junk: 1 }))
    await assertFails(db.doc('_clockSync/e').set({ t: timestamp(0), expiresAt: timestamp(Date.now() + 600000) }))
  })

  // The client only has its own clock to compute an expiry: a probe without one must work after the cutoff too,
  // or a device set to another day could never learn the server time (the cleanup goes by t).
  it('creates a probe without an expiry, holding only the server time', async () => {
    await assertSucceeds(db.doc('_clockSync/f').set({ t: serverTime() }))
    await assertFails(db.doc('_clockSync/g').set({ t: timestamp(Date.now() + 24 * 3600000) }))
    await assertFails(db.doc('_clockSync/h').set({ t: serverTime(), junk: 1 }))
  })

  it('reads the probe, and nobody deletes or updates it', async () => {
    await db.doc('_clockSync/a').set({ t: serverTime(), expiresAt: timestamp(Date.now() + 600000) })
    await assertSucceeds(db.doc('_clockSync/a').get())
    await assertFails(db.doc('_clockSync/a').delete())
    await assertFails(db.doc('_clockSync/a').set({ t: serverTime(), expiresAt: timestamp(Date.now() + 600000) }))
  })
})

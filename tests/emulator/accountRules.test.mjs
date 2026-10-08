// @vitest-environment node
// firestore.rules for accounts, usernames, game history and visitor names, against the Firestore emulator (npm run test:emulator).
import { readFileSync } from 'fs'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':')
const now = () => firebase.firestore.FieldValue.serverTimestamp()
const NBSP = String.fromCharCode(160)

let env

const as = (uid) => env.authenticatedContext(uid).firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

// What claimUsername (src/utils/account.js) does: both documents in one transaction.
const claim = (db, uid, username, { key = username.toLowerCase(), user = {}, name = {} } = {}) => {
  const batch = db.batch()
  batch.set(db.doc(`usernames/${key}`), { uid, username, ...name })
  batch.set(db.doc(`users/${uid}`), { username, usernameKey: key, createdAt: now(), ...user })
  return batch.commit()
}

const score = (overrides = {}) => {
  const data = { name: 'Alice', uid: 'alice', score: 10, difficulty: 'Facile', gameType: 'PLACEMENT', ...overrides }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
}
const game = (overrides = {}) => {
  const data = { gameType: 'PLACEMENT', mode: 'standard', score: 12, found: 10, total: 20, elapsedTime: 4500, playedAt: now(), ...overrides }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
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
    await db.doc('usernames/alice').set({ uid: 'alice', username: 'Alice' })
    await db.doc('users/alice').set({ username: 'Alice' })
  })
})

describe('claiming a username', () => {
  it('refuses an explicitly offensive username', async () => {
    await assertFails(claim(as('bob'), 'bob', 'Connard42'))
    await assertFails(claim(as('bob'), 'bob', 'ПИДОР'))
    await assertSucceeds(claim(as('bob'), 'bob', 'Scunthorpe'))
  })

  it('lets a new account claim a username (sign-up, or the first Google sign-in)', async () => {
    await assertSucceeds(claim(as('bob'), 'bob', 'Bob'))
  })

  it('accepts accents, spaces, digits and . _ - in a username', async () => {
    await assertSucceeds(claim(as('bob'), 'bob', 'Éloïse du 13_a.b-c'))
  })

  it('still accepts an older client that sends no usernameKey (ASCII usernames)', async () => {
    const db = as('bob')
    const batch = db.batch()
    batch.set(db.doc('usernames/bob'), { uid: 'bob', username: 'Bob' })
    batch.set(db.doc('users/bob'), { username: 'Bob', createdAt: now() })
    await assertSucceeds(batch.commit())
  })

  it("refuses a usernameKey pointing at someone else's username", async () => {
    await assertFails(claim(as('mallory'), 'mallory', 'Mallory', { user: { usernameKey: 'alice' } }))
    await assertFails(claim(as('mallory'), 'mallory', 'Alice', { key: 'mallory', user: { usernameKey: 'alice' } }))
  })

  it('works in a transaction like claimUsername', async () => {
    const db = as('bob')
    await assertSucceeds(
      db.runTransaction(async (transaction) => {
        const claimed = await transaction.get(db.doc('usernames/bob'))
        if (claimed.exists) throw new Error('taken')
        transaction.set(db.doc('usernames/bob'), { uid: 'bob', username: 'Bob' })
        transaction.set(db.doc('users/bob'), { username: 'Bob', createdAt: now() })
      }),
    )
  })

  it('refuses a user document alone, with a username the account does not own', async () => {
    await assertFails(as('mallory').doc('users/mallory').set({ username: 'Alice', createdAt: now() }))
    await assertFails(as('mallory').doc('users/mallory').set({ username: 'Mallory', createdAt: now() }))
  })

  it('refuses taking a username that is already taken', async () => {
    await assertFails(claim(as('mallory'), 'mallory', 'Alice'))
    await assertFails(claim(as('mallory'), 'mallory', 'ALICE'))
  })

  it('refuses a usernames document for another account', async () => {
    await assertFails(claim(as('mallory'), 'bob', 'Bob'))
    await assertFails(as('mallory').doc('usernames/bob').set({ uid: 'bob', username: 'Bob' }))
  })

  it('refuses a document id that is not the lowercase username', async () => {
    await assertFails(claim(as('bob'), 'bob', 'Bob', { key: 'Bob' }))
    await assertFails(claim(as('bob'), 'bob', 'Bob', { key: 'someoneelse' }))
  })

  it('refuses usernames that validateUsername refuses', async () => {
    const bad = ['ab', 'a'.repeat(61), ' Bob', 'Bob ', 'Bo  b', 'Bo\tb', `Bo${NBSP}b`, 'Bo\nb', 'Bo/b', '.Bob', '-Bob', 'Bob!', 'Bob@home']
    for (const username of bad) {
      await assertFails(claim(as('bob'), 'bob', username, { key: username.toLowerCase().replace(/\//g, '_') }))
    }
  })

  it('refuses extra fields on either document', async () => {
    await assertFails(claim(as('bob'), 'bob', 'Bob', { user: { admin: true } }))
    await assertFails(claim(as('bob'), 'bob', 'Bob', { name: { admin: true } }))
  })

  it('refuses a client-chosen creation date and a missing one', async () => {
    await assertFails(claim(as('bob'), 'bob', 'Bob', { user: { createdAt: new Date(2020, 1, 1) } }))
    const db = as('bob')
    const batch = db.batch()
    batch.set(db.doc('usernames/bob'), { uid: 'bob', username: 'Bob' })
    batch.set(db.doc('users/bob'), { username: 'Bob' })
    await assertFails(batch.commit())
  })

  it('refuses two usernames for one account', async () => {
    await assertFails(claim(as('alice'), 'alice', 'Alice2'))
    await assertFails(as('alice').doc('usernames/alice2').set({ uid: 'alice', username: 'Alice2' }))
    await assertSucceeds(claim(as('bob'), 'bob', 'Bob'))
    await assertFails(as('bob').doc('usernames/bobby').set({ uid: 'bob', username: 'Bobby' }))
  })

  it('refuses reserving a username without an account document pointing to it', async () => {
    await assertFails(as('bob').doc('usernames/bob').set({ uid: 'bob', username: 'Bob' }))
    await assertFails(as('bob').doc('usernames/squat').set({ uid: 'bob', username: 'Squat' }))
  })

  it('refuses signed-out requests', async () => {
    await assertFails(anonymous().doc('usernames/bob').set({ uid: 'bob', username: 'Bob' }))
    await assertFails(anonymous().doc('users/bob').set({ username: 'Bob', createdAt: now() }))
  })
})

describe('changing a username', () => {
  it('refuses rewriting the username of an account', async () => {
    await assertFails(as('alice').doc('users/alice').set({ username: 'Bob', createdAt: now() }))
    await assertFails(as('alice').doc('users/alice').update({ username: 'Bob' }))
    await assertFails(as('alice').doc('users/alice').update({ username: 'Alice', admin: true }))
  })

  it('refuses rewriting or stealing a usernames document', async () => {
    await assertFails(as('alice').doc('usernames/alice').update({ username: 'ALICE' }))
    await assertFails(as('mallory').doc('usernames/alice').set({ uid: 'mallory', username: 'Alice' }))
    await assertFails(as('mallory').doc('usernames/alice').delete())
  })

  it('refuses dropping one of the two documents alone', async () => {
    await assertFails(as('alice').doc('users/alice').delete())
    await assertFails(as('alice').doc('usernames/alice').delete())
  })

  it('refuses deleting the account document to claim another username while keeping the first', async () => {
    await assertFails(as('alice').doc('users/alice').delete())
    await assertFails(claim(as('alice'), 'alice', 'Alice2'))
  })
})

describe('deleting an account', () => {
  const deleteBoth = (uid) => {
    const db = as(uid)
    const batch = db.batch()
    batch.delete(db.doc('usernames/alice'))
    batch.delete(db.doc('users/alice'))
    return batch.commit()
  }

  it('deletes usernames + users together, like deleteAccount', async () => {
    await assertSucceeds(deleteBoth('alice'))
  })

  it('frees the username for someone else afterwards', async () => {
    await deleteBoth('alice')
    await assertSucceeds(claim(as('bob'), 'bob', 'Alice'))
  })

  it("refuses deleting another account's documents", async () => {
    await assertFails(deleteBoth('mallory'))
  })

  it('lets an account without a profile delete itself (nothing to claim, nothing to delete)', async () => {
    await assertSucceeds(as('bob').doc('users/bob').delete())
  })
})

describe('push tokens keep their own rules', () => {
  const token = () => ({ token: 'ExponentPushToken[abc]', lang: 'fr', platform: 'ios', updatedAt: now() })

  it('lets the owner register and forget a device', async () => {
    await assertSucceeds(as('alice').doc('users/alice/pushTokens/ExponentPushToken[abc]').set(token()))
    await assertSucceeds(as('alice').doc('users/alice/pushTokens/ExponentPushToken[abc]').delete())
  })

  it("refuses writing another account's tokens, or unknown fields", async () => {
    await assertFails(as('mallory').doc('users/alice/pushTokens/ExponentPushToken[abc]').set(token()))
    await assertFails(as('alice').doc('users/alice/pushTokens/ExponentPushToken[abc]').set({ ...token(), extra: 1 }))
  })
})

describe('game history', () => {
  const games = (uid = 'alice') => as(uid).collection(`users/${uid}/games`)

  it('records the games the website and the app build', async () => {
    const records = [
      game(),
      game({ mode: 'ascension', presetName: 'Europe', difficulty: 'Moyen', continent: 'Europe' }),
      game({ mode: 'multi', roomCode: 'ABC234', score: undefined }),
      { gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: '2026-10-08', solved: true, attempts: 3, elapsedTime: 12000, playedAt: now() },
      { gameType: 'QUIZ', mode: 'daily', dailyKey: '2026-10-08', solved: false, attempts: 5, hints: 2, elapsedTime: 12000, playedAt: now() },
      { gameType: 'RANKING', mode: 'daily', dailyKey: '2026-10-08', score: 840, solved: true, attempts: 2, totalError: 31, playedAt: now() },
      { gameType: 'VOYAGE_VOYAGE', mode: 'daily', dailyKey: '2026-10-08', score: 70, solved: true, attempts: 6, optimal: 5, errors: 1, hints: 0, playedAt: now() },
      { gameType: 'QUIZ', mode: 'infinite', score: 40, correct: 8, answered: 10, bestStreak: 5, difficulty: 'Difficile', playedAt: now() },
      { gameType: 'COUNTRY_CLUE', mode: 'multi', roomCode: 'ABC234', found: 2, total: 3, elapsedTime: 33.5, playedAt: now() },
      { gameType: 'SURVIVAL', mode: 'survival', score: 14, total: 300, errors: 3, lives: 3, difficulty: 'FLAGS+QUIZ', elapsedTime: 98000, playedAt: now() },
    ]
    for (const record of records) await assertSucceeds(games().add(record))
  })

  it('records a daily game under its fixed id', async () => {
    const daily = { gameType: 'QUIZ', mode: 'daily', dailyKey: '2026-10-08', solved: true, attempts: 2, playedAt: now() }
    await assertSucceeds(as('alice').doc('users/alice/games/daily_QUIZ_2026-10-08').set(daily))
  })

  it('refuses unknown fields, wrong types, absurd values, a bad mode and a client-chosen date', async () => {
    await assertFails(games().add(game({ admin: true })))
    await assertFails(games().add(game({ mode: 'cheating' })))
    await assertFails(games().add(game({ gameType: 12 })))
    await assertFails(games().add(game({ score: 'many' })))
    await assertFails(games().add(game({ elapsedTime: -1 })))
    await assertFails(games().add(game({ found: 1e12 })))
    await assertFails(games().add(game({ solved: 'yes' })))
    await assertFails(games().add(game({ difficulty: 'x'.repeat(100) })))
    await assertFails(games().add(game({ playedAt: new Date(2020, 1, 1) })))
    await assertFails(games().add(game({ playedAt: undefined })))
  })

  it('refuses writing into another history, signed out, and editing a record', async () => {
    await assertFails(as('mallory').collection('users/alice/games').add(game()))
    await assertFails(anonymous().collection('users/alice/games').add(game()))
    const ref = await games().add(game())
    await assertFails(ref.update({ score: 999 }))
  })

  it('lets the owner delete the history, and anyone read it', async () => {
    const ref = await games().add(game())
    await assertSucceeds(anonymous().doc(ref.path).get())
    await assertFails(as('mallory').doc(ref.path).delete())
    await assertSucceeds(as('alice').doc(ref.path).delete())
  })
})

describe('leaderboard identity', () => {
  it('lets a signed-in account save a score under its username', async () => {
    await assertSucceeds(as('alice').collection('scores').add(score()))
  })

  it("refuses a score with another account's username, or without owning the uid", async () => {
    await assertFails(as('mallory').collection('scores').add(score()))
    await assertFails(as('mallory').collection('scores').add(score({ uid: 'mallory' })))
  })

  it('stops an account from faking its username in users/{uid} to publish scores', async () => {
    await assertFails(as('mallory').doc('users/mallory').set({ username: 'Alice', createdAt: now() }))
    await assertFails(as('mallory').collection('scores').add(score({ uid: 'mallory' })))
  })

  it('lets a visitor save under a free, normalized name', async () => {
    await assertSucceeds(anonymous().collection('scores').add(score({ name: 'Zoe', uid: undefined })))
    await assertSucceeds(anonymous().collection('scores').add(score({ name: 'Zoe Martin-Dupont', uid: undefined })))
  })

  it("refuses a visitor under an account's username, in any case or spacing", async () => {
    for (const name of ['Alice', 'alice', 'ALICE', 'Alice ', ' Alice', `Alice${NBSP}`, 'Alice\t']) {
      await assertFails(anonymous().collection('scores').add(score({ name, uid: undefined })))
    }
  })

  it('refuses a visitor name with double or edge whitespace', async () => {
    for (const name of ['Zoe ', ' Zoe', 'Zoe  Martin', `Zoe${NBSP}Martin`, 'Zoe\nMartin']) {
      await assertFails(anonymous().collection('scores').add(score({ name, uid: undefined })))
    }
  })

  it('applies the same visitor check to daily scores', async () => {
    const daily = (name) => ({ name, gameType: 'QUIZ', dailyKey: '2026-10-08', attempts: 3 })
    await assertSucceeds(anonymous().collection('daily_scores').add(daily('Zoe')))
    await assertFails(anonymous().collection('daily_scores').add(daily('Alice ')))
    await assertFails(anonymous().collection('daily_scores').add(daily('Zoe  Martin')))
  })
})

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

describe('public badges', () => {
  const badges = { top: ['streak_30', 'games_100'], count: 7 }

  it('lets an account publish its own badges, and anyone read them', async () => {
    await assertSucceeds(as('alice').doc('users/alice').update({ badges }))
    await assertSucceeds(as('alice').doc('users/alice').update({ badges: { top: [], count: 0 } }))
    await assertSucceeds(anonymous().doc('users/alice').get())
  })

  it("refuses someone else's badges, and a visitor's", async () => {
    await assertFails(as('mallory').doc('users/alice').update({ badges }))
    await assertFails(anonymous().doc('users/alice').update({ badges }))
  })

  it('refuses changing anything else along with the badges', async () => {
    await assertFails(as('alice').doc('users/alice').update({ badges, username: 'Bob' }))
    await assertFails(as('alice').doc('users/alice').update({ badges, admin: true }))
  })

  it('refuses malformed badges', async () => {
    const update = (value) => as('alice').doc('users/alice').update({ badges: value })
    await assertFails(update({ top: ['a', 'b', 'c', 'd'], count: 4 }))
    await assertFails(update({ top: [1], count: 1 }))
    await assertFails(update({ top: ['x'.repeat(41)], count: 1 }))
    await assertFails(update({ top: ['a'], count: -1 }))
    await assertFails(update({ top: ['a'], count: 201 }))
    await assertFails(update({ top: ['a'], count: 1.5 }))
    await assertFails(update({ top: ['a'], count: 1, extra: true }))
    await assertFails(update({ top: 'a', count: 1 }))
    await assertFails(update('streak_30'))
  })
})

describe('public challenges', () => {
  const challenges = ['capital_tour', 'hardcore_trio']

  it('lets an account store its own unlocked challenges, alone or with its badges', async () => {
    await assertSucceeds(as('alice').doc('users/alice').update({ challenges }))
    await assertSucceeds(as('alice').doc('users/alice').update({ challenges: [] }))
    await assertSucceeds(as('alice').doc('users/alice').update({ badges: { top: ['hardcore_trio'], count: 2 }, challenges }))
    await assertSucceeds(as('alice').doc('users/alice').update({ challenges: ['x'.repeat(40)] }))
    await assertSucceeds(as('alice').doc('users/alice').update({ challenges: Array.from({ length: 20 }, (_, i) => `c${i}`) }))
  })

  it("refuses someone else's challenges, and a visitor's", async () => {
    await assertFails(as('mallory').doc('users/alice').update({ challenges }))
    await assertFails(anonymous().doc('users/alice').update({ challenges }))
  })

  it('refuses malformed challenges', async () => {
    const update = (value) => as('alice').doc('users/alice').update({ challenges: value })
    await assertFails(update('capital_tour'))
    await assertFails(update([1]))
    await assertFails(update(['ok', { id: 'x' }]))
    await assertFails(update(['x'.repeat(41)]))
    await assertFails(update(Array.from({ length: 21 }, (_, i) => `c${i}`)))
    await assertFails(update({ capital_tour: true }))
  })

  it('refuses changing anything else along with the challenges', async () => {
    await assertFails(as('alice').doc('users/alice').update({ challenges, username: 'Bob' }))
    await assertFails(as('alice').doc('users/alice').update({ challenges, admin: true }))
  })
})

describe('community directory', () => {
  it('lets an account join with the server time, leave, and anyone list the members', async () => {
    await assertSucceeds(as('alice').doc('users/alice').update({ communityAt: now() }))
    await assertSucceeds(anonymous().collection('users').orderBy('communityAt', 'desc').limit(20).get())
    await assertSucceeds(as('alice').doc('users/alice').update({ communityAt: firebase.firestore.FieldValue.delete() }))
  })

  it('lets anyone search usernames by prefix', async () => {
    await assertSucceeds(
      as('bob').collection('usernames').orderBy(firebase.firestore.FieldPath.documentId()).startAt('al').endAt('al').limit(8).get()
    )
  })

  it("refuses someone else's membership, and a visitor's", async () => {
    await assertFails(as('mallory').doc('users/alice').update({ communityAt: now() }))
    await assertFails(anonymous().doc('users/alice').update({ communityAt: now() }))
  })

  it('refuses a made-up date, other values and extra fields', async () => {
    const update = (data) => as('alice').doc('users/alice').update(data)
    await assertFails(update({ communityAt: firebase.firestore.Timestamp.fromMillis(Date.now() + 86400000) }))
    await assertFails(update({ communityAt: true }))
    await assertFails(update({ communityAt: now(), username: 'Bob' }))
    await assertFails(update({ communityAt: now(), admin: true }))
  })
})

describe('top of the week', () => {
  it('can be read by anyone but written by no client', async () => {
    await env.withSecurityRulesDisabled((context) => context.firestore().doc('weeklyTop/current').set({ entries: [] }))
    await assertSucceeds(anonymous().doc('weeklyTop/current').get())
    await assertFails(as('alice').doc('weeklyTop/current').set({ entries: [{ uid: 'alice', points: 999 }] }))
    await assertFails(as('alice').doc('weeklyTop/current').delete())
    await assertFails(anonymous().doc('weeklyTop/current').set({ entries: [] }))
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

  it('accepts a Web Push subscription from the web app, and nothing else under it', async () => {
    const web = (subscription, platform = 'web') => ({ token: 'abc123', lang: 'fr', platform, subscription, updatedAt: now() })
    const subscription = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'key', auth: 'secret' } }
    const doc = (uid = 'alice') => as(uid).doc('users/alice/pushTokens/abc123')
    await assertSucceeds(doc().set(web(subscription)))
    await assertFails(doc('mallory').set(web(subscription)))
    await assertFails(doc().set(web(subscription, 'ios')))
    const { subscription: _, ...withoutSubscription } = web(subscription)
    await assertFails(doc().set(withoutSubscription))
    await assertFails(doc().set(web({ ...subscription, endpoint: 'http://web.push.apple.com/abc' })))
    await assertFails(doc().set(web({ ...subscription, extra: 1 })))
    await assertFails(doc().set(web({ ...subscription, keys: { ...subscription.keys, extra: 'x' } })))
  })

  it('lets the owner turn the daily reminder off on a device, as a boolean only', async () => {
    const ref = as('alice').doc('users/alice/pushTokens/ExponentPushToken[abc]')
    await assertSucceeds(ref.set(token()))
    await assertSucceeds(ref.update({ dailyReminder: false }))
    await assertFails(ref.update({ dailyReminder: 'no' }))
    await assertFails(as('mallory').doc('users/alice/pushTokens/ExponentPushToken[abc]').update({ dailyReminder: true }))
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

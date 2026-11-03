// @vitest-environment node
// api/weekly-top against the Firestore emulator (npm run test:emulator).
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import handler from '../../api/weekly-top.mjs'
import { LEAGUE_MIN_PLAYED, LEAGUE_REWARDS, computeWeeklyTop, refreshWeeklyTop, refreshWeeklyTopThrottled } from '../../api/_lib/weeklyTop.mjs'
import countriesMeta from '../../src/data/countries.meta.json'
import { flagPool, piecesOf, readFlags } from '../../src/utils/flagCollection.js'

const PROJECT = 'geogame-sdmm'
// Wednesday 14 October, 06:00 in Paris: the week under way is Monday 12 to Sunday 18 (2026-W42), the last one 5 to 11.
const NOW = Date.parse('2026-10-14T04:00:00Z')
const POOL = flagPool(countriesMeta.features)

let db

beforeAll(() => {
  db = getFirestore(getApps()[0] ?? initializeApp({ projectId: PROJECT }))
})

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
})

const daily = (uid, gameType, dailyKey, fields = {}) => ({ name: uid.toUpperCase(), uid, gameType, dailyKey, attempts: 3, elapsedTime: 10000, ...fields })

// How many flags a player has started or unlocked: 0 when no fragment was ever paid.
const collectedBy = async (uid) => {
  const flags = readFlags((await db.doc(`users/${uid}`).get()).data(), POOL)
  return { flags, started: flags.unlocked.length + (flags.current ? 1 : 0) }
}

describe('computeWeeklyTop', () => {
  it('gives a point for playing and a bonus for the podium of each challenge', () => {
    const top = computeWeeklyTop([
      daily('a', 'QUIZ', '2026-10-14', { attempts: 1 }),
      daily('b', 'QUIZ', '2026-10-14', { attempts: 2 }),
      daily('c', 'QUIZ', '2026-10-14', { attempts: 3 }),
      daily('d', 'QUIZ', '2026-10-14', { attempts: 4 }),
    ])
    expect(top.map(({ uid, points }) => [uid, points])).toEqual([['a', 6], ['b', 4], ['c', 3], ['d', 1]])
  })

  it('breaks daily ties on time, counts hints, and ranks Country Ranking by score then error', () => {
    const top = computeWeeklyTop([
      daily('slow', 'BORDER_GUESS', '2026-10-14', { elapsedTime: 9000 }),
      daily('fast', 'BORDER_GUESS', '2026-10-14', { elapsedTime: 4000 }),
      daily('hinted', 'BORDER_GUESS', '2026-10-14', { attempts: 2, hints: 2, elapsedTime: 1000 }),
      daily('low', 'RANKING', '2026-10-14', { score: 3, totalError: 1 }),
      daily('high', 'RANKING', '2026-10-14', { score: 5, totalError: 9 }),
    ])
    const points = Object.fromEntries(top.map((player) => [player.uid, player.points]))
    expect(points).toMatchObject({ fast: 6, slow: 4, hinted: 3, high: 6, low: 4 })
  })

  it('ranks the Daily Challenge and the Country of the Day on score then time, whatever the attempts', () => {
    for (const gameType of ['DAILY_CHALLENGE', 'COUNTRY_OF_DAY']) {
      const top = computeWeeklyTop([
        // The fewest attempts would win on the order of the other dailies.
        daily('few', gameType, '2026-10-14', { attempts: 0, score: 4, elapsedTime: 1000 }),
        daily('best', gameType, '2026-10-14', { attempts: 9, score: 10, elapsedTime: 9000 }),
        daily('quick', gameType, '2026-10-14', { attempts: 5, score: 10, elapsedTime: 3000 }),
      ])
      expect(top.map(({ uid, points }) => [uid, points])).toEqual([['quick', 6], ['best', 4], ['few', 3]])
    }
  })

  it('counts the best score of an account once per board, without skipping a rank', () => {
    const top = computeWeeklyTop([
      daily('a', 'QUIZ', '2026-10-14', { attempts: 1 }),
      daily('a', 'QUIZ', '2026-10-14', { attempts: 2 }),
      daily('a', 'QUIZ', '2026-10-14', { attempts: 3 }),
      daily('b', 'QUIZ', '2026-10-14', { attempts: 4 }),
      daily('c', 'QUIZ', '2026-10-14', { attempts: 5 }),
    ])
    expect(top.map(({ uid, points, played, golds }) => [uid, points, played, golds])).toEqual([
      ['a', 6, 1, 1],
      ['b', 4, 1, 0],
      ['c', 3, 1, 0],
    ])
  })

  it('adds up the week, leaves visitors out and breaks ties on golds then played', () => {
    const top = computeWeeklyTop([
      daily('a', 'QUIZ', '2026-10-13', { attempts: 1 }),
      daily('b', 'QUIZ', '2026-10-13', { attempts: 2 }),
      daily('b', 'QUIZ', '2026-10-14', { attempts: 1 }),
      daily('a', 'QUIZ', '2026-10-14', { attempts: 2 }),
      { name: 'Visitor', gameType: 'QUIZ', dailyKey: '2026-10-14', attempts: 0, elapsedTime: 1 },
    ])
    // Both have 6 + 4 = 10 points and one win each, and played twice: the name decides.
    expect(top.map(({ uid, points, golds, played }) => [uid, points, golds, played])).toEqual([
      ['a', 10, 1, 2],
      ['b', 10, 1, 2],
    ])
  })

  it('returns every player', () => {
    const scores = Array.from({ length: 30 }, (_, index) => daily(`p${index}`, 'QUIZ', '2026-10-14', { attempts: index }))
    expect(computeWeeklyTop(scores)).toHaveLength(30)
  })
})

describe('refreshWeeklyTop', () => {
  it('writes the week under way, Monday to today, and ignores last week and the days to come', async () => {
    await db.collection('daily_scores').add(daily('alice', 'QUIZ', '2026-10-14'))
    await db.collection('daily_scores').add(daily('bob', 'QUIZ', '2026-10-12'))
    // Last week, then days after today (forged keys).
    await db.collection('daily_scores').add(daily('carol', 'QUIZ', '2026-10-11'))
    await db.collection('daily_scores').add(daily('dave', 'QUIZ', '2026-10-15'))
    await db.collection('daily_scores').add(daily('erin', 'QUIZ', '2026-12-31'))
    expect(await refreshWeeklyTop({ db, now: NOW })).toMatchObject({ players: 2, scores: 2 })
    const top = (await db.doc('weeklyTop/current').get()).data()
    expect(top.entries.map((entry) => entry.uid).sort()).toEqual(['alice', 'bob'])
    expect(top.players.map((player) => player.uid).sort()).toEqual(['alice', 'bob'])
    expect(top).toMatchObject({ week: '2026-W42', from: '2026-10-12', to: '2026-10-18' })
  })

  it('keeps the top 20 in entries and every player in players', async () => {
    for (let index = 0; index < 25; index += 1) await db.collection('daily_scores').add(daily(`p${index}`, 'QUIZ', '2026-10-14', { attempts: index }))
    await refreshWeeklyTop({ db, now: NOW })
    const top = (await db.doc('weeklyTop/current').get()).data()
    expect(top.entries).toHaveLength(20)
    expect(top.players).toHaveLength(25)
  })
})

describe('refreshWeeklyTopThrottled', () => {
  const updatedAt = async () => (await db.doc('weeklyTop/current').get()).data().updatedAt.toMillis()

  it('refreshes once per window and tells when to retry', async () => {
    await db.collection('daily_scores').add(daily('alice', 'QUIZ', '2026-10-14'))
    expect(await refreshWeeklyTopThrottled({ db, now: NOW })).toMatchObject({ skipped: false, players: 1 })
    expect(await updatedAt()).toBe(NOW)

    await db.collection('daily_scores').add(daily('bob', 'QUIZ', '2026-10-14'))
    expect(await refreshWeeklyTopThrottled({ db, now: NOW + 10 * 1000 })).toEqual({ skipped: true, retryIn: 20000 })
    expect(await updatedAt()).toBe(NOW)

    expect(await refreshWeeklyTopThrottled({ db, now: NOW + 31 * 1000 })).toMatchObject({ skipped: false, players: 2 })
    expect(await updatedAt()).toBe(NOW + 31 * 1000)
  })
})

describe('refreshWeeklyTop, the end of the week', () => {
  // `uid` plays the QUIZ of days 5 to 10 October (the last week), with `attempts` attempts each.
  const playLastWeek = async (uid, attempts, gameType = 'QUIZ') => {
    for (let day = 5; day <= 10; day += 1) {
      await db.collection('daily_scores').add(daily(uid, gameType, `2026-10-${String(day).padStart(2, '0')}`, { attempts }))
    }
  }
  const account = (uid, extra = {}) => db.doc(`users/${uid}`).set({ username: uid, ...extra })

  it('uses fixed weeks: Sunday 11 October is the last week, Monday 12 the current one', async () => {
    await db.collection('daily_scores').add(daily('sun', 'QUIZ', '2026-10-11'))
    await db.collection('daily_scores').add(daily('mon', 'QUIZ', '2026-10-12'))
    expect((await refreshWeeklyTop({ db, now: NOW })).closed).toBe('2026-W41')
    expect((await db.doc('weeklyTop/last').get()).data().players.map((player) => player.uid)).toEqual(['sun'])
    expect((await db.doc('weeklyTop/current').get()).data().players.map((player) => player.uid)).toEqual(['mon'])
  })

  it('pays by rank, and a player under the minimum keeps their rank without passing the reward down', async () => {
    expect(LEAGUE_MIN_PLAYED).toBe(5)
    expect(Object.values(LEAGUE_REWARDS)).toEqual([10, 6, 4, 1, 1, 1, 1, 1, 1, 1])
    // p01 to p03 take the podium of the 6 boards, p04 to p11 tie behind them with 6 points each (the name decides).
    for (let rank = 1; rank <= 11; rank += 1) {
      const uid = `p${String(rank).padStart(2, '0')}`
      await account(uid)
      await playLastWeek(uid, rank)
    }
    // "few" played 2 boards only, alone on them: 12 points, rank 4.
    await account('few')
    await db.collection('daily_scores').add(daily('few', 'BORDER_GUESS', '2026-10-05'))
    await db.collection('daily_scores').add(daily('few', 'BORDER_GUESS', '2026-10-06'))

    await refreshWeeklyTop({ db, now: NOW })
    const last = (await db.doc('weeklyTop/last').get()).data()
    expect(last.week).toBe('2026-W41')
    expect(last.players.map((player) => [player.uid, player.reward])).toEqual([
      ['p01', 10], ['p02', 6], ['p03', 4], ['few', 0], ['p04', 1], ['p05', 1], ['p06', 1], ['p07', 1], ['p08', 1], ['p09', 1], ['p10', 0], ['p11', 0],
    ])
    expect(last.players[0]).toMatchObject({ name: 'P01', points: 36, played: 6, golds: 6 })
    expect((await collectedBy('p01')).started).toBeGreaterThan(0)
    expect((await collectedBy('p09')).started).toBeGreaterThan(0)
    for (const uid of ['few', 'p10', 'p11']) expect((await collectedBy(uid)).started).toBe(0)
  })

  it('pays exactly the fragments of the rank', async () => {
    await account('p1')
    await playLastWeek('p1', 1)
    await refreshWeeklyTop({ db, now: NOW })
    const { flags } = await collectedBy('p1')
    const pieces = flags.unlocked.reduce((sum, iso) => sum + piecesOf(iso, POOL), flags.pieces)
    expect(pieces).toBe(LEAGUE_REWARDS[1])
  })

  it('gives the champion title to rank 1 only, and adds to the wins they already have', async () => {
    await account('p1', { league: { wins: 2, lastWin: '2026-W30' } })
    await account('p2')
    await playLastWeek('p1', 1)
    await playLastWeek('p2', 2)
    await refreshWeeklyTop({ db, now: NOW })
    expect((await db.doc('users/p1').get()).data().league).toEqual({ wins: 3, lastWin: '2026-W41' })
    expect((await db.doc('users/p2').get()).data().league).toBeUndefined()
  })

  it('counts a first win from 1, and a second run does not count it twice', async () => {
    await account('p1')
    await playLastWeek('p1', 1)
    await refreshWeeklyTop({ db, now: NOW })
    await refreshWeeklyTop({ db, now: NOW + 3600 * 1000 })
    expect((await db.doc('users/p1').get()).data().league).toEqual({ wins: 1, lastWin: '2026-W41' })
  })

  it('gives no title when rank 1 played under the minimum, nor to the one behind', async () => {
    await account('few')
    await account('p2')
    // "few" wins 4 boards (24 points) and "p2" plays 5, beaten on 4 of them (4 * 4 + 6 = 22): rank 1 has too few games.
    for (let day = 5; day <= 9; day += 1) {
      const dailyKey = `2026-10-0${day}`
      if (day <= 8) await db.collection('daily_scores').add(daily('few', 'QUIZ', dailyKey, { attempts: 1 }))
      await db.collection('daily_scores').add(daily('p2', 'QUIZ', dailyKey, { attempts: 2 }))
    }
    await refreshWeeklyTop({ db, now: NOW })
    const last = (await db.doc('weeklyTop/last').get()).data()
    expect(last.players.map((player) => [player.uid, player.points, player.reward])).toEqual([['few', 24, 0], ['p2', 22, 6]])
    expect((await db.doc('users/few').get()).data().league).toBeUndefined()
    expect((await db.doc('users/p2').get()).data().league).toBeUndefined()
  })

  it('gives no title to a rank 1 without an account', async () => {
    await playLastWeek('nodoc', 1)
    await account('p2')
    await playLastWeek('p2', 2)
    await refreshWeeklyTop({ db, now: NOW })
    expect((await db.doc('users/nodoc').get()).exists).toBe(false)
    expect((await db.doc('users/p2').get()).data().league).toBeUndefined()
  })

  it('pays only once: a second run changes nothing', async () => {
    await account('p1')
    await playLastWeek('p1', 1)
    expect((await refreshWeeklyTop({ db, now: NOW })).closed).toBe('2026-W41')
    const before = await collectedBy('p1')
    expect(before.started).toBeGreaterThan(0)
    const { closedAt } = (await db.doc('weeklyTop/last').get()).data()
    expect((await refreshWeeklyTop({ db, now: NOW + 3600 * 1000 })).closed).toBeNull()
    expect(await collectedBy('p1')).toEqual(before)
    expect((await db.doc('weeklyTop/last').get()).data().closedAt.toMillis()).toBe(closedAt.toMillis())
  })

  it('skips a player without a user document or a username, and pays the others', async () => {
    await account('noname', { username: null })
    await account('real')
    await playLastWeek('nodoc', 1)
    await playLastWeek('noname', 2)
    await playLastWeek('real', 3)
    await refreshWeeklyTop({ db, now: NOW })
    const last = (await db.doc('weeklyTop/last').get()).data()
    expect(last.players.map((player) => [player.uid, player.reward])).toEqual([['nodoc', 0], ['noname', 0], ['real', 4]])
    expect((await db.doc('users/nodoc').get()).exists).toBe(false)
    expect((await db.doc('users/noname').get()).data().flags).toBeUndefined()
    expect((await collectedBy('real')).started).toBeGreaterThan(0)
  })

  it('writes an empty last week when nobody played', async () => {
    expect((await refreshWeeklyTop({ db, now: NOW })).closed).toBe('2026-W41')
    expect((await db.doc('weeklyTop/last').get()).data()).toMatchObject({ week: '2026-W41', players: [] })
    expect((await db.doc('weeklyTop/current').get()).data()).toMatchObject({ week: '2026-W42', players: [], entries: [] })
  })

  it('leaves an up-to-date last week alone', async () => {
    await db.doc('weeklyTop/last').set({ week: '2026-W41', players: [{ uid: 'kept', name: 'KEPT', points: 1, played: 1, golds: 0, reward: 0 }] })
    expect((await refreshWeeklyTop({ db, now: NOW })).closed).toBeNull()
    expect((await db.doc('weeklyTop/last').get()).data().players).toHaveLength(1)
  })
})

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

describe('GET /api/weekly-top', () => {
  it('refuses a call without the cron secret', async () => {
    process.env.CRON_SECRET = 'secret-for-tests'
    expect((await call()).statusCode).toBe(401)
    expect((await call({ authorization: 'Bearer nope' })).statusCode).toBe(401)
  })

  it('refuses to run without a configured secret', async () => {
    delete process.env.CRON_SECRET
    expect((await call({ authorization: 'Bearer undefined' })).statusCode).toBe(500)
  })

  it('refreshes the top for the cron', async () => {
    process.env.CRON_SECRET = 'secret-for-tests'
    const res = await call({ authorization: 'Bearer secret-for-tests' })
    expect(res.statusCode).toBe(200)
    expect((await db.doc('weeklyTop/current').get()).exists).toBe(true)
  })
})

// @vitest-environment node
// api/weekly-top against the Firestore emulator (npm run test:emulator).
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import handler from '../../api/weekly-top.mjs'
import { computeWeeklyTop, refreshWeeklyTop, weekKeys } from '../../api/_lib/weeklyTop.mjs'

const PROJECT = 'geogame-sdmm'
// 06:00 in Paris
const NOW = Date.parse('2026-10-14T04:00:00Z')

let db

beforeAll(() => {
  db = getFirestore(getApps()[0] ?? initializeApp({ projectId: PROJECT }))
})

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
})

const daily = (uid, gameType, dailyKey, fields = {}) => ({ name: uid.toUpperCase(), uid, gameType, dailyKey, attempts: 3, elapsedTime: 10000, ...fields })

describe('weekKeys', () => {
  it('lists the last 7 days of Paris, today included, oldest first', () => {
    expect(weekKeys(NOW)).toEqual(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14'])
  })
})

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

  it('keeps the best of the list only', () => {
    const scores = Array.from({ length: 30 }, (_, index) => daily(`p${index}`, 'QUIZ', '2026-10-14', { attempts: index }))
    expect(computeWeeklyTop(scores, 20)).toHaveLength(20)
  })
})

describe('refreshWeeklyTop', () => {
  it("writes the top of the last 7 days and ignores older days", async () => {
    await db.collection('daily_scores').add(daily('alice', 'QUIZ', '2026-10-14'))
    await db.collection('daily_scores').add(daily('bob', 'QUIZ', '2026-10-09'))
    await db.collection('daily_scores').add(daily('carol', 'QUIZ', '2026-10-01'))
    expect(await refreshWeeklyTop({ db, now: NOW })).toEqual({ players: 2, scores: 2 })
    const top = (await db.doc('weeklyTop/current').get()).data()
    expect(top.entries.map((entry) => entry.uid).sort()).toEqual(['alice', 'bob'])
    expect(top).toMatchObject({ from: '2026-10-08', to: '2026-10-14' })
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

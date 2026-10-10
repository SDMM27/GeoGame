// @vitest-environment node
// api/daily-reminder against the Firestore emulator (npm run test:emulator); the push services are faked.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { dailyKeyAt, reminderMessage, sendDailyReminders } from '../../api/_lib/dailyReminder.mjs'

const PROJECT = 'geogame-sdmm'
// 18:00 in Paris
const NOW = Date.parse('2026-10-10T16:00:00Z')
const TODAY = '2026-10-10'

let db

const fakeExpo = () =>
  vi.fn(async (url, options) => ({
    ok: true,
    json: async () => ({ data: JSON.parse(options.body).map(() => ({ status: 'ok' })) }),
  }))
const fakeWebPush = () => ({ sendNotification: vi.fn(async () => ({ statusCode: 201 })) })

const device = (uid, token, data = {}) =>
  db.doc(`users/${uid}/pushTokens/${token}`).set({ token, lang: 'fr', platform: 'android', ...data })

beforeAll(() => {
  db = getFirestore(getApps()[0] ?? initializeApp({ projectId: PROJECT }))
})

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
})

const run = (options = {}) => sendDailyReminders({ db, now: NOW, fetchImpl: fakeExpo(), ...options })
const recipients = (fetchImpl) => fetchImpl.mock.calls.flatMap(([, options]) => JSON.parse(options.body).map((message) => message.to))

describe('sendDailyReminders', () => {
  it("reminds the players who haven't played a daily challenge today, on each of their devices", async () => {
    await device('alice', 'ExponentPushToken[alice]')
    await device('alice', 'web-alice', { platform: 'web', subscription: { endpoint: 'https://web.push.apple.com/a', keys: { p256dh: 'k', auth: 'a' } } })
    await device('bob', 'ExponentPushToken[bob]', { lang: 'en' })
    // Bob played today's Border Guess; an older daily and today's non-daily games don't count for Alice.
    await db.doc('users/bob/games/daily-border').set({ gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: TODAY })
    await db.doc('users/alice/games/old').set({ gameType: 'BORDER_GUESS', mode: 'daily', dailyKey: '2026-10-09' })

    const fetchImpl = fakeExpo()
    const webPush = fakeWebPush()
    expect(await run({ fetchImpl, webPush })).toEqual({ players: 1, sent: 2 })
    expect(recipients(fetchImpl)).toEqual(['ExponentPushToken[alice]'])
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)[0]).toMatchObject({
      body: reminderMessage('fr'),
      data: { type: 'daily' },
      channelId: 'daily',
    })
    expect(webPush.sendNotification).toHaveBeenCalledOnce()
  })

  it('skips the devices where the reminder is turned off', async () => {
    await device('alice', 'ExponentPushToken[phone]', { dailyReminder: false })
    await device('alice', 'ExponentPushToken[tablet]', { dailyReminder: true })
    const fetchImpl = fakeExpo()
    await run({ fetchImpl })
    expect(recipients(fetchImpl)).toEqual(['ExponentPushToken[tablet]'])
  })

  it('reminds each player once a day, even if the cron runs twice', async () => {
    await device('alice', 'ExponentPushToken[alice]')
    expect((await run()).players).toBe(1)
    expect((await run()).players).toBe(0)
    expect((await run({ now: NOW + 24 * 60 * 60 * 1000 })).players).toBe(1)
  })
})

describe('dailyKeyAt', () => {
  it('changes day at midnight in Paris', () => {
    expect(dailyKeyAt(Date.parse('2026-10-10T21:59:00Z'))).toBe('2026-10-10')
    expect(dailyKeyAt(Date.parse('2026-10-10T22:01:00Z'))).toBe('2026-10-11')
  })
})

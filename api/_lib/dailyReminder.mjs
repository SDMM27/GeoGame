// Daily reminder of the daily challenges (api/daily-reminder.mjs, Vercel Cron), to the signed-in players who haven't
// played any of today's yet. Each device can turn it off: pushTokens/{token}.dailyReminder === false (set from the
// profile, mobile/src/notifications/device.ts). dailyReminderPushes/{uid} = { day }: last day reminded, server only,
// so a cron run that comes twice reminds nobody twice.
import { pushToDevices } from './push.mjs'

// Same day as the games' (src/utils/dailyKey.js): midnight in Paris.
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
export const dailyKeyAt = (now) => dayFormatter.format(new Date(now))

const BODY = {
  fr: 'Les défis du jour t’attendent, à toi de jouer !',
  en: 'Today’s challenges are waiting for you!',
  ru: 'Задания дня ждут тебя!',
  es: '¡Los retos del día te esperan, te toca jugar!',
  pt: 'Os desafios do dia estão te esperando, é sua vez!',
  de: 'Die Tageschallenges warten auf dich, du bist dran!',
  it: 'Le sfide del giorno ti aspettano, tocca a te!',
  uk: 'Завдання дня чекають на тебе!',
}

export const reminderMessage = (lang) => BODY[lang] ?? BODY.en

// Players handled at once.
const BATCH = 10

export async function sendDailyReminders({ db, now = Date.now(), fetchImpl = fetch, accessToken, webPush = null }) {
  const day = dailyKeyAt(now)
  const tokens = await db.collectionGroup('pushTokens').get()
  const devicesByUid = new Map()
  for (const device of tokens.docs) {
    if (device.data().dailyReminder === false) continue
    const uid = device.ref.parent.parent.id
    devicesByUid.set(uid, [...(devicesByUid.get(uid) ?? []), device])
  }

  const result = { players: 0, sent: 0 }
  const entries = [...devicesByUid]
  for (let start = 0; start < entries.length; start += BATCH) {
    await Promise.all(
      entries.slice(start, start + BATCH).map(async ([uid, devices]) => {
        const reminded = await db.doc(`dailyReminderPushes/${uid}`).get()
        if (reminded.exists && reminded.data().day === day) return
        const games = await db.collection(`users/${uid}/games`).where('dailyKey', '==', day).get()
        if (games.docs.some((game) => game.data().mode === 'daily')) return
        // Claimed before sending: a failed push isn't retried, a doubled run doesn't send twice.
        await db.doc(`dailyReminderPushes/${uid}`).set({ day })
        const { body } = await pushToDevices({
          devices,
          message: (lang) => ({ body: reminderMessage(lang), data: { type: 'daily' } }),
          channelId: 'daily',
          fetchImpl,
          accessToken,
          webPush,
        })
        result.players += 1
        result.sent += body.sent ?? 0
      })
    )
  }
  return result
}

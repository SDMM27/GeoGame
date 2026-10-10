// GET /api/daily-reminder, called once a day by Vercel Cron (see "crons" in vercel.json) with
// Authorization: Bearer <CRON_SECRET>. Reminds the players who haven't played today's daily challenges yet
// (see _lib/dailyReminder.mjs). Env: CRON_SECRET as for api/cleanup-expired, the rest as for api/invite-push
// (api/_lib/pushHandler.mjs).
import { getFirestore } from 'firebase-admin/firestore'

import { isCronAuthorized } from './_lib/cronAuth.mjs'
import { sendDailyReminders } from './_lib/dailyReminder.mjs'
import { adminApp, webPushClient } from './_lib/pushHandler.mjs'

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  // Without a secret, anyone could send the reminders: refuse rather than run open.
  if (!secret) return res.status(500).json({ error: 'not_configured' })
  if (!isCronAuthorized(req.headers.authorization, secret)) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const result = await sendDailyReminders({
      db: getFirestore(adminApp()),
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      webPush: webPushClient(),
    })
    console.log('[daily-reminder]', result)
    return res.status(200).json(result)
  } catch (error) {
    console.error('[daily-reminder]', error)
    return res.status(500).json({ error: 'internal' })
  }
}

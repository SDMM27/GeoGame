// GET /api/weekly-top, called once a day by Vercel Cron (see "crons" in vercel.json) with
// Authorization: Bearer <CRON_SECRET>. Recomputes the top of the week (see _lib/weeklyTop.mjs).
// Env as for api/cleanup-expired: CRON_SECRET, FIREBASE_SERVICE_ACCOUNT (or the emulator host).
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import { isCronAuthorized } from './_lib/cronAuth.mjs'
import { refreshWeeklyTop } from './_lib/weeklyTop.mjs'

function adminApp() {
  if (getApps().length) return getApps()[0]
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'geogame-sdmm' })
  return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret) return res.status(500).json({ error: 'not_configured' })
  if (!isCronAuthorized(req.headers.authorization, secret)) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const result = await refreshWeeklyTop({ db: getFirestore(adminApp()) })
    console.log('[weekly-top]', result)
    return res.status(200).json(result)
  } catch (error) {
    console.error('[weekly-top]', error)
    return res.status(500).json({ error: 'internal' })
  }
}

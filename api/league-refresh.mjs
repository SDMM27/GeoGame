// POST /api/league-refresh  with  Authorization: Bearer <Firebase ID token>
// Recomputes the weekly league after a daily score (src/utils/saveScore.js), at most once every REFRESH_INTERVAL_MS
// (_lib/weeklyTop.mjs). Env: FIREBASE_SERVICE_ACCOUNT as for api/xp. Against the emulators,
// FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST replace the key.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { refreshWeeklyTopThrottled } from './_lib/weeklyTop.mjs'

function adminApp() {
  if (getApps().length) return getApps()[0]
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'geogame-sdmm' })
  return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

export default async function handler(req, res) {
  // Called from the app and the web app (another origin); authenticated by the bearer token, no cookies.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const app = adminApp()
    const idToken = req.headers.authorization?.replace(/^Bearer /, '')
    const uid = idToken ? await getAuth(app).verifyIdToken(idToken).then((decoded) => decoded.uid, () => null) : null
    if (!uid) return res.status(401).json({ error: 'unauthorized' })
    return res.status(200).json(await refreshWeeklyTopThrottled({ db: getFirestore(app) }))
  } catch (error) {
    console.error('[league-refresh]', error)
    return res.status(500).json({ error: 'internal' })
  }
}

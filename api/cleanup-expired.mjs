// GET /api/cleanup-expired, called once a day by Vercel Cron (see "crons" in vercel.json) with
// Authorization: Bearer <CRON_SECRET>. Deletes expired rooms, invites and probes (see _lib/cleanupExpired.mjs), and
// accounts unused for 3 years (deleteInactiveAccounts in _lib/deleteAccount.mjs).
// Env: CRON_SECRET (any long random string, set in the Vercel project), FIREBASE_SERVICE_ACCOUNT as for
// api/invite-push. Against the emulators, FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST replace the key.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { cleanupExpired } from './_lib/cleanupExpired.mjs'
import { isCronAuthorized } from './_lib/cronAuth.mjs'
import { deleteInactiveAccounts } from './_lib/deleteAccount.mjs'

function adminApp() {
  if (getApps().length) return getApps()[0]
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'geogame-sdmm' })
  return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  // Without a secret, anyone could trigger the cleanup: refuse rather than run open.
  if (!secret) return res.status(500).json({ error: 'not_configured' })
  if (!isCronAuthorized(req.headers.authorization, secret)) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const app = adminApp()
    const db = getFirestore(app)
    const deleted = { ...(await cleanupExpired({ db })), ...(await deleteInactiveAccounts({ db, auth: getAuth(app) })) }
    console.log('[cleanup-expired]', deleted)
    return res.status(200).json({ deleted })
  } catch (error) {
    console.error('[cleanup-expired]', error)
    return res.status(500).json({ error: 'internal' })
  }
}

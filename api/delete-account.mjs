// POST /api/delete-account  with  Authorization: Bearer <Firebase ID token, right after signing in again>
// Deletes the account and all its data (see _lib/deleteAccount.mjs). Called by deleteAccount in src/utils/account.js,
// from the site and the app. Env: FIREBASE_SERVICE_ACCOUNT as for api/invite-push. Against the emulators,
// FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST replace the key.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { deleteAccount } from './_lib/deleteAccount.mjs'

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
    const { status, body } = await deleteAccount({
      db: getFirestore(app),
      auth: getAuth(app),
      idToken: req.headers.authorization?.replace(/^Bearer /, ''),
    })
    return res.status(status).json(body)
  } catch (error) {
    console.error('[delete-account]', error)
    return res.status(500).json({ error: 'internal' })
  }
}

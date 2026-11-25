// POST /api/migrate-session  { refreshToken }  ->  { token }: a custom token for the account of a session left by the
// Firebase JS SDK, so that the app (React Native Firebase) can sign in again silently (see _lib/migrateSession.mjs).
// Env: FIREBASE_SERVICE_ACCOUNT as for api/invite-push. Against the emulators, FIRESTORE_EMULATOR_HOST /
// FIREBASE_AUTH_EMULATOR_HOST replace the key.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

import { migrateSession } from './_lib/migrateSession.mjs'
import usernameAccountHandler from './_lib/usernameAccountRoute.mjs'

function adminApp() {
  if (getApps().length) return getApps()[0]
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'geogame-sdmm' })
  return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

export default async function handler(req, res) {
  // The Vercel rewrite shares this function with /api/username-account to stay within the function limit.
  if (req.query?.flow === 'username-account') return usernameAccountHandler(req, res)
  // Called from the app (another origin); the refresh token in the body is the credential, no cookies.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { status, body } = await migrateSession({ auth: getAuth(adminApp()), refreshToken: req.body?.refreshToken })
    return res.status(status).json(body)
  } catch (error) {
    console.error('[migrate-session]', error)
    return res.status(500).json({ error: 'internal' })
  }
}

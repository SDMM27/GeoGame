// GET /api/username-account advertises availability; POST handles signup, signin and recovery.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { usernameAccount } from './usernameAccount.mjs'
import { usernameRequestIp } from './usernameAccountPolicy.mjs'
import { getUsernamePasswordProvider } from './usernameAccountProvider.mjs'
import { issueUsernameFirebaseToken, USERNAME_TOKEN_EXCHANGE_SECONDS } from './usernameAccountToken.mjs'

function adminApp() {
  if (getApps().length) return getApps()[0]
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'geogame-sdmm' })
  return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

export default async function usernameAccountRoute(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const provider = getUsernamePasswordProvider()
    if (req.method === 'GET') return res.status(200).json({ available: Boolean(provider) })
    if (!provider) return res.status(503).json({ error: 'not_enabled' })
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) {
      return res.status(415).json({ error: 'generic' })
    }
    const app = adminApp()
    const auth = getAuth(app)
    const { status, body } = await usernameAccount({
      db: getFirestore(app),
      auth,
      provider,
      issueToken: (uid) => issueUsernameFirebaseToken(auth, uid),
      exchangeWindowSeconds: process.env.FIREBASE_AUTH_EMULATOR_HOST ? 0 : USERNAME_TOKEN_EXCHANGE_SECONDS,
      ip: usernameRequestIp(req),
      body: req.body,
      idToken: req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1],
    })
    return res.status(status).json(body)
  } catch (error) {
    if (error?.code === 'too_many_requests') return res.status(429).json({ error: 'too_many_requests' })
    // Provider errors may carry request details. Never log credentials or raw error objects here.
    console.error('[username-account] request failed')
    return res.status(503).json({ error: 'generic' })
  }
}

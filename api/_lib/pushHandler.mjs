// Vercel handler shared by the push endpoints (api/invite-push, api/friend-push): CORS, firebase-admin, Web Push keys.
// Env: FIREBASE_SERVICE_ACCOUNT (the service account key JSON), EXPO_ACCESS_TOKEN (optional, if Expo's enhanced push
// security is on), VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (Web Push to the web app, optional:
// `npx web-push generate-vapid-keys`; the public key is also EXPO_PUBLIC_VAPID_PUBLIC_KEY in the web app). Against the
// emulators, FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST replace the key.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import webPush from 'web-push'

function adminApp() {
  if (getApps().length) return getApps()[0]
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'geogame-sdmm' })
  return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

function webPushClient() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null
  webPush.setVapidDetails(VAPID_SUBJECT || 'https://geo-game-delta.vercel.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  return webPush
}

// `send({ db, auth, idToken, body, accessToken, webPush })` returns the { status, body } reply.
export function pushHandler(name, send) {
  return async function handler(req, res) {
    // Called from the website, the app and the web app (another origin); authenticated by the bearer token, no cookies.
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    if (req.method === 'OPTIONS') return res.status(204).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

    try {
      const app = adminApp()
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
      const { status, body: result } = await send({
        db: getFirestore(app),
        auth: getAuth(app),
        idToken: req.headers.authorization?.replace(/^Bearer /, ''),
        body,
        accessToken: process.env.EXPO_ACCESS_TOKEN,
        webPush: webPushClient(),
      })
      return res.status(status).json(result)
    } catch (error) {
      console.error(`[${name}]`, error)
      return res.status(500).json({ error: 'internal' })
    }
  }
}

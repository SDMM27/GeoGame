// One-time carry-over of a session signed in with the Firebase JS SDK (expo-sqlite storage) to React Native Firebase,
// which can't read it: without this, every existing user would be signed out once.
// The legacy refresh token goes to /api/migrate-session, which answers with a custom token for the same account.
import { signInWithCustomToken, type Auth } from 'firebase/auth'
import Storage from 'expo-sqlite/kv-store'

import { FIREBASE_API_KEY } from '@shared/Firebase'

import { API_ORIGIN } from '@/links'

const LEGACY_KEY = `firebase:authUser:${FIREBASE_API_KEY}:[DEFAULT]`
const REQUEST_TIMEOUT_MS = 10000

async function readRefreshToken(): Promise<string | null> {
  try {
    const raw = await Storage.getItem(LEGACY_KEY)
    return raw ? (JSON.parse(raw)?.stsTokenManager?.refreshToken ?? null) : null
  } catch {
    return null
  }
}

const forgetLegacySession = () => Storage.removeItem(LEGACY_KEY).catch(() => {})

async function migrate(auth: Auth): Promise<void> {
  try {
    await auth.authStateReady()
    if (auth.currentUser) return void (await forgetLegacySession())
    const refreshToken = await readRefreshToken()
    if (!refreshToken) return

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${API_ORIGIN}/api/migrate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    if (response.status === 200) {
      const { token } = await response.json()
      await signInWithCustomToken(auth, token)
      await forgetLegacySession()
    } else if (response.status === 401) {
      // Dead session (expired, revoked, account deleted): nothing to retry. Any other answer (404 before the endpoint
      // is deployed, 429, 5xx...) keeps the session for the next launch.
      await forgetLegacySession()
    }
  } catch {
    // Offline or server trouble: the legacy session stays for the next launch.
  }
}

let migration: Promise<void> | null = null

// Runs once per process; never rejects.
export const migrateLegacySession = (auth: Auth): Promise<void> => (migration ??= migrate(auth))

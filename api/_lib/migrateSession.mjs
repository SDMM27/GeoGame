// Carrying a session over from the Firebase JS SDK to React Native Firebase (the app's native auth): the app sends the
// refresh token of its old session, and gets a custom token for the same account to sign in with. Called by
// POST /api/migrate-session. The refresh token is exchanged here, so a token that is dead or revoked gets nothing.

// Public key of the web app (same as src/Firebase.js): identifies the project, grants nothing by itself.
const WEB_API_KEY = 'AIzaSyAe2bQDVUJUX9wicXL_BvSF8SQKj0xlTWQ'

const reply = (status, body) => ({ status, body })

function tokenUrl(env) {
  const key = env.FIREBASE_WEB_API_KEY || WEB_API_KEY
  const emulator = env.FIREBASE_AUTH_EMULATOR_HOST
  return emulator
    ? `http://${emulator}/securetoken.googleapis.com/v1/token?key=${key}`
    : `https://securetoken.googleapis.com/v1/token?key=${key}`
}

// `auth`: firebase-admin Auth. `fetchImpl` and `env` can be replaced by tests.
export async function migrateSession({ auth, refreshToken, fetchImpl = fetch, env = process.env }) {
  if (typeof refreshToken !== 'string' || !refreshToken) return reply(401, { error: 'unauthenticated' })

  let response
  try {
    response = await fetchImpl(tokenUrl(env), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
    })
  } catch (error) {
    console.error('[migrate-session]', error)
    return reply(500, { error: 'internal' })
  }
  // 400 for an invalid or expired token, a deleted or disabled account...
  if (response.status >= 400 && response.status < 500) return reply(401, { error: 'unauthenticated' })
  if (!response.ok) return reply(500, { error: 'internal' })

  const { id_token: idToken } = await response.json().catch(() => ({}))
  if (!idToken) return reply(500, { error: 'internal' })

  let decoded
  try {
    // checkRevoked: a session revoked since (password change, sign-out everywhere) isn't carried over.
    decoded = await auth.verifyIdToken(idToken, true)
    // Modern username/password sessions already use the native SDK. They must not be exchanged
    // for a migration token with a longer lifetime than their own sign-in bridge issues.
    if (decoded.geogameUsernamePassword === true) return reply(401, { error: 'unauthenticated' })
  } catch {
    return reply(401, { error: 'unauthenticated' })
  }
  return reply(200, { token: await auth.createCustomToken(decoded.uid) })
}

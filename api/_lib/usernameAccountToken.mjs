import { sign } from 'node:crypto'

const FIREBASE_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit'
export const USERNAME_TOKEN_EXCHANGE_SECONDS = 30
const claims = { geogameUsernamePassword: true }
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

// The Admin SDK uses a one-hour expiry for custom tokens. This password bridge only needs
// enough time for the client to exchange the token, which narrows the window after a reset.
export function issueUsernameFirebaseToken(auth, uid, env = process.env, now = Date.now()) {
  if (env.FIREBASE_AUTH_EMULATOR_HOST) return auth.createCustomToken(uid, claims)
  const { client_email: email, private_key: privateKey, private_key_id: keyId } = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const issuedAt = Math.floor(now / 1000)
  const header = encode({ alg: 'RS256', typ: 'JWT', kid: keyId })
  const payload = encode({
    iss: email, sub: email, aud: FIREBASE_AUDIENCE, iat: issuedAt, exp: issuedAt + USERNAME_TOKEN_EXCHANGE_SECONDS, uid,
    claims,
  })
  const unsigned = `${header}.${payload}`
  const signature = sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')
  return `${unsigned}.${signature}`
}

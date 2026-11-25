import { signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth'

export { USERNAME_PASSWORD_MIN, USERNAME_PASSWORD_MAX } from './usernamePasswordLimits.mjs'

const PATH = '/api/username-account'
// Branch previews (geo-game-git-<branch>-…) and deployment previews (geo-game-<id>-…) both end in -sdmms-projects.vercel.app.
const SITE_PREVIEW_HOST = /^geo-game-(?:git-[a-z0-9-]+|[a-z0-9]+)-sdmms-projects\.vercel\.app$/
const SITE_ORIGIN = 'https://geo-game.app'
const API_ERRORS = new Set([
  'username_length', 'username_chars', 'username_forbidden', 'username_taken',
  'wrong_credentials', 'not_enabled', 'too_many_requests', 'password_compromised', 'invalid_recovery_code',
  'invalid_email', 'link_email_in_use', 'link_email_expired', 'link_email_unverified', 'link_email_exists', 'link_email_finish',
])

export class UsernameAccountError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

// Branch previews use the shared Firebase project, but its server credentials stay in production.
export function usernameAccountApiOrigin(hostname = globalThis.location?.hostname) {
  return SITE_PREVIEW_HOST.test(hostname) ? SITE_ORIGIN : ''
}

export async function usernameAccountAvailable(apiOrigin = usernameAccountApiOrigin()) {
  try {
    const response = await fetch(`${apiOrigin}${PATH}`)
    return response.ok && (await response.json()).available === true
  } catch {
    return false
  }
}

async function request(action, { username, password, recoveryCode, email, apiOrigin = usernameAccountApiOrigin() }, idToken) {
  const headers = { 'Content-Type': 'application/json' }
  if (idToken) headers.Authorization = `Bearer ${idToken}`
  const response = await fetch(`${apiOrigin}${PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, username, password, recoveryCode, email }),
  }).catch(() => { throw new UsernameAccountError('network') })
  const data = await response.json().catch(() => null)
  if (response.ok && data) return data
  const code = data?.error
  if (code === 'weak_password') throw new UsernameAccountError('username_weak_password')
  if (API_ERRORS.has(code)) throw new UsernameAccountError(code)
  if (response.status === 401) throw new UsernameAccountError('wrong_credentials')
  throw new UsernameAccountError('generic')
}

async function requestRecoveryCode(action, credentials, idToken) {
  const { recoveryCode } = await request(action, credentials, idToken)
  if (typeof recoveryCode !== 'string' || !recoveryCode) throw new UsernameAccountError('generic')
  return recoveryCode
}

export const signUpWithUsername = (credentials) => requestRecoveryCode('signup', credentials)
export const recoverUsernameAccount = (credentials) => requestRecoveryCode('recover', credentials)

export async function signInWithUsername(auth, credentials) {
  const { token, uid, email } = await request('signin', credentials)
  if (typeof uid !== 'string' || !uid) throw new UsernameAccountError('generic')
  if (credentials.expectedUid && (uid !== credentials.expectedUid || auth.currentUser?.uid !== uid)) {
    throw new UsernameAccountError('wrong_credentials')
  }
  if (typeof email === 'string' && email) {
    const { user } = await signInWithEmailAndPassword(auth, email, credentials.password)
    if (user.uid !== uid) {
      await signOut(auth).catch(() => {})
      throw new UsernameAccountError('wrong_credentials')
    }
    return
  }
  if (typeof token !== 'string' || !token) throw new UsernameAccountError('generic')
  await signInWithCustomToken(auth, token)
}

export async function rotateUsernameRecoveryCode(auth, credentials) {
  if (!auth.currentUser) throw new UsernameAccountError('wrong_credentials')
  return requestRecoveryCode('rotate', credentials, await auth.currentUser.getIdToken())
}

async function requestEmailLink(auth, action, credentials) {
  if (!auth.currentUser) throw new UsernameAccountError('wrong_credentials')
  return request(action, credentials, await auth.currentUser.getIdToken())
}

export const usernameEmailStatus = (auth, credentials) => requestEmailLink(auth, 'email-status', credentials)
export const startUsernameEmailLink = (auth, credentials) => requestEmailLink(auth, 'email-start', credentials)
export const finishUsernameEmailLink = (auth, credentials) => requestEmailLink(auth, 'email-finish', credentials)

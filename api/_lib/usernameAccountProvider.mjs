import { randomBytes } from 'node:crypto'

import { WEB_API_KEY } from './migrateSession.mjs'
import { usernameCredentialUid } from './usernameCredentialUid.mjs'

const ALIAS_DOMAIN = 'accounts.geogame.invalid'
const ALIAS = /^[0-9a-f]{48}@accounts\.geogame\.invalid$/
const TIMEOUT_MS = 8000
const INVALID_PROOF = new Set(['EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'INVALID_LOGIN_CREDENTIALS', 'USER_DISABLED'])
const EXPIRED_PROOF = new Set(['CREDENTIAL_TOO_OLD_LOGIN_AGAIN', 'TOKEN_EXPIRED', 'INVALID_ID_TOKEN', 'USER_NOT_FOUND', 'USER_DISABLED'])
const THROTTLED = new Set(['QUOTA_EXCEEDED', 'TOO_MANY_ATTEMPTS_TRY_LATER', 'TOO_MANY_REQUESTS'])

function providerError(code) {
  const failure = new Error('Username credential provider error')
  if (THROTTLED.has(code) || code === 'auth/too-many-requests') failure.code = 'too_many_requests'
  return failure
}

export function identityToolkitUrl(env, action) {
  const host = env.FIREBASE_AUTH_EMULATOR_HOST
    ? `http://${env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com'
  const key = encodeURIComponent(env.FIREBASE_WEB_API_KEY || WEB_API_KEY)
  return `${host}/v1/accounts:${action}?key=${key}`
}

export function getUsernamePasswordProvider(auth, env = process.env, fetchImpl = fetch) {
  async function getCredential(uid) {
    let user
    try {
      user = await auth.getUser(uid)
    } catch (error) {
      if (error?.code === 'auth/user-not-found') return null
      throw providerError(error?.code)
    }
    if (user.uid !== uid || !ALIAS.test(user.email ?? '')) throw providerError()
    return user
  }

  async function create(uid, password) {
    try {
      await auth.createUser({
        uid, email: `${randomBytes(24).toString('hex')}@${ALIAS_DOMAIN}`, password: password.normalize('NFC'),
      })
    } catch (error) {
      throw providerError(error?.code)
    }
  }

  async function request(action, body, invalidCodes) {
    let response
    let result
    try {
      response = await fetchImpl(identityToolkitUrl(env, action), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      result = await response.json()
    } catch {
      throw providerError()
    }
    if (!response.ok) {
      const message = result?.error?.message
      const code = typeof message === 'string' ? message.split(' : ')[0] : undefined
      if ([400, 401].includes(response.status) && invalidCodes.has(code)) return null
      throw providerError(response.status === 429 ? 'TOO_MANY_REQUESTS' : code)
    }
    if (!result || typeof result !== 'object') throw providerError()
    return result
  }

  async function signIn(credential, password) {
    const result = await request('signInWithPassword', { email: credential.email, password, returnSecureToken: true }, INVALID_PROOF)
    if (result && result.localId !== credential.uid) throw providerError()
    return result
  }

  async function getLinkedIdentity(uid, email) {
    const identity = await auth.getUser(uid).catch((error) => {
      if (error?.code === 'auth/user-not-found') return null
      throw error
    })
    return identity?.emailVerified && identity.email?.toLowerCase() === email ? identity : null
  }

  return {
    create: async (uid, password) => create(usernameCredentialUid(uid), password),
    async verify(uid, password) {
      const credential = await getCredential(usernameCredentialUid(uid))
      return Boolean(credential && !credential.disabled && await signIn(credential, password.normalize('NFC')))
    },
    async verifyLinked(uid, email, password) {
      const identity = await getLinkedIdentity(uid, email)
      return identity ? !identity.disabled && Boolean(await signIn(identity, password)) : null
    },
    async setPassword(uid, password) {
      const credentialUid = usernameCredentialUid(uid)
      if (!await getCredential(credentialUid)) return create(credentialUid, password)
      try {
        await auth.updateUser(credentialUid, { password: password.normalize('NFC'), disabled: false })
      } catch (error) {
        if (error?.code === 'auth/user-not-found') return create(credentialUid, password)
        throw providerError(error?.code)
      }
    },
    async changePassword(uid, password) {
      const credentialUid = usernameCredentialUid(uid)
      const credential = await getCredential(credentialUid)
      if (!credential || credential.disabled) throw providerError()
      try {
        await auth.updateUser(credentialUid, { password: password.normalize('NFC') })
      } catch (error) {
        throw providerError(error?.code)
      }
      return true
    },
    async changeLinkedPassword(uid, email, password, newPassword) {
      const identity = await getLinkedIdentity(uid, email)
      if (!identity || identity.disabled) return false
      // A native email reset can race with our Firestore lease. Use a fresh password
      // sign-in and let Firebase enforce the validity of its proof at the write.
      const session = await signIn(identity, password)
      if (!session) return false
      if (!session.idToken) throw providerError()
      const result = await request('update', { idToken: session.idToken, password: newPassword, returnSecureToken: false }, EXPIRED_PROOF)
      if (result && result.localId !== uid) throw providerError()
      return Boolean(result)
    },
    async remove(uid) {
      const credentialUid = usernameCredentialUid(uid)
      if (!await getCredential(credentialUid)) return
      try {
        await auth.deleteUser(credentialUid)
      } catch (error) {
        if (error?.code !== 'auth/user-not-found') throw providerError(error?.code)
      }
    },
  }
}

import { randomBytes } from 'node:crypto'

import { WEB_API_KEY } from './migrateSession.mjs'
import { usernameCredentialUid } from './usernameCredentialUid.mjs'

const ALIAS_DOMAIN = 'accounts.geogame.invalid'
const ALIAS = /^[0-9a-f]{48}@accounts\.geogame\.invalid$/
const TIMEOUT_MS = 8000
const INVALID_PROOF = new Set(['EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'INVALID_LOGIN_CREDENTIALS', 'USER_DISABLED'])
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

  async function verifyPassword(credential, password) {
    let response
    let result
    try {
      response = await fetchImpl(identityToolkitUrl(env, 'signInWithPassword'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credential.email, password, returnSecureToken: true }),
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
      if (response.status === 400 && INVALID_PROOF.has(code)) return false
      throw providerError(response.status === 429 ? 'TOO_MANY_REQUESTS' : code)
    }
    // Retain only whether the UID matches. This request verifies the password for our backend.
    if (result?.localId !== credential.uid) throw providerError()
    return true
  }

  return {
    create: async (uid, password) => create(usernameCredentialUid(uid), password),
    async verify(uid, password) {
      const credential = await getCredential(usernameCredentialUid(uid))
      return Boolean(credential && !credential.disabled && await verifyPassword(credential, password.normalize('NFC')))
    },
    async verifyLinked(uid, email, password) {
      const identity = await auth.getUser(uid).catch((error) => {
        if (error?.code === 'auth/user-not-found') return null
        throw error
      })
      if (!identity || !identity.emailVerified || identity.email?.toLowerCase() !== email) return null
      if (identity.disabled) return false
      return verifyPassword(identity, password)
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
    async changePassword(uid, password, linkedEmail) {
      try {
        const credentialUid = linkedEmail ? uid : usernameCredentialUid(uid)
        const identity = linkedEmail ? await auth.getUser(uid) : await getCredential(credentialUid)
        if (!identity || identity.disabled
          || (linkedEmail && (!identity.emailVerified || identity.email?.toLowerCase() !== linkedEmail))) throw providerError()
        await auth.updateUser(credentialUid, { password: linkedEmail ? password : password.normalize('NFC') })
      } catch (error) {
        throw providerError(error?.code)
      }
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

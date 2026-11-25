// @vitest-environment node
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { afterAll, expect, it, vi } from 'vitest'

import { deleteAccount, deleteAccountData } from '../../api/_lib/deleteAccount.mjs'
import { migrateSession } from '../../api/_lib/migrateSession.mjs'
import { hasUsernameCredential, usernameAccount } from '../../api/_lib/usernameAccount.mjs'
import { checkRateLimit } from '../../api/_lib/usernameAccountPolicy.mjs'
import { getUsernamePasswordProvider } from '../../api/_lib/usernameAccountProvider.mjs'
import { usernameCredentialUid } from '../../api/_lib/usernameCredentialUid.mjs'

const app = initializeApp({ projectId: 'geogame-sdmm' }, 'username-account-integration')
const db = getFirestore(app)
const auth = getAuth(app)

afterAll(async () => {
  await db.terminate()
  await deleteApp(app)
})

function authRequest(action, data) {
  return fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, returnSecureToken: true }),
  })
}

async function latestEmailAction(type, email) {
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/geogame-sdmm/oobCodes`)
  const { oobCodes } = await response.json()
  return oobCodes.findLast((code) => code.requestType === type && (code.newEmail ?? code.email) === email).oobCode
}

it('links a verified email to the player UID and shares a single password across both recovery methods', async () => {
  const provider = getUsernamePasswordProvider(auth)
  const suffix = Date.now().toString(36)
  const username = `Atlas ${suffix}`
  const email = `atlas-${suffix}@example.test`
  const occupied = await auth.createUser({ email: `occupied-${suffix}@example.test`, password: 'legacy-example-password' })
  const initial = 'a single initial passphrase'
  const next = 'another passphrase from email reset'
  const recovered = 'another passphrase from the backup code'
  const call = (action, password, fields, idToken) => usernameAccount({
    db, auth, provider, idToken, allow: async () => true, validatePassword: async () => null,
    body: { action, username, password, ...fields },
  })
  const { body: { recoveryCode } } = await call('signup', initial)
  const { body: { token, uid } } = await call('signin', initial)
  try {
    const { idToken } = await (await authRequest('signInWithCustomToken', { token })).json()
    expect((await call('email-start', initial, { email })).status).toBe(401)
    expect((await call('email-start', 'incorrect', { email }, idToken)).status).toBe(401)
    expect(await call('email-start', initial, { email: occupied.email }, idToken)).toEqual({
      status: 409, body: { error: 'link_email_in_use' },
    })
    expect(await call('email-start', initial, { email: email.toUpperCase() }, idToken)).toEqual({
      status: 200, body: { pendingEmail: email },
    })
    expect(await call('email-status', undefined, {}, idToken)).toEqual({
      status: 200, body: { linkedEmail: null, pendingEmail: email },
    })
    expect((await call('email-finish', initial, {}, idToken)).body.error).toBe('link_email_unverified')
    expect((await auth.getUser(uid)).email).toBeUndefined()
    const verification = await latestEmailAction('VERIFY_AND_CHANGE_EMAIL', email)
    expect((await authRequest('update', { oobCode: verification })).ok).toBe(true)
    expect((await auth.getUserByEmail(email)).uid).toMatch(/^username-credential:/)
    expect((await auth.getUser(uid)).email).toBeUndefined()
    expect(await call('email-finish', initial, {}, idToken)).toEqual({ status: 200, body: { linkedEmail: email } })
    expect((await auth.getUserByEmail(email))).toMatchObject({ uid, emailVerified: true })
    await expect(auth.getUser(usernameCredentialUid(uid))).rejects.toMatchObject({ code: 'auth/user-not-found' })
    expect((await call('signin', initial)).body).toEqual({ uid, email })
    expect(await (await authRequest('signInWithPassword', { email, password: initial })).json()).toMatchObject({ localId: uid })

    expect((await authRequest('sendOobCode', { requestType: 'PASSWORD_RESET', email })).ok).toBe(true)
    const resetCode = await latestEmailAction('PASSWORD_RESET', email)
    expect((await authRequest('resetPassword', { oobCode: resetCode, newPassword: next })).ok).toBe(true)
    expect((await call('signin', initial)).status).toBe(401)
    expect((await call('signin', next)).body.uid).toBe(uid)
    expect(await (await authRequest('signInWithPassword', { email, password: next })).json()).toMatchObject({ localId: uid })

    const result = await call('recover', recovered, { recoveryCode })
    expect(result.status).toBe(200)
    expect(result.body.recoveryCode).not.toBe(recoveryCode)
    expect((await call('signin', next)).status).toBe(401)
    expect((await call('signin', recovered)).body.uid).toBe(uid)
    expect(await (await authRequest('signInWithPassword', { email, password: recovered })).json()).toMatchObject({ localId: uid })
    expect((await db.doc(`users/${uid}`).get()).data()).toMatchObject({ username, usernamePassword: true })
  } finally {
    await deleteAccountData({ db, auth, uid })
    await auth.deleteUser(occupied.uid)
  }
  await expect(auth.getUserByEmail(email)).rejects.toMatchObject({ code: 'auth/user-not-found' })
}, 30000)

it('restores username ownership after a native provider link or direct Auth erasure', async () => {
  const provider = getUsernamePasswordProvider(auth)
  const username = `Explorateur ${Date.now().toString(36)}`
  const initial = 'un chemin pour explorer les i\u0302les'
  const next = `${'🧭'.repeat(127)}!`
  const nativeProof = { email: `${Date.now()}@example.test`, password: 'native-provider-password' }
  const call = (action, password, fields) => usernameAccount({
    db, auth, provider, allow: vi.fn(async () => true), validatePassword: vi.fn(async () => null),
    body: { action, username, password, ...fields },
  })
  const { status, body: { recoveryCode } } = await call('signup', initial)
  expect(status).toBe(201)
  const { body: { token, uid } } = await call('signin', initial.normalize('NFC'))
  const credentialUid = usernameCredentialUid(uid)
  try {
    const credential = await auth.getUser(credentialUid)
    expect(credential.email).toMatch(/^[0-9a-f]{48}@accounts\.geogame\.invalid$/)
    expect(credential.emailVerified).toBe(false)
    expect((await db.doc(`users/${credentialUid}`).get()).exists).toBe(false)

    const response = await authRequest('signInWithCustomToken', { token })
    expect(response.ok).toBe(true)
    const { idToken } = await response.json()
    expect((await auth.verifyIdToken(idToken, true)).uid).toBe(uid)
    expect((await auth.getUser(uid)).email).toBeUndefined()
    expect((await db.doc(`users/${uid}`).get()).data()).toMatchObject({ username, usernamePassword: true })

    const linked = await authRequest('update', { idToken, ...nativeProof })
    expect(linked.ok).toBe(true)
    const nativeLogin = await authRequest('signInWithPassword', nativeProof)
    expect(nativeLogin.ok).toBe(true)
    const nativeSession = await nativeLogin.json()
    expect((await auth.verifyIdToken(nativeSession.idToken, true)).uid).toBe(uid)
    expect(await migrateSession({
      auth, refreshToken: nativeSession.refreshToken, isUsernameAccount: (targetUid) => hasUsernameCredential(db, targetUid),
    })).toMatchObject({ status: 401 })
    expect(await deleteAccount({ db, auth, idToken: nativeSession.idToken })).toEqual({
      status: 403, body: { error: 'requires_recent_login' },
    })

    const recovered = await call('recover', next, { recoveryCode })
    expect(recovered.status).toBe(200)
    expect(recovered.body.recoveryCode).not.toBe(recoveryCode)
    await expect(auth.verifyIdToken(idToken, true)).rejects.toThrow()
    await expect(auth.verifyIdToken(nativeSession.idToken, true)).rejects.toThrow()
    expect((await authRequest('signInWithPassword', nativeProof)).ok).toBe(false)
    const identity = await auth.getUser(uid)
    expect(identity.disabled).toBe(false)
    expect(identity.email).toBeUndefined()
    expect(identity.providerData).toEqual([])
    expect((await call('recover', initial, { recoveryCode })).status).toBe(401)
    expect((await call('signin', initial)).status).toBe(401)
    expect((await call('signin', next)).body.uid).toBe(uid)

    await auth.deleteUser(uid)
    await auth.deleteUser(credentialUid)
    const restored = await call('recover', initial, { recoveryCode: recovered.body.recoveryCode })
    expect(restored.status).toBe(200)
    expect((await auth.getUser(uid)).disabled).toBe(false)
    expect((await call('signin', initial)).body.uid).toBe(uid)
  } finally {
    await deleteAccountData({ db, auth, uid, getUsernameProvider: () => provider })
  }
  await expect(auth.getUser(credentialUid)).rejects.toMatchObject({ code: 'auth/user-not-found' })
  expect((await db.doc(`usernameCredentials/${uid}`).get()).exists).toBe(false)
  expect((await db.doc(`usernames/${username.toLowerCase()}`).get()).exists).toBe(false)
  await expect(auth.getUser(uid)).rejects.toMatchObject({ code: 'auth/user-not-found' })
})

it('shares rate limits across network addresses and renews them in the next time window', async () => {
  const now = Date.now()
  const key = `rate-test-${now}`
  const attempt = (index, time = now) => checkRateLimit(db, { ip: `192.0.2.${index + 1}`, key, action: 'signup' }, time)
  for (let index = 0; index < 6; index += 1) expect(await attempt(index)).toBe(true)
  expect(await attempt(6)).toBe(false)
  expect(await attempt(6, now + 15 * 60 * 1000)).toBe(true)
})

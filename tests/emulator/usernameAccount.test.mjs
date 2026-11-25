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
  vi.stubEnv('USERNAME_AUTH_PEPPER', 'a'.repeat(64))
  try {
    const now = Date.now()
    const key = `rate-test-${now}`
    const attempt = (index, time = now) => checkRateLimit(db, { ip: `192.0.2.${index + 1}`, key, action: 'signup' }, time)
    for (let index = 0; index < 6; index += 1) expect(await attempt(index)).toBe(true)
    expect(await attempt(6)).toBe(false)
    expect(await attempt(6, now + 15 * 60 * 1000)).toBe(true)
  } finally {
    vi.unstubAllEnvs()
  }
})

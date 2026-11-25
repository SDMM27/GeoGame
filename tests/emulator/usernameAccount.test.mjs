// @vitest-environment node
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { afterAll, expect, it, vi } from 'vitest'

import { deleteAccountData } from '../../api/_lib/deleteAccount.mjs'
import { usernameAccount } from '../../api/_lib/usernameAccount.mjs'
import { checkRateLimit } from '../../api/_lib/usernameAccountPolicy.mjs'

const app = initializeApp({ projectId: 'geogame-sdmm' }, 'username-account-integration')
const db = getFirestore(app)
const auth = getAuth(app)

afterAll(async () => {
  await db.terminate()
  await deleteApp(app)
})

it('creates a Firebase identity without email, recovers it across sessions, and deletes both accounts', async () => {
  const passwords = new Map()
  const provider = {
    create: async (uid, password) => passwords.set(uid, password),
    verify: async (uid, password) => passwords.get(uid) === password,
    setPassword: async (uid, password) => passwords.set(uid, password),
    remove: async (uid) => passwords.delete(uid),
  }
  const username = `Explorateur ${Date.now().toString(36)}`
  const initial = 'un chemin pour explorer les îles'
  const next = 'uniquement des alizés au retour'
  const call = (action, password, fields) => usernameAccount({
    db, auth, provider, allow: vi.fn(async () => true), validatePassword: vi.fn(async () => null),
    body: { action, username, password, ...fields },
  })
  const { status, body: { recoveryCode } } = await call('signup', initial)
  expect(status).toBe(201)
  const { body: { token, uid } } = await call('signin', initial)
  try {
    const response = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, returnSecureToken: true }) },
    )
    expect(response.ok).toBe(true)
    const { idToken } = await response.json()
    expect((await auth.verifyIdToken(idToken, true)).uid).toBe(uid)
    expect((await auth.getUser(uid)).email).toBeUndefined()
    expect((await db.doc(`users/${uid}`).get()).data()).toMatchObject({ username, usernamePassword: true })

    const recovered = await call('recover', next, { recoveryCode })
    expect(recovered.status).toBe(200)
    expect(recovered.body.recoveryCode).not.toBe(recoveryCode)
    await expect(auth.verifyIdToken(idToken, true)).rejects.toThrow()
    expect((await call('recover', initial, { recoveryCode })).status).toBe(401)
    expect((await call('signin', initial)).status).toBe(401)
    expect((await call('signin', next)).body.uid).toBe(uid)
  } finally {
    await deleteAccountData({ db, auth, uid, getUsernameProvider: () => provider })
  }
  expect(passwords.has(uid)).toBe(false)
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

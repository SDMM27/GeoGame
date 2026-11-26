// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

import { discardExpiredUsernameSignups, removeUsernameCredential, usernameAccount } from './usernameAccount.mjs'

const password = 'a long password for this test account'
const nextPassword = 'a different long password for recovery'
const username = 'Étoile du Nord'
const usernameKey = 'étoile du nord'

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

function fixtures({ exchangeWindowSeconds = 0 } = {}) {
  const docs = new Map()
  const clock = vi.fn(() => 1)
  const stored = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key, FieldValue.serverTimestamp().isEqual(value) ? Timestamp.fromMillis(clock()) : value,
  ]))
  const database = {
    doc(path) {
      const id = path.split('/').at(-1)
      const ref = {
        id, path,
        get: async () => {
          const data = docs.get(path)
          return { ref, exists: Boolean(data), data: () => data }
        },
        async create(data) {
          if (docs.has(path)) throw new Error('already exists')
          docs.set(path, stored(data))
        },
        delete: async () => docs.delete(path),
      }
      return ref
    },
    collection(path) {
      return {
        where: (key, operator, value) => ({
          limit: (limit) => ({
            get: async () => {
              if (operator !== '<=') throw new Error('unexpected query')
              const found = [...docs].filter(([name, data]) => name.startsWith(`${path}/`) && data[key] <= value).slice(0, limit)
              return {
                docs: await Promise.all(found.map(([name]) => database.doc(name).get())),
                empty: found.length === 0,
              }
            },
          }),
        }),
      }
    },
  }
  let queue = Promise.resolve()
  database.runTransaction = (action) => {
    const pending = queue.then(async () => {
      const writes = []
      const result = await action({
        get: (ref) => ref.get(),
        getAll: (...refs) => Promise.all(refs.map((ref) => ref.get())),
        create: (ref, data) => writes.push(() => ref.create(data)),
        set: (ref, data) => writes.push(() => docs.set(ref.path, stored(data))),
        update: (ref, data) => writes.push(() => docs.set(ref.path, { ...docs.get(ref.path), ...stored(data) })),
      })
      for (const write of writes) await write()
      return result
    })
    queue = pending.catch(() => {})
    return pending
  }
  const users = new Map()
  const auth = {
    createUser: vi.fn(async (user) => {
      const identity = { disabled: false, providerData: [], ...user }
      users.set(user.uid, identity)
      return identity
    }),
    deleteUser: vi.fn(async (uid) => users.delete(uid)),
    updateUser: vi.fn(async (uid, data) => {
      if (!users.has(uid)) throw Object.assign(new Error('missing user'), { code: 'auth/user-not-found' })
      const identity = { ...users.get(uid), ...data }
      users.set(uid, identity)
      return identity
    }),
    createCustomToken: vi.fn(async (uid) => `custom:${uid}`),
    verifyIdToken: vi.fn(async () => ({ uid: 'someone-else' })),
    revokeRefreshTokens: vi.fn(async () => {}),
  }
  const passwords = new Map()
  const provider = {
    create: vi.fn(async (uid, value) => passwords.set(uid, value)),
    verify: vi.fn(async (uid, value) => passwords.get(uid) === value),
    verifyLinked: vi.fn(async (uid, _email, value) => passwords.get(uid) === value),
    setPassword: vi.fn(async (uid, value) => passwords.set(uid, value)),
    changePassword: vi.fn(async (uid, value) => passwords.set(uid, value)),
    remove: vi.fn(async (uid) => passwords.delete(uid)),
  }
  const wait = vi.fn(async () => {})
  const allow = vi.fn(async () => true)
  const validatePassword = vi.fn(async () => null)
  const call = (action, body = {}, idToken) => usernameAccount({
    db: database, auth, provider, body: { action, username, password, ...body },
    ip: '127.0.0.1', clock, allow, validatePassword, idToken, wait, exchangeWindowSeconds,
  })
  return { db: database, docs, users, auth, passwords, provider, clock, allow, validatePassword, call, wait }
}

async function register(fixture) {
  const reply = await fixture.call('signup', { username: '  Étoile   du Nord  ' })
  expect(reply.status).toBe(201)
  const uid = fixture.docs.get(`usernames/${usernameKey}`).uid
  return { uid, code: reply.body.recoveryCode, credential: `usernameCredentials/${uid}` }
}

describe('username account', () => {
  it('requires a matching session and password to change the password without rotating the recovery code', async () => {
    const fixture = fixtures()
    const { uid, credential } = await register(fixture)
    const recoveryHash = fixture.docs.get(credential).recoveryHash
    const change = { newPassword: nextPassword }
    expect((await fixture.call('changePassword', change, 'other-session')).status).toBe(401)
    fixture.auth.verifyIdToken.mockResolvedValue({ uid })
    expect((await fixture.call('changePassword', { ...change, password: 'incorrect' }, 'session')).status).toBe(401)
    fixture.validatePassword.mockResolvedValueOnce('password_compromised')
    expect(await fixture.call('changePassword', change, 'session')).toEqual({
      status: 400, body: { error: 'password_compromised' },
    })
    expect(fixture.provider.changePassword).not.toHaveBeenCalled()
    expect(await fixture.call('changePassword', change, 'session')).toEqual({ status: 200, body: { changed: true } })
    expect(fixture.docs.get(credential).recoveryHash).toBe(recoveryHash)
    expect((await fixture.call('signin')).status).toBe(401)
    expect((await fixture.call('signin', { password: nextPassword })).status).toBe(200)
  })

  it('serializes password changes with recovery', async () => {
    const fixture = fixtures()
    const { uid, code } = await register(fixture)
    fixture.auth.verifyIdToken.mockResolvedValue({ uid })
    const started = deferred()
    const release = deferred()
    fixture.provider.changePassword.mockImplementationOnce(async () => {
      started.resolve()
      await release.promise
    })
    const changing = fixture.call('changePassword', { newPassword: nextPassword }, 'session')
    await started.promise
    try {
      expect(await fixture.call('recover', { recoveryCode: code, password: nextPassword })).toEqual({
        status: 429, body: { error: 'too_many_requests' },
      })
      expect((await fixture.call('changePassword', { newPassword: nextPassword }, 'session')).status).toBe(401)
    } finally {
      release.resolve()
      await changing
    }
  })

  it('changes the canonical password of a username account with a linked email', async () => {
    const fixture = fixtures()
    const { uid, credential } = await register(fixture)
    const email = 'player@example.com'
    fixture.docs.get(credential).linkedEmail = email
    fixture.auth.verifyIdToken.mockResolvedValue({ uid })

    expect((await fixture.call('changePassword', { newPassword: nextPassword }, 'session')).status).toBe(200)
    expect(fixture.provider.changePassword).toHaveBeenCalledWith(uid, nextPassword, email)
    expect((await fixture.call('signin')).status).toBe(401)
    expect(await fixture.call('signin', { password: nextPassword })).toEqual({ status: 200, body: { email, uid } })
  })

  it('creates a Firebase account without email and signs in case-insensitively with the right password', async () => {
    const fixture = fixtures()
    const { uid, code, credential } = await register(fixture)
    expect(fixture.users.get(uid)).toEqual({ uid, displayName: username, disabled: false, providerData: [] })
    expect(fixture.docs.get(`users/${uid}`)).toMatchObject({ username, usernameKey, usernamePassword: true })
    expect(fixture.docs.get(credential).recoveryHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify([...fixture.docs])).not.toContain(code)
    expect(JSON.stringify([...fixture.docs])).not.toContain(password)
    expect(await fixture.call('signin', { username: username.toUpperCase() })).toEqual({
      status: 200, body: { uid, token: `custom:${uid}` },
    })
    expect(await fixture.call('signin', { password: 'wrong' })).toEqual({ status: 401, body: { error: 'wrong_credentials' } })
    expect(await fixture.call('signup')).toEqual({ status: 409, body: { error: 'username_taken' } })
  })

  it('keeps the winner of a concurrent username claim and erases the provisional loser', async () => {
    const fixture = fixtures()
    const started = deferred()
    const release = deferred()
    fixture.provider.create.mockImplementationOnce(async (uid, value) => {
      fixture.passwords.set(uid, value)
      started.resolve()
      await release.promise
    })
    const first = fixture.call('signup')
    await started.promise
    const { uid } = await register(fixture)
    release.resolve()
    expect(await first).toEqual({ status: 409, body: { error: 'username_taken' } })
    expect([...fixture.users.keys()]).toEqual([uid])
    expect([...fixture.passwords.keys()]).toEqual([uid])
  })

  it('cleans up interrupted external provisioning only after the grace period', async () => {
    const fixture = fixtures()
    fixture.provider.create.mockImplementationOnce(async (uid, value) => {
      fixture.passwords.set(uid, value)
      throw new Error('remote timeout')
    })
    await expect(fixture.call('signup')).rejects.toThrow('remote timeout')
    expect(fixture.docs.has(`usernames/${usernameKey}`)).toBe(false)
    const cleanup = (now) => discardExpiredUsernameSignups({
      db: fixture.db, auth: fixture.auth, getProvider: () => fixture.provider, now,
    })
    expect(await cleanup(1)).toBe(0)
    expect(await cleanup(16 * 60 * 1000)).toBe(1)
    expect(fixture.users.size).toBe(0)
    expect(fixture.passwords.size).toBe(0)
    expect(fixture.docs.size).toBe(0)
  })

  it('serializes recovery, invalidates a concurrent signin proof, and consumes the code once', async () => {
    const fixture = fixtures()
    const { uid, code } = await register(fixture)
    const verified = deferred()
    const releaseVerify = deferred()
    fixture.provider.verify.mockImplementationOnce(async () => {
      verified.resolve()
      await releaseVerify.promise
      return true
    })
    const overlappingSignin = fixture.call('signin')
    await verified.promise
    const started = deferred()
    const release = deferred()
    fixture.provider.setPassword.mockImplementationOnce(async (accountUid, value) => {
      started.resolve()
      await release.promise
      fixture.passwords.set(accountUid, value)
    })
    const recovery = fixture.call('recover', { password: nextPassword, recoveryCode: code })
    await started.promise
    expect(await fixture.call('recover', { password: nextPassword, recoveryCode: code })).toEqual({
      status: 429, body: { error: 'too_many_requests' },
    })
    release.resolve()
    const recovered = await recovery
    releaseVerify.resolve()
    expect(await overlappingSignin).toEqual({ status: 401, body: { error: 'wrong_credentials' } })
    expect(recovered.status).toBe(200)
    expect(recovered.body.recoveryCode).not.toBe(code)
    expect(fixture.wait).toHaveBeenCalledWith(999)
    expect(fixture.auth.revokeRefreshTokens).toHaveBeenCalledWith(uid)
    expect(await fixture.call('recover', { password: nextPassword, recoveryCode: code })).toEqual({
      status: 401, body: { error: 'invalid_recovery_code' },
    })
    expect((await fixture.call('signin', { password: nextPassword })).status).toBe(200)
  })

  it('can retry recovery after the provider succeeds but Firebase revocation fails', async () => {
    const fixture = fixtures()
    const { code, uid } = await register(fixture)
    fixture.auth.revokeRefreshTokens.mockRejectedValueOnce(new Error('revocation unavailable'))
    await expect(fixture.call('recover', { password: nextPassword, recoveryCode: code })).rejects.toThrow('revocation unavailable')
    expect(fixture.users.get(uid).disabled).toBe(true)
    expect((await fixture.call('signin', { password: nextPassword })).status).toBe(401)
    fixture.clock.mockReturnValue(3 * 60 * 1000)
    expect((await fixture.call('recover', { password: nextPassword, recoveryCode: code })).status).toBe(200)
    expect(fixture.users.get(uid).disabled).toBe(false)
    expect((await fixture.call('signin', { password: nextPassword })).status).toBe(200)
  })

  it('keeps the code valid when the missing Firebase identity cannot be restored', async () => {
    const fixture = fixtures()
    const { code, uid } = await register(fixture)
    fixture.users.delete(uid)
    fixture.auth.createUser.mockRejectedValueOnce(new Error('restoration unavailable'))
    await expect(fixture.call('recover', { password: nextPassword, recoveryCode: code })).rejects.toThrow('restoration unavailable')
    expect(fixture.provider.setPassword).not.toHaveBeenCalled()
    fixture.clock.mockReturnValue(3 * 60 * 1000)
    expect((await fixture.call('recover', { password: nextPassword, recoveryCode: code })).status).toBe(200)
    expect(fixture.users.get(uid)).toMatchObject({ uid, displayName: username, disabled: false })
  })

  it('waits for pre-recovery Firebase custom tokens to expire before revoking sessions', async () => {
    const fixture = fixtures({ exchangeWindowSeconds: 30 })
    const { code, uid } = await register(fixture)
    const waiting = deferred()
    const release = deferred()
    fixture.wait.mockImplementationOnce(async () => {
      waiting.resolve()
      await release.promise
    })
    const request = fixture.call('recover', { password: nextPassword, recoveryCode: code })
    await waiting.promise
    expect(fixture.wait).toHaveBeenCalledWith(30_999)
    expect(fixture.auth.revokeRefreshTokens).not.toHaveBeenCalled()
    expect((await fixture.call('signin', { password: nextPassword })).status).toBe(401)
    release.resolve()
    expect((await request).status).toBe(200)
    expect(fixture.auth.revokeRefreshTokens).toHaveBeenCalledWith(uid)
  })

  it('requires both a verified Firebase session for the same account and the correct password to rotate the code', async () => {
    const fixture = fixtures()
    const { uid, code } = await register(fixture)
    expect((await fixture.call('rotate', {}, 'another-account')).status).toBe(401)
    expect(fixture.auth.verifyIdToken).toHaveBeenCalledWith('another-account', true)
    fixture.auth.verifyIdToken.mockResolvedValue({ uid })
    expect((await fixture.call('rotate', { password: 'wrong' }, 'right-account')).status).toBe(401)
    const replaced = await fixture.call('rotate', {}, 'right-account')
    expect(replaced.status).toBe(200)
    expect((await fixture.call('recover', { password: nextPassword, recoveryCode: code })).status).toBe(401)
    expect((await fixture.call('recover', { password: nextPassword, recoveryCode: replaced.body.recoveryCode })).status).toBe(200)
  })

  it('fails closed during credential deletion and preserves enough state to retry', async () => {
    const fixture = fixtures()
    const { uid, credential } = await register(fixture)
    await expect(removeUsernameCredential({ db: fixture.db, uid, getProvider: () => null })).rejects.toThrow('provider unavailable')
    expect(fixture.docs.get(credential).state).toBe('active')
    const remove = () => removeUsernameCredential({ db: fixture.db, auth: fixture.auth, uid, getProvider: () => fixture.provider })
    fixture.provider.remove.mockRejectedValueOnce(new Error('provider unavailable'))
    await expect(remove()).rejects.toThrow('provider unavailable')
    expect((await fixture.call('signin')).status).toBe(401)
    expect(fixture.docs.get(credential)).toMatchObject({ state: 'deleting', key: usernameKey })
    expect((await remove()).ref.path).toBe(credential)
    expect(fixture.passwords.has(uid)).toBe(false)
  })

  it('disables Firebase before the deletion window and lets cron resume without waiting', async () => {
    const fixture = fixtures()
    const { uid } = await register(fixture)
    const remove = (deferWait) => removeUsernameCredential({
      db: fixture.db, auth: fixture.auth, uid, getProvider: () => fixture.provider,
      clock: fixture.clock, wait: fixture.wait, exchangeWindowSeconds: 30, deferWait,
    })
    expect(await remove(true)).toMatchObject({ pending: true })
    expect(fixture.auth.updateUser).toHaveBeenCalledWith(uid, { disabled: true })
    expect(fixture.provider.remove).not.toHaveBeenCalled()
    expect(fixture.wait).not.toHaveBeenCalled()
    expect((await fixture.call('signin')).status).toBe(401)
    fixture.clock.mockReturnValue(31_001)
    expect(await remove(true)).toMatchObject({ pending: false })
    expect(fixture.provider.remove).toHaveBeenCalledWith(uid)
    expect(fixture.wait).not.toHaveBeenCalled()
  })

  it('rejects the old signin proof when deletion starts during provider verification', async () => {
    const fixture = fixtures()
    const { uid } = await register(fixture)
    const verifying = deferred()
    const release = deferred()
    fixture.provider.verify.mockImplementationOnce(async () => {
      verifying.resolve()
      await release.promise
      return true
    })
    const signin = fixture.call('signin')
    await verifying.promise
    await removeUsernameCredential({ db: fixture.db, auth: fixture.auth, uid, getProvider: () => fixture.provider })
    release.resolve()
    expect((await signin).status).toBe(401)
  })

  it('enforces the limiter and password policy before writing credentials', async () => {
    const fixture = fixtures()
    fixture.allow.mockResolvedValueOnce(false)
    expect((await fixture.call('signup')).status).toBe(429)
    fixture.validatePassword.mockResolvedValueOnce('password_compromised')
    expect(await fixture.call('signup')).toEqual({ status: 400, body: { error: 'password_compromised' } })
    expect(fixture.auth.createUser).not.toHaveBeenCalled()
    expect(fixture.docs.size).toBe(0)
  })
})

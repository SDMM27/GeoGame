import { describe, expect, it, vi } from 'vitest'

import { getUsernamePasswordProvider } from './usernameAccountProvider.mjs'
import { isUsernameCredentialUid, usernameCredentialUid } from './usernameCredentialUid.mjs'

const uid = '00000000-0000-4000-8000-000000000001'
const credentialUid = `username-credential:${uid}`
const email = `${'f'.repeat(48)}@accounts.geogame.invalid`
const password = 'a private passphrase with e\u0301'
const missing = { code: 'auth/user-not-found' }

function setup() {
  const auth = {
    getUser: vi.fn().mockResolvedValue({ uid: credentialUid, email, disabled: false }),
    createUser: vi.fn().mockResolvedValue({ uid: credentialUid }),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue({ uid: credentialUid }),
  }
  const request = vi.fn()
  const env = { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9909', FIREBASE_WEB_API_KEY: 'local-key' }
  const provider = getUsernamePasswordProvider(auth, env, request)
  return { auth, request, provider }
}

describe('Firebase username credential provider', () => {
  it('reserves a separate UID and provisions a random, non-deliverable alias without sending email', async () => {
    const { auth, request, provider } = setup()
    expect(usernameCredentialUid(uid)).toBe(credentialUid)
    expect(isUsernameCredentialUid(credentialUid)).toBe(true)
    expect(isUsernameCredentialUid(uid)).toBe(false)
    expect(isUsernameCredentialUid(`${credentialUid}x`)).toBe(true)
    await expect(provider.create(`${uid}x`, password)).rejects.toThrow('Invalid player UID')
    await expect(provider.create('legacy-user', password)).rejects.toThrow('Invalid player UID')
    await provider.create(uid, password)
    await provider.create(uid, password)
    expect(auth.createUser).toHaveBeenNthCalledWith(1, {
      uid: credentialUid,
      email: expect.stringMatching(/^[0-9a-f]{48}@accounts\.geogame\.invalid$/),
      password: password.normalize('NFC'),
    })
    expect(auth.createUser.mock.calls[0][0].email).not.toBe(auth.createUser.mock.calls[1][0].email)
    expect(request).not.toHaveBeenCalled()
  })

  it('keeps all credential-only tokens internal and requires the expected shadow UID', async () => {
    const { auth, request, provider } = setup()
    request.mockResolvedValueOnce({ ok: true, json: async () => ({ localId: credentialUid, idToken: 'discard', refreshToken: 'discard' }) })
    await expect(provider.verify(uid, password)).resolves.toBe(true)
    expect(auth.getUser).toHaveBeenCalledWith(credentialUid)
    expect(request).toHaveBeenCalledWith('http://localhost:9909/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-key', expect.objectContaining({
      method: 'POST', redirect: 'error', body: JSON.stringify({ email, password: password.normalize('NFC'), returnSecureToken: true }),
    }))
    request.mockResolvedValueOnce({ ok: true, json: async () => ({ localId: uid }) })
    await expect(provider.verify(uid, password)).rejects.toThrow('Username credential provider error')
  })

  it('recognizes invalid passwords and throttling while sanitizing upstream failures', async () => {
    const { auth, request, provider } = setup()
    request.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }) })
    await expect(provider.verify(uid, password)).resolves.toBe(false)
    request.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER : account temporarily blocked' } }) })
    await expect(provider.verify(uid, password)).rejects.toMatchObject({ code: 'too_many_requests' })
    request.mockRejectedValueOnce(new Error(`Upstream contains ${password}`))
    await expect(provider.verify(uid, password)).rejects.toThrow('Username credential provider error')
    auth.getUser.mockResolvedValueOnce({ uid: credentialUid, email: 'unrelated@example.org' })
    await expect(provider.remove(uid)).rejects.toThrow('Username credential provider error')
    expect(auth.deleteUser).not.toHaveBeenCalled()
  })

  it('restores a missing credential only on recovery and deletes it idempotently', async () => {
    const { auth, request, provider } = setup()
    auth.getUser.mockRejectedValue(missing)
    await expect(provider.verify(uid, password)).resolves.toBe(false)
    await provider.remove(uid)
    expect(request).not.toHaveBeenCalled()
    expect(auth.createUser).not.toHaveBeenCalled()
    expect(auth.deleteUser).not.toHaveBeenCalled()
    await provider.setPassword(uid, password)
    expect(auth.createUser).toHaveBeenCalledTimes(1)
    auth.getUser.mockResolvedValue({ uid: credentialUid, email })
    await provider.setPassword(uid, password)
    expect(auth.updateUser).toHaveBeenCalledWith(credentialUid, { password: password.normalize('NFC'), disabled: false })
    auth.deleteUser.mockRejectedValueOnce(missing)
    await provider.remove(uid)
    expect(auth.deleteUser).toHaveBeenCalledWith(credentialUid)
  })
})

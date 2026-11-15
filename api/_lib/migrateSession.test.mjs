// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { migrateSession } from './migrateSession.mjs'

const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })

function setup({ tokenResponse = json(200, { id_token: 'id-token' }), verify } = {}) {
  const auth = {
    verifyIdToken: vi.fn(verify ?? (async () => ({ uid: 'u1' }))),
    createCustomToken: vi.fn(async (uid) => `custom-${uid}`),
  }
  const fetchImpl = vi.fn(async () => tokenResponse)
  return { auth, fetchImpl }
}

describe('migrateSession', () => {
  it('exchanges the refresh token and returns a custom token', async () => {
    const { auth, fetchImpl } = setup()
    const result = await migrateSession({ auth, refreshToken: 'refresh', fetchImpl, env: {} })
    expect(result).toEqual({ status: 200, body: { token: 'custom-u1' } })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toMatch(/^https:\/\/securetoken\.googleapis\.com\/v1\/token\?key=/)
    expect(init.body).toBe('grant_type=refresh_token&refresh_token=refresh')
    expect(auth.verifyIdToken).toHaveBeenCalledWith('id-token', true)
  })

  it('goes through the Auth emulator when it is set', async () => {
    const { auth, fetchImpl } = setup()
    await migrateSession({ auth, refreshToken: 'refresh', fetchImpl, env: { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099', FIREBASE_WEB_API_KEY: 'k' } })
    expect(fetchImpl.mock.calls[0][0]).toBe('http://localhost:9099/securetoken.googleapis.com/v1/token?key=k')
  })

  it('refuses a missing token without calling anything', async () => {
    const { auth, fetchImpl } = setup()
    expect(await migrateSession({ auth, refreshToken: undefined, fetchImpl })).toEqual({ status: 401, body: { error: 'unauthenticated' } })
    expect(await migrateSession({ auth, refreshToken: '', fetchImpl })).toEqual({ status: 401, body: { error: 'unauthenticated' } })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuses a token Google rejects', async () => {
    const { auth, fetchImpl } = setup({ tokenResponse: json(400, { error: { message: 'INVALID_REFRESH_TOKEN' } }) })
    const result = await migrateSession({ auth, refreshToken: 'bad', fetchImpl, env: {} })
    expect(result.status).toBe(401)
    expect(auth.createCustomToken).not.toHaveBeenCalled()
  })

  it('refuses a revoked session', async () => {
    const { auth, fetchImpl } = setup({
      verify: async () => {
        throw new Error('auth/id-token-revoked')
      },
    })
    const result = await migrateSession({ auth, refreshToken: 'refresh', fetchImpl, env: {} })
    expect(result.status).toBe(401)
    expect(auth.createCustomToken).not.toHaveBeenCalled()
  })

  it('answers 500 when Google is down or unreachable', async () => {
    const down = setup({ tokenResponse: json(503, {}) })
    expect((await migrateSession({ ...down, refreshToken: 'refresh', env: {} })).status).toBe(500)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { auth } = setup()
    const fetchImpl = vi.fn(async () => {
      throw new Error('network')
    })
    expect((await migrateSession({ auth, refreshToken: 'refresh', fetchImpl, env: {} })).status).toBe(500)
  })
})

import { createHash, generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import { checkNewPassword, checkPasswordInput, usernameKey, validateUsername } from './usernameAccountPolicy.mjs'
import { issueUsernameFirebaseToken } from './usernameAccountToken.mjs'

describe('username account policy', () => {
  it('uses the same normalized usernames and profanity filter as existing accounts', () => {
    expect(usernameKey('  Éric   G. ')).toBe('éric g.')
    expect(validateUsername('Éric G.')).toBeNull()
    expect(validateUsername('f.u.c.k')).toBe('username_forbidden')
  })

  it('counts normalized Unicode code points and checks breached passwords by padded range', async () => {
    const password = 'une phrase pour le test'
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
    const request = vi.fn(async () => ({ ok: true, text: async () => `${hash.slice(5)}:100\r\n` }))
    expect(checkPasswordInput('🧭'.repeat(128))).toBe(true)
    expect(checkPasswordInput('🧭'.repeat(129))).toBe(false)
    expect(await checkNewPassword('🧭'.repeat(14), '', request)).toBe('weak_password')
    expect(request).not.toHaveBeenCalled()
    expect(await checkNewPassword(password, '', request)).toBe('password_compromised')
    expect(request).toHaveBeenCalledWith(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' }, signal: expect.any(AbortSignal),
    })
    request.mockResolvedValueOnce({ ok: true, text: async () => `${hash.slice(5)}:0\r\n` })
    expect(await checkNewPassword(password, '', request)).toBeNull()
    request.mockResolvedValueOnce({ ok: false })
    await expect(checkNewPassword(password, '', request)).rejects.toThrow('screening unavailable')
  })
})

it('issues a signed Firebase custom token with a 30-second exchange window', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const email = 'test@example.invalid'
  const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' })
  const env = { FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ client_email: email, private_key: privatePem, private_key_id: 'test-key' }) }
  const token = issueUsernameFirebaseToken(null, 'player', env, 100_000)
  const [header, payload, signature] = token.split('.')
  const decode = (value) => JSON.parse(Buffer.from(value, 'base64url').toString())
  expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
  expect(decode(payload)).toMatchObject({ uid: 'player', iat: 100, exp: 130, iss: email, sub: email, claims: { geogameUsernamePassword: true } })
  expect(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url'))).toBe(true)
})

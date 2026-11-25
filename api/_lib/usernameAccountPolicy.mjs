import { createHash, createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { USERNAME_PASSWORD_MAX, USERNAME_PASSWORD_MIN } from '../../src/utils/usernamePasswordLimits.mjs'

export { normalizeUsername, usernameKey, validateUsername } from '../../src/utils/usernameRules.mjs'

const WINDOW_MS = 15 * 60 * 1000
const RATE_LIMITS = {
  signup: { ip: 10, key: 6 },
  signin: { ip: 80, key: 25 },
  recover: { ip: 15, key: 8 },
  rotate: { ip: 15, key: 8 },
}

export function usernameRequestIp(req) {
  // The platform overwrites this header. A standalone local server uses the socket's peer address.
  const ip = process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'development'
    ? req.headers['x-vercel-forwarded-for']
    : req.socket?.remoteAddress
  if (typeof ip !== 'string' || !isIP(ip)) return null
  return ip.replace(/^::ffff:/i, '').toLowerCase()
}

export async function checkRateLimit(db, { ip, key, action }, now = Date.now()) {
  const secret = process.env.FIREBASE_SERVICE_ACCOUNT
    || (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST ? 'local-username-auth-rate-limits' : '')
  const limits = RATE_LIMITS[action]
  if (!ip || !secret || !limits) return false

  const entries = [[`ip:${ip}`, limits.ip], [`key:${key}`, limits.key]]
  const windowStart = now - now % WINDOW_MS
  const refs = entries.map(([subject]) => {
    const id = createHmac('sha256', secret).update(`username-auth-rate\0${windowStart}\0${action}\0${subject}`).digest('hex')
    return db.doc(`usernameAuthLimits/${id}`)
  })
  return db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...refs)
    const rows = snapshots.map((snapshot) => {
      const row = snapshot.data()
      return row ?? { count: 0, expiresAt: windowStart + WINDOW_MS }
    })
    if (rows.some((row, index) => row.count >= entries[index][1])) return false
    rows.forEach((row, index) => transaction.set(refs[index], { ...row, count: row.count + 1 }))
    return true
  })
}

export function checkPasswordInput(password) {
  return typeof password === 'string' && password.length > 0 && password.length <= USERNAME_PASSWORD_MAX * 2
    && Array.from(password.normalize('NFC')).length <= USERNAME_PASSWORD_MAX
    && !/[\p{Cc}\p{Cs}]/u.test(password)
}

export async function checkNewPassword(password, username = '', request = fetch) {
  if (!checkPasswordInput(password)) return 'weak_password'
  const normalized = password.normalize('NFC')
  if (Array.from(normalized).length < USERNAME_PASSWORD_MIN) return 'weak_password'
  if (/^(.)\1+$/u.test(normalized) || normalized.trim() === '' || normalized.toLowerCase() === username.toLowerCase()) {
    return 'password_compromised'
  }

  // Only the first five SHA-1 hex characters are sent to HIBP. Compare the suffix locally.
  const digest = createHash('sha1').update(normalized).digest('hex').toUpperCase()
  const [prefix, suffix] = [digest.slice(0, 5), digest.slice(5)]
  const response = await request(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    signal: AbortSignal.timeout(4000),
  })
  if (!response.ok) throw new Error('Password screening unavailable')
  const matches = (await response.text()).split(/\r?\n/).some((line) => {
    const [candidate, count] = line.split(':')
    return candidate === suffix && Number(count) > 0
  })
  return matches ? 'password_compromised' : null
}

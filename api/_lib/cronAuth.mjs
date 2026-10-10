// Vercel Cron calls the cron endpoints with Authorization: Bearer <CRON_SECRET>.
import { timingSafeEqual } from 'crypto'

export function isCronAuthorized(header, secret) {
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header ?? '')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

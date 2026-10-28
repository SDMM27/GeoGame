import { describe, expect, it } from 'vitest'
import { canUsePersistentCache } from './firestoreCache'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1'
const MAC_SAFARI_18 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
const MAC_SAFARI_16 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15'
const WINDOWS_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

describe('canUsePersistentCache', () => {
  it('keeps the cache in memory on iPhone and iPad browsers', () => {
    expect(canUsePersistentCache(IPHONE_SAFARI)).toBe(false)
    expect(canUsePersistentCache(IPHONE_CHROME)).toBe(false)
  })

  it('keeps the cache in memory on Safari 14-16', () => {
    expect(canUsePersistentCache(MAC_SAFARI_16)).toBe(false)
  })

  it('uses the persistent cache elsewhere', () => {
    expect(canUsePersistentCache(MAC_SAFARI_18)).toBe(true)
    expect(canUsePersistentCache(WINDOWS_CHROME)).toBe(true)
    expect(canUsePersistentCache(ANDROID_CHROME)).toBe(true)
    expect(canUsePersistentCache(undefined)).toBe(true)
  })
})

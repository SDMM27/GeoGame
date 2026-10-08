import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Firestore simulé : l'aller-retour de calibration renvoie SERVER_TIME
let serverTime = 0
let setDocImpl = () => Promise.resolve()
vi.mock('../Firebase', () => ({ firestore: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(() => setDocImpl()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ t: { toMillis: () => serverTime } }) })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(),
}))

// Modules rechargés à chaque test : la calibration est un état global
async function load() {
  vi.resetModules()
  const serverTimeModule = await import('./serverTime')
  const dailyKeyModule = await import('./dailyKey')
  const { default: useDailyKey } = await import('../hooks/useDailyKey')
  return { ...serverTimeModule, ...dailyKeyModule, useDailyKey }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  setDocImpl = () => Promise.resolve()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('dailyKeyAt', () => {
  it('changes day at midnight Paris time, not UTC', async () => {
    const { dailyKeyAt } = await load()
    expect(dailyKeyAt(new Date('2026-10-07T21:59:00Z'))).toBe('2026-10-07')
    expect(dailyKeyAt(new Date('2026-10-07T22:00:00Z'))).toBe('2026-10-08')
    // Heure d'hiver : UTC+1
    expect(dailyKeyAt(new Date('2026-12-31T23:00:00Z'))).toBe('2027-01-01')
  })
})

describe('getDailyKey', () => {
  it('ignores a device clock set to tomorrow once the server time is known', async () => {
    serverTime = Date.parse('2026-10-08T10:00:00Z')
    vi.setSystemTime(new Date('2026-10-09T10:00:00Z'))
    const { calibrateServerTime, getDailyKey, isServerTimeCalibrated } = await load()

    expect(getDailyKey()).toBe('2026-10-09')
    await calibrateServerTime()
    expect(isServerTimeCalibrated()).toBe(true)
    expect(getDailyKey()).toBe('2026-10-08')
  })

  it('discards a calibration whose round trip took too long', async () => {
    serverTime = Date.parse('2026-10-08T10:00:00Z')
    vi.setSystemTime(new Date('2026-10-09T10:00:00Z'))
    setDocImpl = () => {
      vi.setSystemTime(Date.now() + 60_000)
      return Promise.resolve()
    }
    const { calibrateServerTime, getDailyKey, isServerTimeCalibrated } = await load()

    await calibrateServerTime()
    expect(isServerTimeCalibrated()).toBe(false)
    expect(getDailyKey()).toBe('2026-10-09')
  })
})

describe('useDailyKey', () => {
  it('is null until the server time is known, then gives the server day', async () => {
    serverTime = Date.parse('2026-10-08T10:00:00Z')
    vi.setSystemTime(new Date('2026-10-09T10:00:00Z'))
    const { useDailyKey } = await load()

    const { result } = renderHook(() => useDailyKey())
    expect(result.current).toBeNull()
    await act(async () => {})
    expect(result.current).toBe('2026-10-08')
  })

  it('falls back to the device clock when the server does not answer', async () => {
    vi.setSystemTime(new Date('2026-10-09T10:00:00Z'))
    setDocImpl = () => new Promise(() => {})
    const { useDailyKey } = await load()

    const { result } = renderHook(() => useDailyKey())
    expect(result.current).toBeNull()
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current).toBe('2026-10-09')
  })

  it('stays null without contacting the server when disabled', async () => {
    const { setDoc } = await import('firebase/firestore')
    setDoc.mockClear()
    const { useDailyKey } = await load()

    const { result } = renderHook(() => useDailyKey(false))
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(setDoc).not.toHaveBeenCalled()
  })
})

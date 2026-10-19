import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useVoyageVoyageState from './useVoyageVoyageState'

const mocks = vi.hoisted(() => ({ dailyKey: '2026-10-08' }))

vi.mock('./useDailyKey', () => ({ default: (enabled = true) => (enabled ? mocks.dailyKey : null) }))

beforeEach(() => {
  localStorage.clear()
  mocks.dailyKey = '2026-10-08'
})

describe('useVoyageVoyageState — défi du jour', () => {
  it('waits for the day (server time) before choosing the route', () => {
    mocks.dailyKey = null
    const { result } = renderHook(() => useVoyageVoyageState('daily'))
    expect(result.current.startCountry).toBeNull()
    expect(result.current.dailyKey).toBeNull()
  })

  it('plays the route of the server day, saved under that day', () => {
    const { result } = renderHook(() => useVoyageVoyageState('daily'))
    expect(result.current.dailyKey).toBe('2026-10-08')
    expect(result.current.startCountry).not.toBeNull()
    expect(localStorage.getItem('vv_daily_2026-10-08')).not.toBeNull()
  })

  it('starts the route once the day is known', () => {
    mocks.dailyKey = null
    const { result, rerender } = renderHook(() => useVoyageVoyageState('daily'))
    mocks.dailyKey = '2026-10-08'
    rerender()
    const expected = renderHook(() => useVoyageVoyageState('daily')).result.current
    expect(result.current.startCountry?.properties.ISO_A2).toBe(expected.startCountry.properties.ISO_A2)
  })
})

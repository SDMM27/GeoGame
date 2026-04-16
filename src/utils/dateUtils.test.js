import { describe, it, expect } from 'vitest'
import { getLast7Days } from './dateUtils'

describe('getLast7Days', () => {
  it('returns 7 entries', () => {
    expect(getLast7Days('2026-04-16')).toHaveLength(7)
  })

  it('first entry is today with key matching input', () => {
    const days = getLast7Days('2026-04-16')
    expect(days[0].key).toBe('2026-04-16')
    expect(days[0].label).toBe("Aujourd'hui")
  })

  it('second entry is yesterday with label "Hier"', () => {
    const days = getLast7Days('2026-04-16')
    expect(days[1].key).toBe('2026-04-15')
    expect(days[1].label).toBe('Hier')
  })

  it('handles month boundary correctly', () => {
    const days = getLast7Days('2026-04-01')
    expect(days[1].key).toBe('2026-03-31')
  })

  it('keys are in descending order (most recent first)', () => {
    const days = getLast7Days('2026-04-16')
    const keys = days.map(d => d.key)
    expect(keys[0] > keys[1]).toBe(true)
    expect(keys[1] > keys[2]).toBe(true)
  })
})

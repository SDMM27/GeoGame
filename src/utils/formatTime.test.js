import { describe, it, expect } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('formats 0ms as 00:00', () => expect(formatTime(0)).toBe('00:00'))
  it('formats 65000ms as 01:05', () => expect(formatTime(65000)).toBe('01:05'))
  it('formats 90000ms as 01:30', () => expect(formatTime(90000)).toBe('01:30'))
  it('formats 3600000ms as 60:00', () => expect(formatTime(3600000)).toBe('60:00'))
})

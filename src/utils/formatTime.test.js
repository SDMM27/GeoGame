import { describe, it, expect } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('formats 0 as 00:00', () => expect(formatTime(0)).toBe('00:00'))
  it('formats 65 as 01:05', () => expect(formatTime(65)).toBe('01:05'))
  it('formats 90 as 01:30', () => expect(formatTime(90)).toBe('01:30'))
  it('formats 3600 as 60:00', () => expect(formatTime(3600)).toBe('60:00'))
})

import { formatCountdown, secondsToDailyReset } from './dailyCountdown'

describe('dailyCountdown', () => {
  it('formats seconds as HH:MM:SS', () => {
    expect(formatCountdown(4 * 3600 + 13 * 60 + 51)).toBe('04:13:51')
    expect(formatCountdown(0)).toBe('00:00:00')
  })

  it('counts down to midnight in Paris', () => {
    // 22:30:00 in Paris (UTC+1 in January)
    expect(secondsToDailyReset(new Date('2026-01-15T21:30:00Z'))).toBe(90 * 60)
    // 00:00:00 in Paris: a full day
    expect(secondsToDailyReset(new Date('2026-01-14T23:00:00Z'))).toBe(86400)
  })
})

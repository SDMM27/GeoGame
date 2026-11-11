// Time left before the next dailies, which change at midnight in Paris whatever the player's own time zone.
import { useEffect, useState } from 'react'

// Same zone as DAILY_TIME_ZONE in src/utils/dailyKey.js (not imported: it pulls Firebase in)
const DAILY_TIME_ZONE = 'Europe/Paris'

// Seconds until midnight in Paris (a day of 24 h: off by an hour only on the two clock-change days)
export function secondsToDailyReset(now = new Date()): number {
  let hour: number, minute: number, second: number
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { timeZone: DAILY_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
        .formatToParts(now)
        .map(({ type, value }) => [type, Number(value)]),
    )
    ;({ hour, minute, second } = parts as Record<string, number>)
  } catch {
    // Intl without time zone data: fall back to the device clock
    hour = now.getHours()
    minute = now.getMinutes()
    second = now.getSeconds()
  }
  return 86400 - (hour * 3600 + minute * 60 + second)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatCountdown(seconds: number): string {
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
}

export function useDailyCountdown(): string {
  const [left, setLeft] = useState(() => secondsToDailyReset())
  useEffect(() => {
    const id = setInterval(() => setLeft(secondsToDailyReset()), 1000)
    return () => clearInterval(id)
  }, [])
  return formatCountdown(left)
}

// Time left before the next dailies, which change at midnight in Paris (src/utils/dailyKey.js), whatever the
// player's own time zone.
import React, { useEffect, useState } from 'react'
import { DAILY_TIME_ZONE } from '../../../utils/dailyKey'

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: DAILY_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

// Seconds until midnight in Paris (a day of 24 h: off by an hour only on the two clock-change days)
export function secondsToDailyReset(now = new Date()) {
  const parts = Object.fromEntries(clock.formatToParts(now).map(({ type, value }) => [type, Number(value)]))
  return 86400 - (parts.hour * 3600 + parts.minute * 60 + parts.second)
}

const pad = (n) => String(n).padStart(2, '0')
export const formatCountdown = (seconds) =>
  `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`

export default function Countdown({ className = '' }) {
  const [left, setLeft] = useState(() => secondsToDailyReset())
  useEffect(() => {
    const id = setInterval(() => setLeft(secondsToDailyReset()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <time className={className} dateTime={`PT${left}S`}>
      {formatCountdown(left)}
    </time>
  )
}

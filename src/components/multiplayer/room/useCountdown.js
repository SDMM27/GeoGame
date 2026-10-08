import { useEffect, useState } from 'react'
import { serverNow } from '../../../utils/serverTime'

// Time left before a live start, on the server's clock.
export default function useCountdown(startAt) {
  const [, setTick] = useState(0)
  const remaining = startAt != null ? Math.max(0, startAt - serverNow()) : null
  const running = remaining != null && remaining > 0
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((tick) => tick + 1), 200)
    return () => clearInterval(id)
  }, [running])
  return remaining
}

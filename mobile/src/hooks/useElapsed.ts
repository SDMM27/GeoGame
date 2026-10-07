import { useEffect, useState } from 'react'

// Live elapsed time since `startedAt` (ms timestamp), ticking every second while `running`.
export function useElapsed(startedAt: number | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])
  return startedAt != null ? Math.max(0, now - startedAt) : 0
}

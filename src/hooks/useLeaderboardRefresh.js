import { useEffect, useState } from 'react'

// Website: a form saved a score, so the leaderboards on the page fetch their entries again.
const EVENT = 'geogame:leaderboard-saved'

export function notifyLeaderboardSaved() {
  window.dispatchEvent(new Event(EVENT))
}

// A counter that changes on every saved score: add it to a leaderboard's fetch dependencies.
export function useLeaderboardRefresh() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const onSaved = () => setCount((previous) => previous + 1)
    window.addEventListener(EVENT, onSaved)
    return () => window.removeEventListener(EVENT, onSaved)
  }, [])
  return count
}

// Loads one leaderboard: reloads whenever `key` (the filters) or `refreshKey` (pull to refresh) changes.
// `scores` is null while the current request is pending (also right after a filter change).
import { useEffect, useRef, useState } from 'react'

export function useLeaderboard<T>(key: string, load: () => Promise<T[]>, refreshKey?: unknown, onSettled?: () => void) {
  const requestKey = `${key}|${String(refreshKey)}`
  const [result, setResult] = useState<{ requestKey: string | null; scores: T[]; error: unknown }>({
    requestKey: null,
    scores: [],
    error: null,
  })
  const latest = useRef({ load, onSettled })
  useEffect(() => {
    latest.current = { load, onSettled }
  })

  useEffect(() => {
    let cancelled = false
    latest.current
      .load()
      .then((scores) => {
        if (!cancelled) setResult({ requestKey, scores, error: null })
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setResult({ requestKey, scores: [], error })
      })
      .finally(() => {
        if (!cancelled) latest.current.onSettled?.()
      })
    return () => {
      cancelled = true
    }
  }, [requestKey])

  return result.requestKey === requestKey ? { scores: result.scores as T[] | null, error: result.error } : { scores: null, error: null }
}

import { useEffect, useState } from 'react'
import { fetchBadges } from '../utils/badges'

// { [uid]: { top: [{ id, tier, emoji, icon }], count } } for the accounts among `uids` (visitors have none).
// Loaded once per account for a few minutes (see fetchBadges), so a lobby that fills up doesn't read them again.
export function useBadges(uids) {
  const key = [...new Set(uids.filter(Boolean))].sort().join(',')
  const [badges, setBadges] = useState({})

  useEffect(() => {
    if (!key) {
      setBadges({})
      return undefined
    }
    let cancelled = false
    Promise.all(key.split(',').map((uid) => fetchBadges(uid).then((value) => [uid, value]))).then((entries) => {
      if (!cancelled) setBadges(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return badges
}

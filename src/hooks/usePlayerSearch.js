import { useEffect, useState } from 'react'
import { SEARCH_MIN, searchPlayers } from '../utils/friends'
import { normalizeUsername } from '../utils/account'
import { getRecentPlayers } from '../utils/recentPlayers'

// Usernames starting with what is typed, once the player stopped typing for a moment: [{ uid, username }].
export function usePlayerSearch(text, delay = 300) {
  const key = normalizeUsername(text)
  const [state, setState] = useState({ key: '', results: [] })

  useEffect(() => {
    if (key.length < SEARCH_MIN) {
      setState({ key: '', results: [] })
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(() => {
      searchPlayers(key)
        .then((results) => !cancelled && setState({ key, results }))
        .catch(() => !cancelled && setState({ key, results: [] }))
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key, delay])

  return { searching: key.length >= SEARCH_MIN && state.key !== key, results: state.key === key ? state.results : [] }
}

// The accounts met in rooms lately that aren't linked to `friendships` yet: [{ uid, name }].
export function useRecentPlayers(friendships) {
  const [recent] = useState(getRecentPlayers)
  return recent.filter((player) => !friendships.all.some((link) => link.uid === player.uid)).slice(0, 6)
}

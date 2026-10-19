import { useEffect, useState } from 'react'
import { currentSeason, fetchPlayerElo, playerEloEntries } from '../utils/elo'

// The Elo ratings of a player in the current season: { loading, error, season, entries } with the entries of
// playerEloEntries (duel first, then each solo mode).
export function usePlayerElo(uid) {
  const [state, setState] = useState({ loading: true, error: false, season: null, entries: [] })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, error: false, season: null, entries: [] })
    fetchPlayerElo(uid)
      .then((data) => {
        const season = currentSeason()
        if (!cancelled) setState({ loading: false, error: false, season, entries: playerEloEntries(data, season) })
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setState({ loading: false, error: true, season: null, entries: [] })
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  return state
}

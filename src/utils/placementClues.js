import { useState } from 'react'

// Optional flag / capital under the target of "Find the country", chosen on the setup card.
// Kept between games (same keys as the app).
const SHOW_FLAG_KEY = 'geogame_placement_show_flag'
const SHOW_CAPITAL_KEY = 'geogame_placement_show_capital'

function read(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function useStoredFlag(key) {
  const [on, setOn] = useState(() => read(key))
  const set = (next) => {
    setOn(next)
    try {
      localStorage.setItem(key, next ? '1' : '0')
    } catch {
      // Private mode: the choice lasts for this page only
    }
  }
  return [on, set]
}

export function usePlacementClues() {
  const [showFlag, setShowFlag] = useStoredFlag(SHOW_FLAG_KEY)
  const [showCapital, setShowCapital] = useStoredFlag(SHOW_CAPITAL_KEY)
  return { showFlag, setShowFlag, showCapital, setShowCapital }
}

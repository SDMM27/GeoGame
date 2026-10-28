// Optional flag / capital under the target of "Trouve le pays", chosen on the setup sheet.
// Kept between games (same keys as the website).
import { useState } from 'react'

const SHOW_FLAG_KEY = 'geogame_placement_show_flag'
const SHOW_CAPITAL_KEY = 'geogame_placement_show_capital'

function read(key: string) {
  try {
    return globalThis.localStorage?.getItem(key) === '1'
  } catch {
    return false
  }
}

function useStoredFlag(key: string) {
  const [on, setOn] = useState(() => read(key))
  const set = (next: boolean) => {
    setOn(next)
    try {
      globalThis.localStorage?.setItem(key, next ? '1' : '0')
    } catch {
      // Storage unavailable: the choice lasts for this screen only
    }
  }
  return [on, set] as const
}

export function usePlacementClues() {
  const [showFlag, setShowFlag] = useStoredFlag(SHOW_FLAG_KEY)
  const [showCapital, setShowCapital] = useStoredFlag(SHOW_CAPITAL_KEY)
  return { showFlag, setShowFlag, showCapital, setShowCapital }
}

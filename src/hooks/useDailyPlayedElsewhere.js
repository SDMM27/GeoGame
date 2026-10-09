import { useEffect, useState } from 'react'
import { fetchDailyGame } from '../utils/gameHistory'

// Without network, getDoc can wait a long time before failing: the game is then playable.
const LOOKUP_TIMEOUT_MS = 4000

// The daily challenge the signed-in player already finished with their account on another device
// (their history, users/{uid}/games), for the website and the app: the game shows that result
// instead of letting them play it again.
// `accountState` is { loading, account } (useAccount). `started`: the challenge was started on this
// device, which then goes on as usual and is not looked up.
// Returns { checking, game }: `checking` while the account or the lookup loads (don't let the player
// start yet), `game` the history record (gameHistory.js) or null.
export function useDailyPlayedElsewhere(accountState, { gameType, dailyKey, started, enabled = true }) {
  const uid = accountState.account?.uid ?? null
  const lookupKey = enabled && uid && dailyKey ? `${uid}|${gameType}|${dailyKey}` : null
  const [result, setResult] = useState({ key: null, game: null })

  useEffect(() => {
    if (!lookupKey || started) return undefined
    let active = true
    let timer
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)
    })
    Promise.race([fetchDailyGame(uid, gameType, dailyKey), timeout])
      .catch(() => null)
      .then((game) => {
        clearTimeout(timer)
        if (active) setResult({ key: lookupKey, game })
      })
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [lookupKey, started, uid, gameType, dailyKey])

  if (!enabled || !dailyKey || started) return { checking: false, game: null }
  if (accountState.loading) return { checking: true, game: null }
  if (!lookupKey) return { checking: false, game: null }
  if (result.key !== lookupKey) return { checking: true, game: null }
  return { checking: false, game: result.game }
}

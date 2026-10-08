import { useCallback, useEffect, useRef, useState } from 'react'

// Leaderboard save of a finished game, for the website and the app.
// `accountState` is { loading, account } (useAccount). `save(player)` is one of utils/saveScore's
// functions bound to the game's score, called with { name, uid? }.
//  - signed-in player with a username: saved on its own, under their account.
//  - visitor: saved when they submit a name (submit(name)).
// status: 'idle' | 'saving' | 'saved' | 'updated' | 'blocked' | 'taken' | 'forbidden' | 'error'
// (`existing` holds the better entry when blocked). `alreadySaved` starts at 'saved' (daily challenges).
export function useScoreSave(accountState, save, { enabled = true, alreadySaved = false } = {}) {
  const [state, setState] = useState({ status: alreadySaved ? 'saved' : 'idle', existing: null, name: null })
  const latestSave = useRef(save)
  latestSave.current = save
  const busy = useRef(false)

  const account = accountState.account?.username ? accountState.account : null
  const signedIn = Boolean(account)

  const run = useCallback(async (player) => {
    if (busy.current) return null
    busy.current = true
    setState({ status: 'saving', existing: null, name: player.name })
    try {
      const result = await latestSave.current(player)
      setState({ status: result.status, existing: result.existing ?? null, name: player.name })
      return result
    } catch (error) {
      console.error('[leaderboard]', error)
      setState({ status: 'error', existing: null, name: player.name })
      return null
    } finally {
      busy.current = false
    }
  }, [])

  // Signed-in players don't fill a form: their score goes to the leaderboard as soon as the game ends.
  const autoSaved = useRef(false)
  useEffect(() => {
    if (!enabled || !account || autoSaved.current || state.status !== 'idle') return
    autoSaved.current = true
    run({ name: account.username, uid: account.uid })
  }, [enabled, account, state.status, run])

  const submit = useCallback(
    (name) => {
      const trimmed = name.trim()
      if (!trimmed) return Promise.resolve(null)
      return run({ name: trimmed })
    },
    [run]
  )

  // Signed-in player, after an error.
  const retry = useCallback(() => (account ? run({ name: account.username, uid: account.uid }) : null), [account, run])

  // The visitor edits their name: forget a 'blocked' / 'taken' / 'forbidden' answer about the previous one.
  const clear = useCallback(() => {
    setState((previous) =>
      ['blocked', 'taken', 'forbidden', 'error'].includes(previous.status)
        ? { status: 'idle', existing: null, name: null }
        : previous
    )
  }, [])

  return {
    ...state,
    loading: accountState.loading,
    signedIn,
    username: account?.username ?? null,
    done: state.status === 'saved' || state.status === 'updated',
    submit,
    retry,
    clear,
  }
}

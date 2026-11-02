import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLeague, leagueView } from '../utils/league'
import { serverNow } from '../utils/serverTime'

/**
 * The weekly league for the account `uid` (null for a visitor) and its `friends` ([{ uid, username }]), `username`
 * being its own name: { loading, error, reload, ...leagueView() } (src/utils/league.js). When the league can't be
 * loaded the lists are empty and `error` is set.
 */
export function useLeague(uid, friends = [], username = '') {
  const [state, setState] = useState({ league: { current: null, last: null }, loading: true, error: false })

  const load = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: false }))
    return fetchLeague()
      .then((league) => setState({ league, loading: false, error: false }))
      .catch((error) => {
        console.warn('[league]', error?.code, error)
        setState((previous) => ({ ...previous, loading: false, error: true }))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const friendsKey = friends.map((friend) => `${friend.uid}:${friend.username}`).join(',')
  const view = useMemo(
    () => leagueView({ ...state.league, uid, friends, username, now: serverNow() }),
    // `friends` is rebuilt on each render: its content is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.league, uid, friendsKey, username]
  )
  return { loading: state.loading, error: state.error, reload: load, ...view }
}

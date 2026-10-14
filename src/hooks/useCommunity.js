import { useCallback, useEffect, useState } from 'react'
import { fetchCommunity, fetchWeeklyTop, isInCommunity, joinCommunity, leaveCommunity } from '../utils/community'
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

// The community list, a page at a time: { members, loading, error, done, loadMore }.
export function useCommunityList() {
  const [state, setState] = useState({ members: [], cursor: null, done: false, loading: true, error: false })

  const load = useCallback((cursor) => {
    setState((previous) => ({ ...previous, loading: true, error: false }))
    fetchCommunity(cursor)
      .then((page) =>
        setState((previous) => ({
          members: cursor ? [...previous.members, ...page.members] : page.members,
          cursor: page.cursor,
          done: page.done,
          loading: false,
          error: false,
        }))
      )
      .catch((error) => {
        console.warn('[community]', error?.code, error)
        setState((previous) => ({ ...previous, loading: false, error: true }))
      })
  }, [])

  useEffect(() => load(null), [load])

  const loadMore = useCallback(() => load(state.cursor), [load, state.cursor])
  const reload = useCallback(() => load(null), [load])
  return { ...state, loadMore, reload }
}

// Whether the account is listed, and the switch: { listed, busy, error, join, leave } (listed is null while loading).
export function useMembership(uid, onChange) {
  const [state, setState] = useState({ listed: null, busy: false, error: false })

  useEffect(() => {
    setState({ listed: null, busy: false, error: false })
    if (!uid) return undefined
    let cancelled = false
    isInCommunity(uid)
      .then((listed) => !cancelled && setState((previous) => ({ ...previous, listed })))
      .catch(() => !cancelled && setState((previous) => ({ ...previous, listed: false })))
    return () => {
      cancelled = true
    }
  }, [uid])

  const change = (action, listed) => async () => {
    setState((previous) => ({ ...previous, busy: true, error: false }))
    try {
      await action(uid)
      setState({ listed, busy: false, error: false })
      onChange?.()
    } catch (error) {
      console.warn('[community]', error?.code, error)
      setState((previous) => ({ ...previous, busy: false, error: true }))
    }
  }

  return { ...state, join: change(joinCommunity, true), leave: change(leaveCommunity, false) }
}

// The top of the week: { entries, loading } (an empty list when it can't be loaded: it is a bonus).
export function useWeeklyTop() {
  const [state, setState] = useState({ entries: [], loading: true })
  useEffect(() => {
    let cancelled = false
    fetchWeeklyTop()
      .then((entries) => !cancelled && setState({ entries, loading: false }))
      .catch(() => !cancelled && setState({ entries: [], loading: false }))
    return () => {
      cancelled = true
    }
  }, [])
  return state
}

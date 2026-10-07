import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeAchievements } from '../utils/achievements'
import { fetchDailyGames, fetchGames } from '../utils/gameHistory'
import { computeStats, dayKey } from '../utils/profileStats'
import { watchFriendships } from '../utils/friends'

// A player's history with its stats and achievements. `reload` fetches it again (e.g. on focus).
export function usePlayerProfile(uid, { friendsCount } = {}) {
  const [state, setState] = useState({ loading: true, error: false, games: [] })

  const reload = useCallback(() => {
    if (!uid) return
    fetchGames(uid)
      .then((games) => setState({ loading: false, error: false, games }))
      .catch((error) => {
        console.warn('[profile]', error?.code, error)
        setState((previous) => ({ ...previous, loading: false, error: true }))
      })
  }, [uid])

  useEffect(() => {
    setState({ loading: true, error: false, games: [] })
    reload()
  }, [reload])

  const stats = useMemo(() => computeStats(state.games), [state.games])
  const achievements = useMemo(
    () => computeAchievements({ stats, games: state.games, friendsCount }),
    [stats, state.games, friendsCount]
  )

  return { ...state, stats, achievements, reload }
}

// Live friendships of `uid` (see splitFriendships), plus the accepted friends and incoming requests.
export function useFriendships(uid) {
  const [list, setList] = useState(null)
  useEffect(() => {
    setList(null)
    if (!uid) return undefined
    return watchFriendships(uid, setList)
  }, [uid])
  return useMemo(
    () => ({
      loading: Boolean(uid) && list == null,
      all: list ?? [],
      friends: (list ?? []).filter((item) => item.status === 'friend'),
      incoming: (list ?? []).filter((item) => item.status === 'incoming'),
      outgoing: (list ?? []).filter((item) => item.status === 'outgoing'),
    }),
    [list, uid]
  )
}

// { [uid]: { [gameType]: game } } with each friend's daily challenges of today.
export function useFriendsToday(friends) {
  const [today, setToday] = useState({})
  const uids = friends.map((friend) => friend.uid).join(',')

  useEffect(() => {
    if (!uids) {
      setToday({})
      return undefined
    }
    let cancelled = false
    const key = dayKey()
    Promise.all(
      uids.split(',').map((uid) =>
        fetchDailyGames(uid, key)
          .then((games) => [uid, Object.fromEntries(games.map((game) => [game.gameType, game]))])
          .catch(() => [uid, {}])
      )
    ).then((entries) => {
      if (!cancelled) setToday(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [uids])

  return today
}

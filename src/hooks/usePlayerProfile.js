import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeAchievements } from '../utils/achievements'
import { fetchChallenges, syncBadges } from '../utils/badges'
import { fetchCachedDailyGames, fetchCachedGames, fetchDailyGames, fetchGames } from '../utils/gameHistory'
import { computeStats, dayKey } from '../utils/profileStats'
import { watchSharedFriendships } from '../utils/friends'

// A player's history with its stats and achievements. `reload` fetches it again (e.g. on focus).
// `own`: the signed-in player's profile, which keeps their public badges (utils/badges.js) up to date.
export function usePlayerProfile(uid, { friendsCount, own = false } = {}) {
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
    if (!uid) return
    let fresh = false
    setState({ loading: true, error: false, games: [] })
    // Last known history first (instant), replaced by the server's answer when it arrives.
    fetchCachedGames(uid).then((games) => {
      if (!fresh && games.length > 0) setState({ loading: false, error: false, games })
    })
    fetchGames(uid)
      .then((games) => {
        fresh = true
        setState({ loading: false, error: false, games })
      })
      .catch((error) => {
        fresh = true
        console.warn('[profile]', error?.code, error)
        setState((previous) => ({ ...previous, loading: false, error: previous.games.length === 0 }))
      })
  }, [uid])

  // The player's own challenges stay unlocked when their games left the history (users/{uid}.challenges).
  const [remembered, setRemembered] = useState([])
  useEffect(() => {
    setRemembered([])
    if (!own || !uid) return undefined
    let cancelled = false
    fetchChallenges(uid).then((ids) => !cancelled && setRemembered(ids))
    return () => {
      cancelled = true
    }
  }, [own, uid])

  const stats = useMemo(() => computeStats(state.games), [state.games])
  const achievements = useMemo(
    () => computeAchievements({ stats, games: state.games, friendsCount, remembered }),
    [stats, state.games, friendsCount, remembered]
  )

  const loaded = !state.loading && !state.error
  useEffect(() => {
    if (own && loaded && uid) syncBadges(uid, achievements)
  }, [own, loaded, uid, achievements])

  return { ...state, stats, achievements, reload }
}

// Live friendships of `uid` (see splitFriendships), plus the accepted friends and incoming requests.
export function useFriendships(uid) {
  const [list, setList] = useState(null)
  useEffect(() => {
    setList(null)
    if (!uid) return undefined
    return watchSharedFriendships(uid, setList)
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
    const byType = (games) => Object.fromEntries(games.map((game) => [game.gameType, game]))
    // Each friend shows as soon as their own answer arrives (cache first, then the server), not when all are in.
    uids.split(',').forEach((uid) => {
      let fresh = false
      const apply = (games) => !cancelled && setToday((previous) => ({ ...previous, [uid]: byType(games) }))
      fetchCachedDailyGames(uid, key).then((games) => {
        if (!fresh && games) apply(games)
      })
      fetchDailyGames(uid, key)
        .then((games) => {
          fresh = true
          apply(games)
        })
        .catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [uids])

  return today
}

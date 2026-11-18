import { useEffect, useState } from 'react'
import { fetchDailyAnswers, hasPlayedDaily, answersAccess } from '../utils/dailyAnswers'
import { GAME_TYPES } from '../utils/gameTypes'

// The answers of a daily leaderboard, for the website and the app (see utils/dailyAnswers.js): returns
// { locked, answers, signedIn } where `answers` is a Map scoreId -> { guesses, playerOrder } (null while loading, when
// locked or for the Daily Challenge, whose rounds come from the day), `locked` true until the player may see them.
// `day` is the displayed day, `todayKey` the current one, `uid` the account's (undefined when signed out); a past day is
// never locked. `refreshKey` changes when a score is saved, so finishing the game unlocks today's answers.
export function useDailyAnswers({ gameType, day, todayKey, uid, refreshKey }) {
  const access = answersAccess(day, todayKey, uid)
  const challenge = gameType === GAME_TYPES.DAILY_CHALLENGE
  const requestKey = !day || access === 'signed-out' || (access === 'open' && challenge) ? null : `${gameType}|${day}|${uid ?? ''}|${String(refreshKey)}`
  const [result, setResult] = useState({ requestKey: null, locked: true, answers: null })

  useEffect(() => {
    if (!requestKey) return undefined
    let cancelled = false
    const request = challenge
      ? hasPlayedDaily(uid, gameType, day).then((played) => ({ locked: !played, answers: null }))
      : fetchDailyAnswers(gameType, day, access === 'check' ? uid : undefined).then((answers) => ({ locked: answers === null, answers }))
    request
      .catch((error) => {
        console.error(error)
        return { locked: access !== 'open', answers: null }
      })
      .then((next) => {
        if (!cancelled) setResult({ requestKey, ...next })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, challenge, gameType, day, uid, access])

  const signedIn = Boolean(uid)
  if (!requestKey) return { locked: access === 'signed-out', answers: null, signedIn }
  if (result.requestKey !== requestKey) return { locked: access !== 'open', answers: null, signedIn }
  return { locked: result.locked, answers: result.answers, signedIn }
}

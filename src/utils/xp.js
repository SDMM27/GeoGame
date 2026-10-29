// XP and level of an account (rules in missions.js), shared by the website and the app. users/{uid}.xp is written by
// the server only (api/xp): the client asks it to pay what the player's games earned, after each game and when the
// missions are shown. Best effort like eloReport.js: a failure never breaks anything and is not retried.
import { readXp, missionDayAt, weekKeyOf } from './missions'
import { cachedPublicData, fetchPublicData, patchPublicData } from './publicProfile'
import { serverNow } from './serverTime'

// readXp at the current day and week (server time).
export function xpOf(data, now = serverNow()) {
  const day = missionDayAt(now)
  return readXp(data, day, weekKeyOf(day))
}

export const fetchXp = async (uid) => xpOf(await fetchPublicData(uid))

// From the cache only: null when the account wasn't read recently.
export function cachedXp(uid) {
  const data = cachedPublicData(uid)
  return data ? xpOf(data) : null
}

const claimListeners = new Set()

// Called with { gained, levelUp, level, fragments, rewards, unlockedFlags } each time the server answered a claim (gained may be 0);
// `rewards`: the fragments of the dailies and the streak, [{ kind, fragments, streak? }] (grantXp in missions.js).
export function onXpClaimed(listener) {
  claimListeners.add(listener)
  return () => claimListeners.delete(listener)
}

// Dev only: lets a debugger or a screenshot script replay a claim (the website build has no __DEV__).
if (typeof __DEV__ !== 'undefined' && __DEV__) globalThis.__emitXpClaimed = (claim) => claimListeners.forEach((listener) => listener(claim))

let pushApi = null
let inFlight = null

// Asks the server to pay the signed-in player `uid`. Resolves with { xp, gained, levelUp, flags, fragments, rewards, unlockedFlags }, or null (signed out,
// offline, refused). Calls made while one runs share it.
export function claimXp(uid) {
  if (!uid) return Promise.resolve(null)
  inFlight ??= (async () => {
    try {
      pushApi ??= import('./pushApi')
      const response = await (await pushApi).callPush('xp', {})
      if (response?.status !== 200 || !response.body?.xp) return null
      const { xp, gained, levelUp, flags, fragments, rewards, unlockedFlags } = response.body
      patchPublicData(uid, flags ? { xp, flags } : { xp })
      claimListeners.forEach((listener) =>
        listener({ gained, levelUp: Boolean(levelUp), level: xp.level, fragments: fragments ?? 0, rewards: rewards ?? [], unlockedFlags: unlockedFlags ?? [] })
      )
      return response.body
    } catch (error) {
      console.warn('[xp]', error)
      return null
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

// "Come beat me": push notification to a friend, once the player has finished a daily challenge (api/daily-nudge).
import { normalize } from './normalizeAnswer'
import { callPush } from './pushApi'

// From this many friends, the end-of-game row gets a search field.
export const NUDGE_SEARCH_MIN_FRIENDS = 7

// Friends in alphabetical order, narrowed by the search field (case and accents ignored).
export function filterNudgeFriends(friends, query = '') {
  const search = normalize(query)
  return friends
    .filter((friend) => normalize(friend.username).includes(search))
    .sort((a, b) => a.username.localeCompare(b.username))
}

// 'sent' | 'unreachable' (friend has notifications off or no device) | 'already_sent' (today, for this game)
// | 'not_played' | 'rate_limited' | 'error'
// { recent: true }: any game of that type played in the last hours, not only the daily challenge.
export async function nudgeFriend(friendUid, gameType, { recent = false } = {}) {
  const result = await callPush('daily-nudge', { friendUid, gameType, ...(recent && { mode: 'recent' }) })
  if (!result) return 'error'
  if (result.status === 200) return result.body.sent > 0 ? 'sent' : 'unreachable'
  if (result.body.error === 'already_sent') return 'already_sent'
  if (result.body.error === 'not_played') return 'not_played'
  if (result.body.error === 'rate_limited') return 'rate_limited'
  return 'error'
}

// After a game: tells the challengers of this player (nudgeFriend) how it went, once they have played the game they were
// nudged on (api/challenge-result). Fire-and-forget: never breaks the end of a game.
export function settleChallenges() {
  return callPush('challenge-result', {}).catch(() => {})
}

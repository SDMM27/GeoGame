// "Come beat me": push notification to a friend, once the player has finished a daily challenge (api/daily-nudge).
import { callPush } from './pushApi'

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

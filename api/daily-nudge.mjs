// POST /api/daily-nudge  { friendUid, gameType }  with  Authorization: Bearer <Firebase ID token of the player who just
// finished that daily challenge>. Environment: see api/_lib/pushHandler.mjs.
import { sendDailyNudge } from './_lib/dailyNudge.mjs'
import { pushHandler } from './_lib/pushHandler.mjs'

export default pushHandler('daily-nudge', ({ body, ...context }) =>
  sendDailyNudge({ ...context, friendUid: body.friendUid, gameType: body.gameType })
)

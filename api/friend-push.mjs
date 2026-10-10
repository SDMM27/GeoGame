// POST /api/friend-push  { friendshipId }  with  Authorization: Bearer <Firebase ID token of the player who just
// sent or accepted the friend request>. Environment: see api/_lib/pushHandler.mjs.
import { sendFriendPush } from './_lib/friendPush.mjs'
import { pushHandler } from './_lib/pushHandler.mjs'

export default pushHandler('friend-push', ({ body, ...context }) => sendFriendPush({ ...context, friendshipId: body.friendshipId }))

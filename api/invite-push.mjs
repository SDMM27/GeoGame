// POST /api/invite-push  { inviteId }  with  Authorization: Bearer <Firebase ID token of the inviter>
// Environment: see api/_lib/pushHandler.mjs.
import { sendInvitePush } from './_lib/invitePush.mjs'
import { pushHandler } from './_lib/pushHandler.mjs'

export default pushHandler('invite-push', ({ body, ...context }) => sendInvitePush({ ...context, inviteId: body.inviteId }))

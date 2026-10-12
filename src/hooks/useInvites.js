// Room invites received by the signed-in player (see src/utils/invites.js), like the app's Multi tab.
import { useEffect, useState } from 'react'
import { dismissInvite, watchInvites } from '../utils/invites'

const NO_INVITES = []

export default function useInvites(uid) {
  // Tagged with the uid they belong to, so a sign-out or account switch never shows someone else's invites.
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!uid) return undefined
    return watchInvites(uid, (invites) => setState({ uid, invites }))
  }, [uid])
  return uid && state?.uid === uid ? state.invites : NO_INVITES
}

// The room URL of an invite: the room page joins it straight away under the account's username.
export const invitePath = (invite) => `/multiplayer/room/${invite.room}?invited=1`

export function acceptInvite(invite, navigate) {
  dismissInvite(invite.id)
  navigate(invitePath(invite))
}

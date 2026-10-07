// Room invites received by the signed-in player (see src/utils/invites.js).
import { router } from 'expo-router'
import { useEffect, useState } from 'react'

import { dismissInvite, watchInvites } from '@shared/utils/invites'

import { auth } from '@/account/auth'
import type { GameId } from '@/games'
import { API_ORIGIN } from '@/links'
import type { RoomMode } from '@/multiplayer/room'

export type Invite = { id: string; from: string; fromUsername: string; room: string; gameId: GameId; mode: RoomMode; at: number }

const NO_INVITES: Invite[] = []

export function useInvites(uid: string | null | undefined): Invite[] {
  // Tagged with the uid they belong to, so a sign-out or account switch never shows someone else's invites.
  const [state, setState] = useState<{ uid: string; invites: Invite[] } | null>(null)
  useEffect(() => {
    if (!uid) return undefined
    return watchInvites(uid, (invites: Invite[]) => setState({ uid, invites }))
  }, [uid])
  return uid && state?.uid === uid ? state.invites : NO_INVITES
}

// Asks the website to send the friend a push notification for this invite (best effort: the invite works without it).
export async function notifyInvite(id: string) {
  try {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) return
    await fetch(`${API_ORIGIN}/api/invite-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: id }),
    })
  } catch (error) {
    console.warn('[push]', error)
  }
}

// Opens the room and joins it straight away under the account's username.
export function acceptInvite(invite: Invite) {
  dismissInvite(invite.id)
  router.push({ pathname: '/multi/[code]', params: { code: invite.room, invited: '1' } })
}

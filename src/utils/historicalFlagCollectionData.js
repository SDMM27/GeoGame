import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { callPush } from './pushApi'
import { readHistoricalFlags } from './historicalFlagCollection'
import { cachedPublicData, patchPublicData } from './publicProfile'

export async function selectHistoricalFlag(uid, id) {
  const response = await callPush('xp', { action: 'selectHistoricalFlag', uid, id })
  if (response?.status !== 200 || !response.body?.historicalFlags) {
    throw new Error('Could not change the historical flag target')
  }
  return readHistoricalFlags(response.body)
}

// Follow the profile document so the album also sees league payouts, which happen outside XP claims.
export function useHistoricalFlags(uid) {
  const [profile, setProfile] = useState(null)
  const [selection, setSelection] = useState(null)
  const pendingSelection = useRef(null)

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      doc(firestore, 'users', uid),
      (snapshot) => {
        const state = readHistoricalFlags(snapshot.data())
        setProfile({ uid, state, error: false })
        const cached = cachedPublicData(uid)
        if (!snapshot.metadata.fromCache && cached && JSON.stringify(state) !== JSON.stringify(readHistoricalFlags(cached))) {
          patchPublicData(uid, { historicalFlags: state })
        }
      },
      () => setProfile({ uid, state: null, error: true })
    )
  }, [uid])

  const select = useCallback(async (id) => {
    if (!uid || pendingSelection.current?.uid === uid) return false
    const operation = { uid }
    pendingSelection.current = operation
    setSelection({ uid, busy: true, error: false })
    let error = false
    try {
      await selectHistoricalFlag(uid, id)
    } catch {
      error = true
    } finally {
      if (pendingSelection.current === operation) {
        pendingSelection.current = null
        setSelection({ uid, busy: false, error })
      }
    }
    return !error
  }, [uid])

  return {
    state: profile && profile.uid === uid ? profile.state : null,
    select,
    busy: selection?.uid === uid && Boolean(selection?.busy),
    error: (profile?.uid === uid && Boolean(profile?.error)) || (selection?.uid === uid && Boolean(selection?.error)),
  }
}

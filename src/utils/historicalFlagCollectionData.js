import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { firestore } from '../Firebase'
import { readHistoricalFlags } from './historicalFlagCollection'
import { cachedPublicData, patchPublicData } from './publicProfile'

// Follow the profile document so the album also sees league payouts, which happen outside XP claims.
export function useHistoricalFlags(uid) {
  const [profile, setProfile] = useState(null)

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

  return {
    state: profile && profile.uid === uid ? profile.state : null,
    error: profile?.uid === uid && Boolean(profile.error),
  }
}

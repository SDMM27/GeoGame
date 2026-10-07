// Website Auth instance (browser persistence). The app builds its own in mobile/src/account.
import { getAuth } from 'firebase/auth'
import { app } from './Firebase'
import { useAccountState } from './hooks/useAccount'
import { useRecordGameWith } from './hooks/useRecordGame'

export const auth = getAuth(app)

export const useAccount = () => useAccountState(auth)

// Saves `record` to the signed-in player's history when it appears (end of a game).
export const useRecordGame = (record) => useRecordGameWith(auth, record)

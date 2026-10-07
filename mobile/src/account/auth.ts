// App Auth instance: the session survives restarts thanks to expo-sqlite's key-value store.
import * as firebaseAuth from 'firebase/auth'
import { connectAuthEmulator, initializeAuth, type Persistence } from 'firebase/auth'
import Storage from 'expo-sqlite/kv-store'

import { app } from '@shared/Firebase'
import { useAccountState } from '@shared/hooks/useAccount'

import { EMULATOR_HOST } from '@/emulators'

// Exported by Firebase's React Native build, but missing from the typings (they're the browser ones).
const { getReactNativePersistence } = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence: (storage: typeof Storage) => Persistence
}

export const auth = initializeAuth(app, { persistence: getReactNativePersistence(Storage) })
if (EMULATOR_HOST) connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true })

export type Account = {
  uid: string
  email: string | null
  username: string | null
  // First Google sign-in: a username still has to be chosen.
  needsUsername: boolean
  hasPassword: boolean
  createdAt: number | null
}

export const useAccount = (): { loading: boolean; account: Account | null } => useAccountState(auth)

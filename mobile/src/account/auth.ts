// App Auth instance: React Native Firebase (native SDK), which restores the session itself, without a network round trip.
// The web build has its own (auth.web.ts).
import { connectAuthEmulator, getAuth } from 'firebase/auth'

import { app } from '@shared/Firebase'
import { useAccountState } from '@shared/hooks/useAccount'

import { EMULATOR_HOST } from '@/emulators'

import { migrateLegacySession } from './migrateSession'

export const auth = getAuth(app)
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

// The first account is reported once a session left by the JS SDK has been carried over (no signed-out flash).
export const useAccount = (): { loading: boolean; account: Account | null } => useAccountState(auth, migrateLegacySession(auth))

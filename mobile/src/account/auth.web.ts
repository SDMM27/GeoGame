// Expo web: the browser's own persistence, like the website.
import { getAuth } from 'firebase/auth'

import { app } from '@shared/Firebase'
import { useAccountState } from '@shared/hooks/useAccount'

export const auth = getAuth(app)

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

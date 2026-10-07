// Native Google sign-in needs a development build (not available in Expo Go): hidden for now.
import type { User } from 'firebase/auth'

export const signInWithGoogle: ((auth: unknown) => Promise<unknown>) | null = null
export const reauthenticateWithGoogle: ((user: User) => Promise<unknown>) | null = null

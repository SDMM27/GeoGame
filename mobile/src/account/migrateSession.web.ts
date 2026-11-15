// The web app never used the React Native session storage: nothing to migrate.
import type { Auth } from 'firebase/auth'

export const migrateLegacySession = (_auth: Auth): Promise<void> => Promise.resolve()

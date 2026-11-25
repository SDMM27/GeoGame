import { isUsernameCredentialUid } from './usernameCredentialUid.mjs'

// Password-only Firebase identities are internal verifiers and cannot act as players.
export async function callerUid(auth, idToken) {
  if (!idToken) return null
  try {
    const { uid } = await auth.verifyIdToken(idToken)
    return isUsernameCredentialUid(uid) ? null : uid
  } catch {
    return null
  }
}

// Native Google sign-in (Android): Google's account picker gives an ID token, Firebase signs in with it.
// Needs a build of the app (the native module isn't in Expo Go) and the build's signing SHA-1 in Firebase.
// iOS would need a GoogleService-Info.plist: hidden there for now, like in Expo Go.
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { GoogleAuthProvider, reauthenticateWithCredential, signInWithCredential, type Auth, type User } from 'firebase/auth'
import { Platform } from 'react-native'

// Firebase's "Web client" OAuth ID (client_type 3 in google-services.json): Google issues the ID token for it.
const WEB_CLIENT_ID = '836573704596-1cpp3drid3kvcl8f7rh2p9d1asltlko3.apps.googleusercontent.com'

const available = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

// The same error code as a closed popup on the web, so the profile screen ignores it (accountErrorKey).
const cancelled = () => Object.assign(new Error('Google sign-in cancelled'), { code: 'auth/user-cancelled' })

async function googleCredential() {
  // Required lazily: loading the module in Expo Go would throw.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin, isErrorWithCode, statusCodes } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin')
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID })
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (response.type !== 'success' || !response.data.idToken) throw cancelled()
    return GoogleAuthProvider.credential(response.data.idToken)
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) throw cancelled()
    throw err
  } finally {
    // Only the token was needed: forgetting the Google session shows the account picker every time.
    await GoogleSignin.signOut().catch(() => {})
  }
}

export const signInWithGoogle: ((auth: Auth) => Promise<unknown>) | null = available
  ? async (auth) => signInWithCredential(auth, await googleCredential())
  : null

export const reauthenticateWithGoogle: ((user: User) => Promise<unknown>) | null = available
  ? async (user) => reauthenticateWithCredential(user, await googleCredential())
  : null

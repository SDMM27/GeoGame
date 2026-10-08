// The Android/iOS app (Expo, JS Firebase SDK) can't use reCAPTCHA: App Check there needs Play Integrity or App Attest,
// which only the native SDK (@react-native-firebase/app-check, in an EAS build) provides. See the security notes.
export function startAppCheck() {
  return null
}

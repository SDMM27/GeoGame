import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

// Firebase App Check for the website and the Expo web app: every Firestore/Auth request carries a token that
// reCAPTCHA Enterprise issues to a real page of this site, so a script calling the API directly with the (public)
// API key is refused once enforcement is on in the Firebase console. Off when there is no site key or no page.
// The native app has no reCAPTCHA: appCheck.native.js does nothing there.
export function startAppCheck(app, siteKey) {
  if (!siteKey || typeof document === 'undefined') return null
  return initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

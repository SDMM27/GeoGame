// Expo web: the reCAPTCHA Enterprise site key of the app's own domain, set as EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY
// (Vercel env var of the app project). Empty means App Check is off (development, emulators, native app).
export const APP_CHECK_SITE_KEY: string = process.env.EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY ?? ''

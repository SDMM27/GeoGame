// reCAPTCHA Enterprise site key for Firebase App Check (VITE_RECAPTCHA_ENTERPRISE_KEY in .env.local and in the
// hosting provider's env vars). Empty in development, tests and with the emulators: App Check is then off.
// The Expo app swaps this file for mobile/src/shims/app-check-key.ts (metro.config.js), as Metro has no import.meta.
export const APP_CHECK_SITE_KEY = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY || ''

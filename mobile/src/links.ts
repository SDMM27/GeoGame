// Public address of the website (challenge links, "back to the site" link on the web app).
export const SITE_ORIGIN = 'https://geo-game-delta.vercel.app'
// Website API (api/), overridable to test against a local server.
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || SITE_ORIGIN

// Legal pages of the website (src/pages/legal), opened from the profile tab.
export const legalUrl = (path: string) => `${SITE_ORIGIN}${path}`

// Android APK, an asset of the latest release of the public GeoGame-releases repository (published by
// .github/workflows/eas-update.yml), next to latest.json which names the native runtime version it was built for.
const RELEASES = 'https://github.com/SDMM27/GeoGame-releases/releases/latest/download'
export const APK_URL = `${RELEASES}/geogame.apk`
export const LATEST_APK_INFO_URL = `${RELEASES}/latest.json`

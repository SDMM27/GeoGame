// Public address of the website (challenge links, "back to the site" link on the web app).
export const SITE_ORIGIN = 'https://geo-game-delta.vercel.app'
// Website API (api/), overridable to test against a local server.
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN || SITE_ORIGIN

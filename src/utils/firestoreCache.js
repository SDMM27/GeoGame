// Whether Firestore's persistent cache (IndexedDB) can be used in this browser.
//
// On 'pagehide', the persistent cache of Firebase 13 puts Firestore in a restricted mode where every later call
// returns a promise that never settles, in the browsers it takes for Safari 14-16: its check
// /(?:Version|Mobile)\/1[456]/ also matches "Mobile/15E148", in the user agent of every iPhone and iPad browser.
// A page restored from the back/forward cache (Back after leaving the site...) then loads forever: leaderboards,
// profile, friends. Those browsers keep the cache in memory, as before the persistent cache.
const SDK_SAFARI_BUG_VERSIONS = /(?:Version|Mobile)\/1[456]/

export function canUsePersistentCache(userAgent = globalThis.navigator?.userAgent, appVersion = globalThis.navigator?.appVersion) {
  if (!userAgent) return true
  const sdkSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
  return !(sdkSafari && (SDK_SAFARI_BUG_VERSIONS.test(userAgent) || SDK_SAFARI_BUG_VERSIONS.test(appVersion ?? '')))
}

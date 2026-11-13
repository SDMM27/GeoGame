// Test mode for preview deployments and local dev: every globe skin unlocked, and any flag can be tried as the profile
// picture (a local preview only: nothing the server would refuse is written). __PREVIEW_TOOLS__ is false in the
// production build (vite.config.mjs, VERCEL_ENV), so this file is dead code there.
// Turned on with ?test=1 in the URL, off with ?test=0; remembered on the device.
const KEY = 'gg.testMode'

/* global __PREVIEW_TOOLS__ */
export const testModeAvailable = __PREVIEW_TOOLS__

// Reads ?test=1 / ?test=0 once at startup, and drops it from the address bar.
export function initTestMode() {
  if (!testModeAvailable || typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    const value = url.searchParams.get('test')
    if (value === null) return
    if (value === '1') localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
    url.searchParams.delete('test')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    // no storage: the test mode just stays off
  }
}

export function isTestMode() {
  if (!testModeAvailable) return false
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function leaveTestMode() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignored
  }
  window.location.reload()
}

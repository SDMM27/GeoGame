// Web app: keeps every player on the latest deployed version. There are no over-the-air updates here (see updates.ts);
// the risk is the reverse. On iPhone, a home screen web app that iOS dropped from memory is restored from Safari's disk
// cache without asking the server: an index.html from an older deployment came back, with its old (immutable, still
// cached) bundle, and the player found the app from before the redesign. So:
// - the service worker (public/sw.js) loads every page from the network first, and the HTML is never cached
//   (vercel.json);
// - at launch and each time the app comes back to the foreground, the bundle the server lists is compared with the one
//   running, and the page reloads on the new one.
import { useEffect } from 'react'

export const updatesEnabled = false

const BUNDLE = /\/_expo\/static\/js\/web\/[^"'\s]+\.js/

function runningBundle(): string | null {
  for (const script of Array.from(document.scripts)) {
    const match = script.src.match(BUNDLE)
    if (match) return match[0]
  }
  return null
}

let reloading = false

async function reloadIfOutdated() {
  const running = runningBundle()
  if (!running || reloading) return
  try {
    const response = await fetch('/', { cache: 'no-store' })
    if (!response.ok) return
    const latest = (await response.text()).match(BUNDLE)?.[0]
    if (latest && latest !== running) {
      reloading = true
      window.location.reload()
    }
  } catch {
    // Offline: keep the version in hand.
  }
}

/** Always ready on the web; checks for a newer deployment instead. */
export function useLaunchUpdate(): boolean {
  useEffect(() => {
    if (__DEV__ || typeof window === 'undefined') return undefined
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    void reloadIfOutdated()
    const onVisible = () => document.visibilityState === 'visible' && void reloadIfOutdated()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [])
  return true
}

/** APKs only (Android). */
export function useNewerApk(): boolean {
  return false
}

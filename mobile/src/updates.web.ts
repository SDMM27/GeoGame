// Web app: keeps every player on the latest deployed version. There are no over-the-air updates here (see updates.ts);
// the risk is the reverse. On iPhone, a home screen web app that iOS dropped from memory is restored from Safari's disk
// cache without asking the server: an index.html from an older deployment came back, with its old (immutable, still
// cached) bundle, and the player found the app from before the redesign. So:
// - the service worker (public/sw.js) loads every page from the network first, and the HTML is never cached
//   (vercel.json);
// - at launch and each time the app comes back to the foreground, the bundle the server lists is compared with the one
//   running, and the page reloads on the new one, but never in the middle of a game: then once the player leaves it.
import { usePathname } from 'expo-router'
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
// A newer deployment found during a game: the page reloads once the player leaves it
let outdated = false

// A game or a multiplayer room: a reload there threw away the round being played (a daily challenge had to be
// started again).
export function isPlaying(pathname: string): boolean {
  return pathname.startsWith('/game/') || pathname.startsWith('/multi/')
}

function reloadUnlessPlaying() {
  if (reloading || isPlaying(window.location.pathname)) return
  reloading = true
  window.location.reload()
}

async function reloadIfOutdated() {
  const running = runningBundle()
  if (!running || reloading) return
  try {
    const response = await fetch('/', { cache: 'no-store' })
    if (!response.ok) return
    const latest = (await response.text()).match(BUNDLE)?.[0]
    if (latest && latest !== running) {
      outdated = true
      reloadUnlessPlaying()
    }
  } catch {
    // Offline: keep the version in hand.
  }
}

/** Always ready on the web; checks for a newer deployment instead. */
export function useLaunchUpdate(): boolean {
  const pathname = usePathname()
  useEffect(() => {
    if (outdated) reloadUnlessPlaying()
  }, [pathname])

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

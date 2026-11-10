// The site's light/dark choice: data-theme on <html> (set before the first paint by public/theme-init.js), remembered
// under the @sdmm/design storage key. Every component using it re-renders when any of them toggles.
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sd-theme'
const THEME_COLORS = { dark: '#0b1020', light: '#f3f5fa' }

const read = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

export function setColorScheme(scheme) {
  document.documentElement.dataset.theme = scheme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[scheme])
  try {
    localStorage.setItem(STORAGE_KEY, scheme)
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
}

export function useColorScheme() {
  const scheme = useSyncExternalStore(subscribe, read, () => 'dark')
  return { scheme, toggle: () => setColorScheme(scheme === 'dark' ? 'light' : 'dark') }
}

import Storage from 'expo-sqlite/kv-store'

let pending: Promise<void> = Promise.resolve()

/** Same store as the localStorage polyfill, without blocking a theme's first frame on SQLite. */
export function persistTheme(preference: string): Promise<void> {
  pending = pending.then(async () => {
    await Storage.setItemAsync('sd-theme', preference)
  }).catch(() => {
    // Storage unavailable: the choice still lasts until the app closes. Later writes can retry.
  })
  return pending
}

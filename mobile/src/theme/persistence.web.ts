/** Browsers use their own storage; importing native SQLite also bundles its WASM worker. */
export function persistTheme(preference: string): Promise<void> {
  return Promise.resolve().then(() => {
    globalThis.localStorage?.setItem('sd-theme', preference)
  }).catch(() => {
    // Storage unavailable: the choice still lasts until the page closes.
  })
}

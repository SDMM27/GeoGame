// A real, empty localStorage in every test: React Native has none, the app code reads it through
// `globalThis.localStorage?.` (web), and recent Node versions expose a broken one without --localstorage-file.
const store = new Map()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => void store.set(String(key), String(value)),
    removeItem: (key) => void store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  },
})

beforeEach(() => store.clear())

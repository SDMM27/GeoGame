// Synchronous localStorage for the shared game hooks (daily progress, pseudo, language),
// persisted with expo-sqlite's key-value store. Must be imported before anything from ../src.
import Storage from 'expo-sqlite/kv-store'

if (typeof globalThis.localStorage === 'undefined') {
  const localStorage = {
    getItem: (key: string) => Storage.getItemSync(key),
    setItem: (key: string, value: string) => Storage.setItemSync(key, String(value)),
    removeItem: (key: string) => {
      Storage.removeItemSync(key)
    },
    clear: () => Storage.clearSync(),
    key: (index: number) => Storage.getAllKeysSync()[index] ?? null,
    get length() {
      return Storage.getAllKeysSync().length
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: localStorage })
}

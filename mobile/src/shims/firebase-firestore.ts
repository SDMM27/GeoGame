// Native build: React Native Firebase's Firestore (native SDK, cache persisted on disk by default).
import { getFirestore, initializeFirestore as initializeNativeFirestore } from '@react-native-firebase/firestore'

export * from '@react-native-firebase/firestore'

type App = Parameters<typeof initializeNativeFirestore>[0]

// The JS SDK's cache factories: persistence is native here, nothing to configure.
export const persistentLocalCache = (_settings?: unknown) => ({})
export const persistentMultipleTabManager = () => ({})

// Web-only settings (cache, long polling) are dropped. Like the JS SDK, a second call (hot reload) must not throw.
export function initializeFirestore(app: App, settings: Record<string, unknown> = {}) {
  const { localCache: _localCache, experimentalAutoDetectLongPolling: _auto, experimentalForceLongPolling: _force, ...native } = settings
  if (Object.keys(native).length === 0) return getFirestore(app)
  try {
    return initializeNativeFirestore(app, native)
  } catch {
    return getFirestore(app)
  }
}

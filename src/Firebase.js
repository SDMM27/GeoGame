import { initializeApp } from "firebase/app";
import {getFirestore, initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager} from 'firebase/firestore';
import { startAppCheck } from './appCheck';
import { APP_CHECK_SITE_KEY } from './appCheckKey';

// Firebase web configuration (public identifiers, not secrets: access is enforced by firestore.rules and App Check)
const firebaseConfig = {
  apiKey: "AIzaSyAe2bQDVUJUX9wicXL_BvSF8SQKj0xlTWQ",
  authDomain: "geogame-sdmm.firebaseapp.com",
  projectId: "geogame-sdmm",
  storageBucket: "geogame-sdmm.appspot.com",
  messagingSenderId: "836573704596",
  appId: "1:836573704596:web:7e83c3954d22d09c7c9f81",
  measurementId: "G-969YD8D38B"
};

export const app = initializeApp(firebaseConfig);
// App Check goes before any other service, so that Firestore and Auth pick its token up (no-op without a site key).
// VITE_USE_EMULATORS=1 (website dev server only) talks to the local Firebase emulators (npm run emulators) instead of production.
// Defined by vite.config.mjs; undefined in the Expo app, which has its own switch (mobile/src/emulators.ts).
export const USE_EMULATORS = typeof __USE_EMULATORS__ !== 'undefined' && __USE_EMULATORS__;
export const appCheck = USE_EMULATORS ? null : startAppCheck(app, APP_CHECK_SITE_KEY);
// Safari/iOS (and some networks or content blockers) can stall Firestore's default streaming connection for ~10s or
// more before the SDK falls back by itself: detect it quickly and switch to long polling.
// initializeFirestore throws if Firestore already exists for this app (hot reload): reuse it then.
// The cache is kept on disk (IndexedDB) so that a profile opened after the app was suspended or killed can show its
// last known data at once while the connection comes back. Without IndexedDB (private mode...) it stays in memory.
function createFirestore() {
  const settings = { experimentalAutoDetectLongPolling: true };
  try {
    return initializeFirestore(app, { ...settings, localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    try {
      return initializeFirestore(app, settings);
    } catch {
      return getFirestore(app);
    }
  }
}
export const firestore = createFirestore();
if (USE_EMULATORS) connectFirestoreEmulator(firestore, '127.0.0.1', 8080);

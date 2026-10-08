import { initializeApp } from "firebase/app";
import {getFirestore, connectFirestoreEmulator} from 'firebase/firestore';
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
export const firestore = getFirestore(app);
if (USE_EMULATORS) connectFirestoreEmulator(firestore, '127.0.0.1', 8080);

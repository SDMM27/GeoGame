// Local testing against the Firebase emulators (firebase.json at the repository root):
//   EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost npm run web
// Imported before anything reads Firestore; Auth connects in account/auth.
import { connectFirestoreEmulator } from 'firebase/firestore'

import { firestore } from '@shared/Firebase'

export const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST

if (EMULATOR_HOST) connectFirestoreEmulator(firestore, EMULATOR_HOST, 8080)

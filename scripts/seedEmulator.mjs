// Two test accounts, already friends, in the local Firebase emulators (npm run emulators), to try room invites:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 node scripts/seedEmulator.mjs
// Then in mobile/: EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost npm run web, and sign in with one account per browser
// origin (e.g. localhost:8081 and 127.0.0.1:8081, which don't share their session).
// These accounts only exist in the emulators.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Emulators only: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST.')
  process.exit(1)
}

export const TEST_ACCOUNTS = [
  { uid: 'test-alice', username: 'Alice', email: 'alice@geogame.test', password: 'alice-test-123' },
  { uid: 'test-bob', username: 'Bob', email: 'bob@geogame.test', password: 'bob-test-123' },
]

const app = initializeApp({ projectId: 'geogame-sdmm' })
const auth = getAuth(app)
const db = getFirestore(app)

for (const { uid, username, email, password } of TEST_ACCOUNTS) {
  await auth.deleteUser(uid).catch(() => {})
  await auth.createUser({ uid, email, password })
  await db.doc(`users/${uid}`).set({ username, createdAt: FieldValue.serverTimestamp() })
  await db.doc(`usernames/${username.toLowerCase()}`).set({ uid, username })
}

const [alice, bob] = TEST_ACCOUNTS
await db.doc(`friendships/${[alice.uid, bob.uid].sort().join('_')}`).set({
  users: [alice.uid, bob.uid],
  usernames: { [alice.uid]: alice.username, [bob.uid]: bob.username },
  requester: alice.uid,
  status: 'accepted',
  createdAt: FieldValue.serverTimestamp(),
  acceptedAt: FieldValue.serverTimestamp(),
})

console.log(`Seeded: ${TEST_ACCOUNTS.map((account) => `${account.username} <${account.email}>`).join(', ')} (friends)`)

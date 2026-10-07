// Player accounts (Firebase Auth: email + password, or Google on the web), shared by the website and the app.
// Each app passes its own Auth instance (web persistence vs. React Native persistence).
// Google's popup helpers live in accountGoogle.js: Firebase's React Native build doesn't have them.
//
// Firestore:
//   users/{uid}            { username, createdAt }
//   usernames/{lowercase}  { uid, username }   -> one account per username
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { firestore } from '../Firebase'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
export const PASSWORD_MIN = 6
// Same key as the score and multiplayer forms, so they get prefilled with the account's username.
export const PSEUDO_STORAGE_KEY = 'geogame_pseudo'

const USERNAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u

class AccountError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

export function normalizeUsername(username) {
  return username.trim().replace(/\s+/g, ' ')
}

// Returns an i18n error key (under `account.errors`), or null when the username is valid.
export function validateUsername(username) {
  const name = normalizeUsername(username)
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return 'username_length'
  if (!USERNAME_PATTERN.test(name)) return 'username_chars'
  return null
}

const usernameRef = (username) => doc(firestore, 'usernames', normalizeUsername(username).toLowerCase())
const userRef = (uid) => doc(firestore, 'users', uid)

// Listeners refreshed once a username is claimed, since that doesn't fire onAuthStateChanged.
const refreshListeners = new Set()
const refreshAccounts = () => refreshListeners.forEach((listener) => listener())
// While an email sign-up claims its username, the half-created account isn't reported.
let signingUp = false

// { uid, email, username, createdAt, needsUsername, hasPassword } or null.
// needsUsername: after a first Google sign-in, the player still has to pick a username.
async function loadAccount(user) {
  if (!user) return null
  const account = {
    uid: user.uid,
    email: user.email,
    hasPassword: user.providerData.some((provider) => provider.providerId === 'password'),
  }
  try {
    const profile = await getDoc(userRef(user.uid))
    return profile.exists()
      ? {
          ...account,
          username: profile.data().username,
          createdAt: profile.data().createdAt?.toMillis?.() ?? null,
          needsUsername: false,
        }
      : { ...account, username: null, createdAt: null, needsUsername: true }
  } catch (error) {
    // Offline: the display name is set to the username when it's claimed.
    console.warn('[account] profile', error?.code, error)
    return { ...account, username: user.displayName, createdAt: null, needsUsername: false }
  }
}

// Username of the signed-in account (or the last one typed), to prefill name fields.
export function getSavedPseudo() {
  try {
    return globalThis.localStorage?.getItem(PSEUDO_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function rememberPseudo(username) {
  try {
    if (username) globalThis.localStorage?.setItem(PSEUDO_STORAGE_KEY, username)
  } catch {
    // Storage unavailable — prefill is only a convenience.
  }
}

// Calls back with the account (see loadAccount) or null on every sign-in, sign-out and username change.
export function watchAccount(auth, callback) {
  let latest = 0
  const emit = async () => {
    if (signingUp) return
    const request = ++latest
    const account = await loadAccount(auth.currentUser)
    if (request !== latest) return
    rememberPseudo(account?.username)
    callback(account)
  }
  const unsubscribe = onAuthStateChanged(auth, emit)
  refreshListeners.add(emit)
  return () => {
    latest = -1
    unsubscribe()
    refreshListeners.delete(emit)
  }
}

function checkUsername(username) {
  const name = normalizeUsername(username)
  const invalid = validateUsername(name)
  if (invalid) throw new AccountError(invalid)
  return name
}

async function claimUsername(user, name) {
  await runTransaction(firestore, async (transaction) => {
    const claimed = await transaction.get(usernameRef(name))
    if (claimed.exists()) throw new AccountError('username_taken')
    transaction.set(usernameRef(name), { uid: user.uid, username: name })
    transaction.set(userRef(user.uid), { username: name, createdAt: serverTimestamp() })
  })
  await updateProfile(user, { displayName: name })
}

export async function signUp(auth, { email, password, username }) {
  const name = checkUsername(username)
  if ((await getDoc(usernameRef(name))).exists()) throw new AccountError('username_taken')

  signingUp = true
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
    try {
      await claimUsername(user, name)
    } catch (error) {
      // Someone took the username in the meantime: don't leave an account without one.
      await deleteUser(user).catch(() => {})
      throw error
    }
  } finally {
    signingUp = false
    refreshAccounts()
  }
}

// After a first Google sign-in.
export async function chooseUsername(auth, username) {
  await claimUsername(auth.currentUser, checkUsername(username))
  refreshAccounts()
}

export function signIn(auth, { email, password }) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export function signOut(auth) {
  return firebaseSignOut(auth)
}

export function resetPassword(auth, email) {
  return sendPasswordResetEmail(auth, email.trim())
}

// Deleting needs a recent sign-in: the password is asked again, or Google's `reauthenticate` (accountGoogle.js).
export async function deleteAccount(auth, { password, reauthenticate }) {
  const user = auth.currentUser
  if (!user) return
  if (password != null) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
  else await reauthenticate(user)
  // Game history and friendships go too (batches are capped at 500 writes).
  const [games, friendships] = await Promise.all([
    getDocs(collection(firestore, 'users', user.uid, 'games')),
    getDocs(query(collection(firestore, 'friendships'), where('users', 'array-contains', user.uid))),
  ])
  const refs = [...games.docs, ...friendships.docs].map((item) => item.ref)
  for (let start = 0; start < refs.length; start += 500) {
    const batch = writeBatch(firestore)
    refs.slice(start, start + 500).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }

  const profile = await getDoc(userRef(user.uid))
  const batch = writeBatch(firestore)
  if (profile.exists()) batch.delete(usernameRef(profile.data().username))
  batch.delete(userRef(user.uid))
  await batch.commit()
  await deleteUser(user)
}

const FIREBASE_ERRORS = {
  'auth/invalid-email': 'invalid_email',
  'auth/missing-email': 'invalid_email',
  'auth/email-already-in-use': 'email_in_use',
  'auth/weak-password': 'weak_password',
  'auth/missing-password': 'wrong_credentials',
  'auth/invalid-credential': 'wrong_credentials',
  'auth/invalid-login-credentials': 'wrong_credentials',
  'auth/wrong-password': 'wrong_credentials',
  'auth/user-not-found': 'wrong_credentials',
  'auth/too-many-requests': 'too_many_requests',
  'auth/network-request-failed': 'network',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
  'auth/user-cancelled': 'cancelled',
  'auth/popup-blocked': 'popup_blocked',
  'auth/account-exists-with-different-credential': 'different_provider',
  'auth/operation-not-allowed': 'not_enabled',
  'auth/configuration-not-found': 'not_enabled',
  // The site's domain isn't in Firebase Auth's authorized domains.
  'auth/unauthorized-domain': 'not_enabled',
  // Firestore rules don't allow the users / usernames collections yet.
  'permission-denied': 'not_enabled',
}

// i18n key (under `account.errors`) for any error thrown by the functions above.
// 'cancelled' (Google popup closed) is meant to be ignored, not shown.
export function accountErrorKey(error) {
  if (error instanceof AccountError) return error.code
  const key = FIREBASE_ERRORS[error?.code] ?? 'generic'
  // Configuration problems and unknown errors are for the developer: keep the real cause in the logs.
  if (key === 'not_enabled' || key === 'generic') console.warn('[account]', error?.code, error)
  return key
}

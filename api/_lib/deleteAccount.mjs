// Deleting an account and everything tied to it (right to erasure). Called by POST /api/delete-account for the
// account's owner, and by the daily cleanup for accounts unused for INACTIVE_ACCOUNT_MS.
// Deleted: users/{uid} with its games and pushTokens, usernames/{key}, the account's leaderboard entries and the
// reports made by it or about those entries, friendships, invites sent and received, the push bookkeeping
// (invitePushLimits, dailyReminderPushes, friendPushes, dailyNudges sent or received), the Elo ratings and the countries won
// (elo, eloGains, eloDuelAccounts), the online status (presence/{uid}), then the Firebase Auth account. Rooms keep the pseudo until they expire (10 days at most, api/cleanup-expired.mjs).
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

import { canObserveMissingUsernamePlayer, discardExpiredUsernameSignups, hasUsernameCredential, removeUsernameCredential } from './usernameAccount.mjs'
import { getUsernamePasswordProvider } from './usernameAccountProvider.mjs'
import { USERNAME_TOKEN_EXCHANGE_SECONDS } from './usernameAccountToken.mjs'
import { isUsernameCredentialUid, playerUidForUsernameCredential } from './usernameCredentialUid.mjs'

// The account's owner must have signed in again just before (like Firebase's own deleteUser on the client).
export const RECENT_SIGN_IN_MS = 5 * 60 * 1000
// The privacy policy (src/legal) promises this: an account unused for 3 years is deleted.
export const INACTIVE_ACCOUNT_MS = 3 * 365 * 24 * 60 * 60 * 1000
export const SCORE_COLLECTIONS = ['scores', 'ascension_scores', 'daily_scores', 'survival_scores']

const reply = (status, body) => ({ status, body })

async function deleteRefs(db, refs) {
  for (let start = 0; start < refs.length; start += 500) {
    const batch = db.batch()
    refs.slice(start, start + 500).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

// `db` and `auth`: firebase-admin Firestore and Auth. Returns how many documents went, besides users/{uid}.
export async function deleteAccountData({
  db, auth, uid, getUsernameProvider = () => getUsernamePasswordProvider(auth), deferUsernameWait = false, expectedMissingSince, observationNow,
}) {
  const credentials = await removeUsernameCredential({
    db, auth, uid, getProvider: getUsernameProvider, deferWait: deferUsernameWait,
    exchangeWindowSeconds: process.env.FIREBASE_AUTH_EMULATOR_HOST ? 0 : USERNAME_TOKEN_EXCHANGE_SECONDS,
    expectedMissingSince, observationNow,
  })
  if (credentials?.skipped) return { skipped: true }
  if (credentials?.pending) return { pending: true }
  const userRef = db.doc(`users/${uid}`)
  const [profile, friendships, invitesSent, invitesReceived, nudgesSent, nudgesReceived, reportsMade, eloGains, eloDuelAccounts, ...scores] = await Promise.all([
    userRef.get(),
    db.collection('friendships').where('users', 'array-contains', uid).get(),
    db.collection('invites').where('from', '==', uid).get(),
    db.collection('invites').where('to', '==', uid).get(),
    db.collection('dailyNudges').where('from', '==', uid).get(),
    db.collection('dailyNudges').where('to', '==', uid).get(),
    db.collection('reports').where('reporter', '==', uid).get(),
    db.collection('eloGains').where('uid', '==', uid).get(),
    db.collection('eloDuelAccounts').where('uid', '==', uid).get(),
    ...SCORE_COLLECTIONS.map((name) => db.collection(name).where('uid', '==', uid).get()),
  ])

  // Reports about the account's entries name its pseudo (targetName): they go with the entries.
  const scoreDocs = scores.flatMap((snapshot) => snapshot.docs)
  const reportsAbout = []
  for (let start = 0; start < scoreDocs.length; start += 30) {
    const chunk = scoreDocs.slice(start, start + 30)
    const found = await db.collection('reports').where('targetId', 'in', chunk.map((score) => score.id)).get()
    const paths = new Set(chunk.map((score) => score.ref.path))
    reportsAbout.push(...found.docs.filter((report) => paths.has(`${report.data().targetCollection}/${report.data().targetId}`)))
  }

  const refs = new Map()
  for (const snapshot of [...scoreDocs, ...reportsAbout, ...reportsMade.docs, ...friendships.docs,
    ...invitesSent.docs, ...invitesReceived.docs, ...nudgesSent.docs, ...nudgesReceived.docs, ...eloGains.docs, ...eloDuelAccounts.docs]) {
    refs.set(snapshot.ref.path, snapshot.ref)
  }
  const { username, usernameKey } = profile.data() ?? {}
  // The deletion marker retains the key if an earlier attempt has already deleted the profile.
  const key = usernameKey ?? username?.toLowerCase() ?? credentials?.key
  // Push bookkeeping (api/_lib/push.mjs, friendPush.mjs, dailyReminder.mjs, dailyNudge.mjs) and the Elo ratings and mastery, server only.
  for (const path of [`invitePushLimits/${uid}`, `dailyReminderPushes/${uid}`, `elo/${uid}`, `mastery/${uid}`, `presence/${uid}`,
    ...friendships.docs.flatMap((friendship) => [`friendPushes/${friendship.id}_request`, `friendPushes/${friendship.id}_accepted`])]) {
    refs.set(path, db.doc(path))
  }
  const releaseName = () => db.runTransaction(async (transaction) => {
    const claimed = key ? await transaction.get(db.doc(`usernames/${key}`)) : null
    const ownsName = claimed?.data()?.uid === uid
    if (ownsName) transaction.delete(claimed.ref)
    if (credentials) transaction.delete(credentials.ref)
    return ownsName
  })
  await deleteRefs(db, [...refs.values()])
  // Preserve the legacy cleanup order. No-email accounts keep the name reserved until Firebase erasure;
  // their deletion marker makes it possible to retry if a later operation fails.
  let released = !credentials && key ? await releaseName() : false
  // The profile with its subcollections (games, pushTokens), which deleting the document alone would leave behind.
  await db.recursiveDelete(userRef)

  try {
    await auth.deleteUser(uid)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
  if (credentials) released = await releaseName()
  return { deleted: refs.size + Number(released) }
}

// POST /api/delete-account, with the ID token of the account to delete (fresh, after signing in again).
export async function deleteAccount({ db, auth, idToken, now = Date.now() }) {
  if (!idToken) return reply(401, { error: 'unauthenticated' })
  let decoded
  try {
    decoded = await auth.verifyIdToken(idToken, true)
  } catch {
    return reply(401, { error: 'unauthenticated' })
  }
  if (isUsernameCredentialUid(decoded.uid)) return reply(401, { error: 'unauthenticated' })
  if (now - decoded.auth_time * 1000 > RECENT_SIGN_IN_MS) return reply(403, { error: 'requires_recent_login' })
  const usernameSession = decoded.firebase?.sign_in_provider === 'custom' && decoded.geogameUsernamePassword === true
  if (!usernameSession && await hasUsernameCredential(db, decoded.uid)) {
    const { linkedEmail } = (await db.doc(`usernameCredentials/${decoded.uid}`).get()).data() ?? {}
    const nativeLinkSession = decoded.firebase?.sign_in_provider === 'password' && decoded.email_verified === true
      && typeof linkedEmail === 'string' && decoded.email?.toLowerCase() === linkedEmail
    if (!nativeLinkSession) return reply(403, { error: 'requires_recent_login' })
  }
  await deleteAccountData({ db, auth, uid: decoded.uid })
  return reply(200, { deleted: true })
}

// Last time an account was used: its last sign-in, or the last refresh of its session (an app that stays signed in
// refreshes its token every hour while open).
export function lastActivity(user) {
  const { creationTime, lastSignInTime, lastRefreshTime } = user.metadata ?? {}
  return Math.max(...[creationTime, lastSignInTime, lastRefreshTime].map((time) => (time ? Date.parse(time) : 0)))
}

async function observeMissingPlayer({ db, auth, uid, now }) {
  const ref = db.doc(`usernameCredentials/${uid}`)
  const observed = await ref.get()
  if (!canObserveMissingUsernamePlayer(observed.data(), now)) return undefined

  let missing = false
  try {
    await auth.getUser(uid)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
    missing = true
  }

  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref)
    // An intervening sign-in, recovery, or deletion can invalidate the Auth observation.
    if (!current.updateTime?.isEqual(observed.updateTime)) return undefined
    const { missingPlayerSince } = current.data()
    if (!missing) {
      if (missingPlayerSince != null) transaction.update(ref, { missingPlayerSince: FieldValue.delete() })
    } else if (!Number.isFinite(missingPlayerSince)) {
      // The password identity's last activity cannot tell us when the player identity was lost.
      transaction.update(ref, { missingPlayerSince: now })
    } else if (now - missingPlayerSince > INACTIVE_ACCOUNT_MS) {
      return missingPlayerSince
    }
    return undefined
  })
}

// Daily cleanup: accounts unused for INACTIVE_ACCOUNT_MS, at most `limit` per run (the next runs take the rest).
export async function deleteInactiveAccounts({ db, auth, now = Date.now(), limit = 50, getUsernameProvider = () => getUsernamePasswordProvider(auth) }) {
  const staged = await discardExpiredUsernameSignups({ db, auth, getProvider: getUsernameProvider, now, limit })
  const pending = await db.collection('usernameCredentials')
    .where('deletionStartedAt', '<=', Timestamp.fromMillis(now - RECENT_SIGN_IN_MS)).limit(limit).get()
  for (const doc of pending.docs) await deleteAccountData({ db, auth, uid: doc.id, getUsernameProvider })
  const counts = {
    ...(staged ? { discardedUsernameSignups: staged } : {}),
    ...(pending.size ? { resumedUsernameDeletions: pending.size } : {}),
  }
  let deleted = 0
  let scheduled = 0
  const result = () => ({ inactiveAccounts: deleted, ...counts, ...(scheduled ? { scheduledUsernameDeletions: scheduled } : {}) })
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const user of page.users) {
      if (deleted + scheduled >= limit) return result()
      const last = lastActivity(user)
      // No date at all: never deleted on a guess.
      if (last > 0 && now - last > INACTIVE_ACCOUNT_MS) {
        let uid = user.uid
        let expectedMissingSince
        if (isUsernameCredentialUid(uid)) {
          uid = playerUidForUsernameCredential(uid)
          if (!uid) continue
          expectedMissingSince = await observeMissingPlayer({ db, auth, uid, now })
          if (expectedMissingSince === undefined) continue
        }
        const removal = await deleteAccountData({ db, auth, uid, getUsernameProvider, deferUsernameWait: true, expectedMissingSince, observationNow: now })
        if (removal.skipped) continue
        if (removal.pending) scheduled += 1
        else deleted += 1
      }
    }
    pageToken = page.pageToken
  } while (pageToken)
  return result()
}

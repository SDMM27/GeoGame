// Deleting an account and everything tied to it (right to erasure). Called by POST /api/delete-account for the
// account's owner, and by the daily cleanup for accounts unused for INACTIVE_ACCOUNT_MS.
// Deleted: users/{uid} with its games and pushTokens, usernames/{key}, the account's leaderboard entries and the
// reports made by it or about those entries, friendships, invites sent and received, invitePushLimits/{uid}, then
// the Firebase Auth account. Rooms keep the pseudo until they expire (10 days at most, api/cleanup-expired.mjs).

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
export async function deleteAccountData({ db, auth, uid }) {
  const userRef = db.doc(`users/${uid}`)
  const [profile, friendships, invitesSent, invitesReceived, reportsMade, ...scores] = await Promise.all([
    userRef.get(),
    db.collection('friendships').where('users', 'array-contains', uid).get(),
    db.collection('invites').where('from', '==', uid).get(),
    db.collection('invites').where('to', '==', uid).get(),
    db.collection('reports').where('reporter', '==', uid).get(),
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
    ...invitesSent.docs, ...invitesReceived.docs]) {
    refs.set(snapshot.ref.path, snapshot.ref)
  }
  if (profile.exists) {
    const { username, usernameKey } = profile.data()
    const key = usernameKey ?? username?.toLowerCase()
    // Only if it is still this account's (it always should be).
    if (key) {
      const claimed = await db.doc(`usernames/${key}`).get()
      if (claimed.exists && claimed.data().uid === uid) refs.set(claimed.ref.path, claimed.ref)
    }
  }
  refs.set(`invitePushLimits/${uid}`, db.doc(`invitePushLimits/${uid}`))
  await deleteRefs(db, [...refs.values()])
  // The profile with its subcollections (games, pushTokens), which deleting the document alone would leave behind.
  await db.recursiveDelete(userRef)

  try {
    await auth.deleteUser(uid)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
  return { deleted: refs.size }
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
  if (now - decoded.auth_time * 1000 > RECENT_SIGN_IN_MS) return reply(403, { error: 'requires_recent_login' })
  await deleteAccountData({ db, auth, uid: decoded.uid })
  return reply(200, { deleted: true })
}

// Last time an account was used: its last sign-in, or the last refresh of its session (an app that stays signed in
// refreshes its token every hour while open).
export function lastActivity(user) {
  const { creationTime, lastSignInTime, lastRefreshTime } = user.metadata ?? {}
  return Math.max(...[creationTime, lastSignInTime, lastRefreshTime].map((time) => (time ? Date.parse(time) : 0)))
}

// Daily cleanup: accounts unused for INACTIVE_ACCOUNT_MS, at most `limit` per run (the next runs take the rest).
export async function deleteInactiveAccounts({ db, auth, now = Date.now(), limit = 50 }) {
  let deleted = 0
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const user of page.users) {
      if (deleted >= limit) return { inactiveAccounts: deleted }
      const last = lastActivity(user)
      // No date at all: never deleted on a guess.
      if (last > 0 && now - last > INACTIVE_ACCOUNT_MS) {
        await deleteAccountData({ db, auth, uid: user.uid })
        deleted += 1
      }
    }
    pageToken = page.pageToken
  } while (pageToken)
  return { inactiveAccounts: deleted }
}

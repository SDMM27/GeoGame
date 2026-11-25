import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { FieldValue } from 'firebase-admin/firestore'

import { checkNewPassword, checkPasswordInput, checkRateLimit, normalizeUsername, usernameKey, validateUsername } from './usernameAccountPolicy.mjs'

const PROVISIONING_MS = 15 * 60 * 1000
const RECOVERY_MS = 2 * 60 * 1000
const RECOVERY_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/
const USERNAME_UID_PATTERN = /^[a-f0-9-]{36}$/
const ACTIONS = new Set(['signup', 'signin', 'recover', 'rotate'])

const reply = (status, body) => ({ status, body })
const failure = (status, error) => reply(status, { error })
const credentialsRef = (db, uid) => db.doc(`usernameCredentials/${uid}`)
const directoryRef = (db, key) => db.doc(`usernames/${key}`)
const newCode = () => randomBytes(16).toString('base64url')
const hashCode = (code) => createHash('sha256').update(code).digest('hex')

export async function hasUsernameCredential(db, uid) {
  return typeof uid === 'string' && USERNAME_UID_PATTERN.test(uid) && (await credentialsRef(db, uid).get()).exists
}

function validRecoveryCode(code, hash) {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)
    && timingSafeEqual(Buffer.from(hashCode(code), 'hex'), Buffer.from(hash, 'hex'))
}

async function deleteFirebaseUser(auth, uid) {
  try {
    await auth.deleteUser(uid)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
}

// Keep interrupted signups discoverable by the daily cleanup. A successful commit drops the expiry
// and takes the public username in one transaction, so ambiguous commit errors can't erase an account.
async function discardProvisioning({ db, auth, provider, ref, expiredBefore }) {
  const discard = await db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data()
    if (!data || !['provisioning', 'discarding'].includes(data.state)
      || (expiredBefore != null && data.provisioningExpiresAt > expiredBefore)) return false
    transaction.update(ref, { state: 'discarding' })
    return true
  })
  if (!discard) return false
  if (!provider) throw new Error('Username password provider unavailable for cleanup')
  await provider.remove(ref.id)
  await deleteFirebaseUser(auth, ref.id)
  await ref.delete()
  return true
}

export async function discardExpiredUsernameSignups({ db, auth, getProvider, now = Date.now(), limit = 50 }) {
  const staged = await db.collection('usernameCredentials').where('provisioningExpiresAt', '<=', now).limit(limit).get()
  const provider = staged.empty ? null : getProvider()
  let discarded = 0
  for (const doc of staged.docs) {
    if (await discardProvisioning({ db, auth, provider, ref: doc.ref, expiredBefore: now })) discarded += 1
  }
  return discarded
}

async function signup({ db, auth, provider, username, key, password, clock }) {
  const directory = directoryRef(db, key)
  if ((await directory.get()).exists) return failure(409, 'username_taken')

  const uid = randomUUID()
  const ref = credentialsRef(db, uid)
  const recoveryCode = newCode()
  await ref.create({ state: 'provisioning', provisioningExpiresAt: clock() + PROVISIONING_MS })
  let provisioned = false
  try {
    await auth.createUser({ uid, displayName: username })
    await provider.create(uid, password)
    provisioned = true
    const created = await db.runTransaction(async (transaction) => {
      const [claimed, pending] = await transaction.getAll(directory, ref)
      if (pending.data()?.state !== 'provisioning') throw new Error('Username signup was discarded')
      if (claimed.exists) return false
      transaction.create(directory, { uid, username })
      transaction.create(db.doc(`users/${uid}`), {
        username, usernameKey: key, createdAt: FieldValue.serverTimestamp(), usernamePassword: true,
      })
      transaction.set(ref, { key, recoveryHash: hashCode(recoveryCode), revision: 0, state: 'active' })
      return true
    })
    if (created) return reply(201, { recoveryCode })
  } catch (error) {
    // Ambiguous external writes are left for the delayed cleanup, after remote requests can finish.
    if (provisioned) await discardProvisioning({ db, auth, provider, ref }).catch(() => {})
    throw error
  }
  // The same name can be claimed by email/Google while the password identity is created.
  await discardProvisioning({ db, auth, provider, ref })
  return failure(409, 'username_taken')
}

async function lookup(db, key) {
  const { uid, username } = (await directoryRef(db, key).get()).data() ?? {}
  if (typeof uid !== 'string' || !USERNAME_UID_PATTERN.test(uid)) return null
  const ref = credentialsRef(db, uid)
  const data = (await ref.get()).data()
  return data?.key === key ? { uid, username, ref, data } : null
}

const sameActive = (snapshot, revision) => snapshot.data()?.state === 'active' && snapshot.data()?.revision === revision

async function signin({ db, issueToken, provider, account, password }) {
  if (account?.data.state !== 'active' || !await provider.verify(account.uid, password)) {
    return failure(401, 'wrong_credentials')
  }
  const token = await issueToken(account.uid)
  const current = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(account.ref)
    // Check for concurrent recovery or deletion and clear any stale inactivity observation.
    if (!sameActive(snapshot, account.data.revision)) return false
    if (snapshot.data().missingPlayerSince != null) {
      transaction.update(account.ref, { missingPlayerSince: FieldValue.delete() })
    }
    return true
  })
  if (!current) return failure(401, 'wrong_credentials')
  return reply(200, { token, uid: account.uid })
}

async function disableAndUnlinkIdentity(auth, uid, username) {
  const disable = () => auth.updateUser(uid, { disabled: true, displayName: username })
  let user
  try {
    user = await disable()
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
    // A holder of a Firebase session can delete the Auth record directly. Restore the disabled
    // player identity at its original UID using the authoritative username record.
    try {
      user = await auth.createUser({ uid, displayName: username, disabled: true })
    } catch (error) {
      if (error?.code !== 'auth/uid-already-exists') throw error
      user = await disable()
    }
  }

  const providers = new Set(user.providerData.map(({ providerId }) => providerId))
  if (user.email) providers.add('password')
  if (user.phoneNumber) providers.add('phone')
  const hasFactors = (identity) => Boolean(identity.multiFactor?.enrolledFactors.length)
  if (providers.size || hasFactors(user)) {
    user = await auth.updateUser(uid, {
      ...(providers.size ? { providersToUnlink: [...providers] } : {}),
      ...(hasFactors(user) ? { multiFactor: { enrolledFactors: null } } : {}),
    })
  }
  if (!user.disabled || user.providerData.length || user.email || user.phoneNumber || hasFactors(user)) {
    throw new Error('Username Firebase identity could not be isolated')
  }
}

async function recover({ db, auth, provider, account, password, recoveryCode, clock, wait, exchangeWindowSeconds }) {
  if (!account) return failure(401, 'invalid_recovery_code')
  const { uid, ref, username } = account
  const operation = randomUUID()
  const lock = await db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data()
    if (!data || !['active', 'recovering'].includes(data.state) || !validRecoveryCode(recoveryCode, data.recoveryHash)) {
      return 'invalid_recovery_code'
    }
    const now = clock()
    if (data.state === 'recovering' && data.leaseUntil > now) return 'too_many_requests'
    transaction.update(ref, { state: 'recovering', operation, leaseUntil: now + RECOVERY_MS })
    return null
  })
  if (lock) return failure(lock === 'too_many_requests' ? 429 : 401, lock)
  // Once the lease commits, signin cannot deliver another token. Wait until every preceding
  // custom token expires, then move the whole-second Firebase refresh-token cutoff past it.
  const revokeAfter = (Math.floor(clock() / 1000) + exchangeWindowSeconds + 1) * 1000

  // Keep the current code usable after the lease expires if Firebase fails mid-recovery.
  // The credential is unavailable for sign-in until both writes and the final transaction finish.
  await disableAndUnlinkIdentity(auth, uid, username)
  await provider.setPassword(uid, password)
  const remaining = revokeAfter - clock()
  if (remaining > 0) await wait(remaining)
  await auth.revokeRefreshTokens(uid)

  // Renew the matching lease before re-enabling Firebase. A concurrent retry or deletion may
  // not change ownership while we make the external write and commit the replacement code.
  const requireCurrentLease = async (transaction) => {
    const data = (await transaction.get(ref)).data()
    if (data?.state !== 'recovering' || data.operation !== operation || data.leaseUntil <= clock()) {
      throw new Error('Username recovery lease lost')
    }
    return data
  }
  await db.runTransaction(async (transaction) => {
    await requireCurrentLease(transaction)
    transaction.update(ref, { leaseUntil: clock() + RECOVERY_MS })
  })
  await auth.updateUser(uid, { disabled: false })
  const replacement = newCode()
  await db.runTransaction(async (transaction) => {
    const data = await requireCurrentLease(transaction)
    transaction.set(ref, { key: data.key, recoveryHash: hashCode(replacement), revision: data.revision + 1, state: 'active' })
  })
  return reply(200, { recoveryCode: replacement })
}

async function rotate({ db, auth, provider, account, password, idToken }) {
  if (!idToken) return failure(401, 'wrong_credentials')
  const decoded = await auth.verifyIdToken(idToken, true).catch(() => null)
  if (account?.data.state !== 'active' || account.uid !== decoded?.uid || !await provider.verify(account.uid, password)) {
    return failure(401, 'wrong_credentials')
  }
  const recoveryCode = newCode()
  const changed = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(account.ref)
    if (!sameActive(snapshot, account.data.revision)) return false
    transaction.update(account.ref, { recoveryHash: hashCode(recoveryCode), revision: account.data.revision + 1 })
    return true
  })
  return changed ? reply(200, { recoveryCode }) : failure(401, 'wrong_credentials')
}

// Also called by inactive-account cleanup. A deletion tombstone blocks signin/recovery if Auth is
// temporarily unreachable. The provider's delete operation is idempotent, including for a missing user.
export async function removeUsernameCredential({
  db, auth, uid, getProvider, clock = Date.now, wait = delay, exchangeWindowSeconds = 0, deferWait = false, expectedMissingSince,
}) {
  const absent = expectedMissingSince === undefined ? null : { skipped: true }
  if (!USERNAME_UID_PATTERN.test(uid)) return absent
  const ref = credentialsRef(db, uid)
  if (!(await ref.get()).exists) return absent
  const provider = getProvider()
  if (!provider) throw new Error('Username password provider unavailable for deletion')
  const remove = await db.runTransaction(async (transaction) => {
    const data = (await transaction.get(ref)).data()
    if (!data) return false
    if (expectedMissingSince !== undefined && (data.state !== 'active' || data.missingPlayerSince !== expectedMissingSince)) return false
    if (data.state === 'recovering' && data.leaseUntil > clock()) throw new Error('Username recovery in progress')
    if (['provisioning', 'discarding'].includes(data.state)) throw new Error('Username provisioning in progress')
    if (data.state !== 'deleting') {
      transaction.set(ref, { state: 'deleting', key: data.key, deletionStartedAt: FieldValue.serverTimestamp() })
    }
    return true
  })
  if (!remove) return absent
  const marker = (await ref.get()).data()
  if (!marker) return absent

  // Disable Firebase sign-in while previously issued custom tokens can still be exchanged.
  // Deleting the Firebase user immediately would let a surviving token create it again.
  try {
    await auth.updateUser(uid, { disabled: true })
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
  if (exchangeWindowSeconds > 0) {
    const deleteAfter = (Math.floor(marker.deletionStartedAt.toMillis() / 1000) + exchangeWindowSeconds + 1) * 1000
    const remaining = deleteAfter - clock()
    if (remaining > 0 && deferWait) return { ref, key: marker.key, pending: true }
    if (remaining > 0) await wait(remaining)
  }
  await provider.remove(uid)
  return { ref, key: marker.key, pending: false }
}

export async function usernameAccount({
  db, auth, provider, body, idToken, ip, clock = Date.now, allow = checkRateLimit, validatePassword = checkNewPassword,
  issueToken = (uid) => auth.createCustomToken(uid, { geogameUsernamePassword: true }), wait = delay, exchangeWindowSeconds = 0,
}) {
  if (!provider) return failure(503, 'not_enabled')
  const { action, password } = body ?? {}
  if (!ACTIONS.has(action)) return failure(400, 'generic')
  const invalidProof = action === 'recover' ? 'invalid_recovery_code' : 'wrong_credentials'
  const username = typeof body.username === 'string' && body.username.length <= 200 ? normalizeUsername(body.username) : ''
  const invalidUsername = validateUsername(username)
  if (invalidUsername && action === 'signup') return failure(400, invalidUsername)
  // A later update to the profanity list must not lock existing players out.
  if (invalidUsername && invalidUsername !== 'username_forbidden') return failure(401, invalidProof)
  const key = usernameKey(username)
  if (!await allow(db, { ip, key, action })) return failure(429, 'too_many_requests')
  const newPassword = action === 'signup' || action === 'recover'
  if (!checkPasswordInput(password)) return failure(newPassword ? 400 : 401, newPassword ? 'weak_password' : invalidProof)

  if (action === 'signup') {
    const invalid = await validatePassword(password, username)
    if (invalid) return failure(400, invalid)
    return signup({ db, auth, provider, username, key, password, clock })
  }
  const account = await lookup(db, key)
  if (action === 'signin') return signin({ db, issueToken, provider, account, password })
  if (action === 'rotate') return rotate({ db, auth, provider, account, password, idToken })

  const recoveryCode = typeof body.recoveryCode === 'string' ? body.recoveryCode.trim() : ''
  if (!RECOVERY_CODE_PATTERN.test(recoveryCode) || !validRecoveryCode(recoveryCode, account?.data.recoveryHash)) {
    return failure(401, 'invalid_recovery_code')
  }
  const invalid = await validatePassword(password, username)
  if (invalid) return failure(400, invalid)
  return recover({ db, auth, provider, account, password, recoveryCode, clock, wait, exchangeWindowSeconds })
}

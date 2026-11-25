import { randomUUID } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { identityToolkitUrl } from './usernameAccountProvider.mjs'
import { usernameCredentialUid } from './usernameCredentialUid.mjs'

const PROOF_MS = 60 * 60 * 1000
const LEASE_MS = 2 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const reply = (status, body) => ({ status, body })
const failure = (status, error) => reply(status, { error })
const proofRef = (db, uid) => db.doc(`usernameEmailProofs/${uid}`)

export const emailLinkInProgress = (data, now) => data.emailProof?.leaseUntil > now

export function activationEmail(data) {
  return data.linkedEmail ?? (data.emailProof?.confirmed ? data.emailProof.email : null)
}

export async function usernamePasswordProof(provider, { uid, data }, password) {
  const email = activationEmail(data)
  if (email) {
    const verified = await provider.verifyLinked(uid, email, password)
    if (verified !== null || data.linkedEmail) return verified === true ? { email } : null
  }
  return await provider.verify(uid, password) ? {} : null
}

async function getUser(auth, uid) {
  try {
    return await auth.getUser(uid)
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return null
    throw error
  }
}

async function deleteProof(auth, uid) {
  try {
    await auth.deleteUser(uid)
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error
  }
}

export async function eraseUsernameEmailProof(db, auth, uid) {
  if (!uid) return
  await deleteProof(auth, uid)
  await proofRef(db, uid).delete()
}

// A confirmed action link updates only this temporary Auth identity. It cannot sign into the
// player account, even if a later recovery or deletion invalidates the pending link.
export async function sendUsernameEmailProof(auth, proofUid, email, env = process.env, request = fetch) {
  async function call(action, body) {
    const response = await request(identityToolkitUrl(env, action), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      redirect: 'error', signal: AbortSignal.timeout(8000),
    })
    const data = await response.json()
    if (response.ok) return data
    const code = data?.error?.message?.split(' : ')[0]
    if (code === 'EMAIL_EXISTS') return { error: 'link_email_in_use' }
    if (code === 'INVALID_EMAIL' || code === 'INVALID_RECIPIENT_EMAIL') return { error: 'invalid_email' }
    if (response.status === 429 || code === 'TOO_MANY_ATTEMPTS_TRY_LATER' || code === 'QUOTA_EXCEEDED') {
      return { error: 'too_many_requests' }
    }
    throw new Error('Firebase email verification request failed')
  }

  const token = await auth.createCustomToken(proofUid)
  const session = await call('signInWithCustomToken', { token, returnSecureToken: true })
  if (session.error) return session.error
  if (!session.idToken || (await auth.verifyIdToken(session.idToken)).uid !== proofUid) {
    throw new Error('Unexpected email verification identity')
  }
  const result = await call('sendOobCode', { requestType: 'VERIFY_AND_CHANGE_EMAIL', newEmail: email, idToken: session.idToken })
  return result.error ?? null
}

async function start({ db, auth, account, email, clock, sendProof = sendUsernameEmailProof }) {
  const { uid, ref, data } = account
  if (data.linkedEmail) return failure(409, 'link_email_exists')
  if (data.emailProof?.confirmed) return failure(409, 'link_email_finish')

  const proofUid = usernameCredentialUid(randomUUID())
  const proof = { uid: proofUid, email, expiresAt: clock() + PROOF_MS }
  const tracked = proofRef(db, proofUid)
  const staged = await db.runTransaction(async (transaction) => {
    const current = (await transaction.get(ref)).data()
    if (current?.state !== 'active' || current.revision !== data.revision || current.linkedEmail
      || current.emailProof?.confirmed || emailLinkInProgress(current, clock())) return null
    transaction.create(tracked, { playerUid: uid, expiresAt: proof.expiresAt })
    transaction.update(ref, { emailProof: proof })
    return { previous: current.emailProof?.uid }
  })
  if (!staged) return failure(409, 'link_email_finish')
  const cancel = async () => {
    const discard = await db.runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data()
      if (current?.emailProof?.uid === proofUid) {
        if (current.emailProof.confirmed) return false
        transaction.update(ref, { emailProof: FieldValue.delete() })
      }
      return true
    })
    if (discard) await eraseUsernameEmailProof(db, auth, proofUid)
  }
  try {
    if (staged.previous) await eraseUsernameEmailProof(db, auth, staged.previous)
    await auth.createUser({ uid: proofUid, email: `${proofUid.slice('username-credential:'.length)}@verify.geogame.invalid` })
    if ((await ref.get()).data()?.emailProof?.uid !== proofUid) {
      await cancel()
      return failure(409, 'link_email_finish')
    }
    const error = await sendProof(auth, proofUid, email)
    if (!error) return reply(200, { pendingEmail: email })
    await cancel()
    return failure(error === 'link_email_in_use' ? 409 : error === 'too_many_requests' ? 429 : 400, error)
  } catch (error) {
    await cancel().catch(() => {})
    throw error
  }
}

async function finish({ db, auth, provider, account, password, clock, wait, exchangeWindowSeconds }) {
  const { uid, ref, data, username } = account
  const proof = data.emailProof
  if (data.linkedEmail) return failure(409, 'link_email_exists')
  if (!proof || (!proof.confirmed && proof.expiresAt <= clock())) return failure(400, 'link_email_expired')
  if (emailLinkInProgress(data, clock())) return failure(409, 'link_email_finish')
  if (!proof.confirmed) {
    const identity = await getUser(auth, proof.uid)
    if (!identity?.emailVerified || identity.email?.toLowerCase() !== proof.email) {
      return failure(400, 'link_email_unverified')
    }
  }

  // Store the mailbox proof before releasing Firebase's temporary reservation of the address.
  // If the write to Auth succeeded but the Firestore commit did not, keep the canonical password.
  const leaseUntil = clock() + LEASE_MS
  const locked = await db.runTransaction(async (transaction) => {
    const current = (await transaction.get(ref)).data()
    if (current?.state !== 'active' || current.revision !== data.revision || current.linkedEmail
      || current.emailProof?.uid !== proof.uid || emailLinkInProgress(current, clock())) return false
    transaction.update(ref, { emailProof: { ...proof, confirmed: true, leaseUntil } })
    return true
  })
  if (!locked) return failure(409, 'link_email_finish')

  let completed = false
  let collision = false
  try {
    // Let pre-link username tokens expire before Firebase enables native email resets.
    if (exchangeWindowSeconds > 0) {
      const revokeAfter = (Math.floor(clock() / 1000) + exchangeWindowSeconds + 1) * 1000
      const remaining = revokeAfter - clock()
      if (remaining > 0) await wait(remaining)
    }
    const identity = await getUser(auth, uid)
    if (!identity || identity.disabled) return failure(401, 'wrong_credentials')
    const currentEmail = proof.confirmed && identity.emailVerified && identity.email?.toLowerCase() === proof.email
    if (!currentEmail) {
      await deleteProof(auth, proof.uid)
      try {
        const providers = new Set(identity.providerData.map(({ providerId }) => providerId).filter((id) => id !== 'password'))
        if (identity.phoneNumber) providers.add('phone')
        await auth.updateUser(uid, {
          email: proof.email, emailVerified: true, password, displayName: username,
          ...(providers.size ? { providersToUnlink: [...providers] } : {}),
          ...(identity.multiFactor?.enrolledFactors.length ? { multiFactor: { enrolledFactors: null } } : {}),
        })
      } catch (error) {
        if (error?.code !== 'auth/email-already-exists') throw error
        collision = true
        return failure(409, 'link_email_in_use')
      }
    }
    completed = true
  } finally {
    await db.runTransaction(async (transaction) => {
      const current = (await transaction.get(ref)).data()
      if (current?.emailProof?.uid !== proof.uid || current.emailProof.leaseUntil !== leaseUntil) return
      if (completed || collision) {
        transaction.update(ref, {
          emailProof: FieldValue.delete(),
          ...(completed ? { linkedEmail: proof.email, revision: current.revision + 1 } : {}),
        })
        transaction.delete(proofRef(db, proof.uid))
      } else {
        transaction.update(ref, { 'emailProof.leaseUntil': 0 })
      }
    })
  }
  await provider.remove(uid).catch(() => {})
  return reply(200, { linkedEmail: proof.email })
}

export async function usernameAccountEmail({ db, auth, provider, account, action, body, playerUid, clock, sendProof, wait, exchangeWindowSeconds }) {
  if (!account || account.uid !== playerUid || account.data.state !== 'active') return failure(401, 'wrong_credentials')
  const { data } = account
  if (action === 'email-status') {
    const pending = data.emailProof
    return reply(200, {
      linkedEmail: data.linkedEmail ?? null,
      pendingEmail: pending && (pending.confirmed || pending.expiresAt > clock()) ? pending.email : null,
    })
  }

  if (!await usernamePasswordProof(provider, account, body.password)) return failure(401, 'wrong_credentials')
  if (action === 'email-finish') {
    return finish({ db, auth, provider, account, password: body.password, clock, wait, exchangeWindowSeconds })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || email.endsWith('.invalid')) return failure(400, 'invalid_email')
  return start({ db, auth, account, email, clock, sendProof })
}

export async function discardExpiredEmailProofs({ db, auth, now = Date.now(), limit = 50 }) {
  const snapshots = await db.collection('usernameEmailProofs').where('expiresAt', '<=', now).limit(limit).get()
  for (const doc of snapshots.docs) {
    const playerRef = db.doc(`usernameCredentials/${doc.data().playerUid}`)
    await deleteProof(auth, doc.id)
    await db.runTransaction(async (transaction) => {
      const proof = (await transaction.get(playerRef)).data()?.emailProof
      if (proof?.uid === doc.id && !proof.confirmed) transaction.update(playerRef, { emailProof: FieldValue.delete() })
      transaction.delete(doc.ref)
    })
  }
  return snapshots.size
}

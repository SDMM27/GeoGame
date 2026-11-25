import { useEffect, useState } from 'react'
import { accountErrorKey, signIn } from '../utils/account'
import { finishUsernameEmailLink, startUsernameEmailLink, usernameEmailStatus } from '../utils/usernameAccount'

export function useUsernameEmailLink(auth, { uid, username }, apiOrigin) {
  const [status, setStatus] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    usernameEmailStatus(auth, { username, apiOrigin }).then((value) => {
      if (active) setStatus((current) => current ?? value)
    }).catch((err) => {
      if (active) setError(accountErrorKey(err))
    })
    return () => { active = false }
  }, [auth, username, apiOrigin, uid])

  const pendingEmail = editing ? null : status?.pendingEmail
  const canSubmit = Boolean(password && (pendingEmail || email.trim()))

  const submit = async () => {
    if (!canSubmit || submitting || auth.currentUser?.uid !== uid) return
    setError(null)
    setSubmitting(true)
    try {
      const credentials = { username, email, password, apiOrigin }
      const result = pendingEmail
        ? await finishUsernameEmailLink(auth, credentials)
        : await startUsernameEmailLink(auth, credentials)
      setStatus(result)
      setPassword('')
      setEditing(false)
      // Adding the password may invalidate the current session. Reuse the new native login.
      if (result.linkedEmail && auth.currentUser?.uid === uid) {
        await signIn(auth, { email: result.linkedEmail, password }).catch(() => {})
      }
    } catch (err) {
      setError(accountErrorKey(err))
    } finally {
      setSubmitting(false)
    }
  }

  const useAnotherEmail = () => {
    setEditing(true)
    setError(null)
    setPassword('')
  }

  return {
    linkedEmail: status?.linkedEmail, pendingEmail, email, setEmail, password, setPassword,
    error, canSubmit, submitting, submit, useAnotherEmail,
  }
}

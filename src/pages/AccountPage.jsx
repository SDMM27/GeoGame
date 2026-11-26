import React, { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import LegalLinks from '../components/LegalLinks'
import { LEGAL_PATHS } from '../legal/legalInfo'
import { auth, useAccount } from '../auth'
import {
  accountErrorKey,
  changeAccountPassword,
  chooseUsername,
  deleteAccount,
  PASSWORD_MIN,
  resetPassword,
  signIn,
  signOut,
  signUp,
  USERNAME_MAX,
} from '../utils/account'
import {
  recoverUsernameAccount,
  rotateUsernameRecoveryCode,
  signInWithUsername,
  signUpWithUsername,
  usernameAccountAvailable,
  USERNAME_PASSWORD_MIN,
} from '../utils/usernameAccount'
import { reauthenticateWithGoogle, signInWithGoogle } from '../utils/accountGoogle'
import FriendsPanel from '../components/profile/FriendsPanel'
import ProfileBody from '../components/profile/ProfileBody'
import ProfileHeader from '../components/profile/ProfileHeader'
import DecorationPicker from '../components/profile/DecorationPicker'
import FlagCollection from '../components/profile/FlagCollection'
import ScrollCollection from '../components/profile/ScrollCollection'
import CollapsibleSection from '../components/CollapsibleSection'
import { useFriendships } from '../hooks/usePlayerProfile'
import { useDecoration } from '../hooks/useDecoration'
import { useUsernameEmailLink } from '../hooks/useUsernameEmailLink'
import './AccountPage.css'

function GoogleButton({ disabled, onError }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)

  const handleClick = async () => {
    setPending(true)
    onError(null)
    try {
      await signInWithGoogle(auth)
    } catch (err) {
      const key = accountErrorKey(err)
      if (key !== 'cancelled') onError(key)
      setPending(false)
    }
  }

  return (
    <button type="button" className="account-google" onClick={handleClick} disabled={pending || disabled}>
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
      </svg>
      {t('account.google')}
    </button>
  )
}

function RecoveryCode({ code, onSaved }) {
  const { t } = useTranslation()
  return (
    <>
      <h2 className="account-section-title">{t('account.recovery_title')}</h2>
      <p className="account-intro">{t('account.recovery_save_hint')}</p>
      <code className="account-recovery-code">{code}</code>
      <button type="button" className="account-submit" onClick={onSaved}>
        {t('account.recovery_saved')}
      </button>
    </>
  )
}

function PasswordField({ label, hint, ...inputProps }) {
  const { t } = useTranslation()
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <div className="account-field">
      <label htmlFor={id}>{label}</label>
      <div className="account-password">
        <input id={id} type={visible ? 'text' : 'password'} spellCheck={false} autoCapitalize="none" {...inputProps} />
        <button
          type="button"
          className="account-password-toggle"
          aria-label={t(visible ? 'account.hide_password' : 'account.show_password')}
          aria-controls={id}
          onClick={() => setVisible((value) => !value)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function AuthForm() {
  const { t } = useTranslation()
  const [mode, setMode] = useState('signin')
  const [method, setMethod] = useState('email')
  const [usernameAvailable, setUsernameAvailable] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [issuedCode, setIssuedCode] = useState('')

  useEffect(() => {
    let active = true
    usernameAccountAvailable().then((available) => {
      if (active) setUsernameAvailable(available)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const resetFormMessages = () => {
    setPassword('')
    setConfirmation('')
    setRecoveryCode('')
    setIdentifier('')
    setError(null)
    setNotice(null)
  }

  const switchMode = (next) => {
    setMode(next)
    resetFormMessages()
  }

  const signingUp = mode === 'signup'
  const recovering = mode === 'recover'
  const usingUsername = method === 'username'
  const newPassword = signingUp || recovering
  const usernamePassword = recovering || (signingUp && usingUsername)
  const recoveringPending = recovering && submitting
  const confirmationInvalid = error === 'password_mismatch' && password !== confirmation
  const visibleError = error === 'password_mismatch' && !confirmationInvalid ? null : error
  // Sign-in with a single "email or username" field when username accounts exist.
  const combinedLogin = !signingUp && !recovering && usernameAvailable

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setNotice(null)
    if (signingUp && password !== confirmation) {
      setError('password_mismatch')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (recovering) {
        const code = await recoverUsernameAccount({ username, password, recoveryCode })
        resetFormMessages()
        setIssuedCode(code)
        setSubmitting(false)
      } else if (signingUp && usingUsername) {
        const code = await signUpWithUsername({ username, password })
        resetFormMessages()
        setIssuedCode(code)
        setSubmitting(false)
      } else if (signingUp) {
        await signUp(auth, { email, password, username })
      } else if (combinedLogin) {
        // Usernames can't contain '@' (usernameRules), so the identifier routes unambiguously.
        if (identifier.includes('@')) await signIn(auth, { email: identifier, password })
        else await signInWithUsername(auth, { username: identifier, password })
      } else if (usingUsername) {
        await signInWithUsername(auth, { username, password })
      } else {
        await signIn(auth, { email, password })
      }
    } catch (err) {
      setError(accountErrorKey(err))
      setSubmitting(false)
    }
  }

  const handleForgot = async () => {
    if (submitting) return
    const loginId = (combinedLogin ? identifier : email).trim()
    // A username (no '@') has no email to reset: it goes through the recovery code instead.
    if (usernameAvailable && loginId && !loginId.includes('@')) {
      setUsername(loginId)
      switchMode('recover')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await resetPassword(auth, loginId)
      setNotice(t('account.reset_sent', { email: loginId }))
    } catch (err) {
      setError(accountErrorKey(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (issuedCode) {
    return (
      <div className="account-card">
        <RecoveryCode code={issuedCode} onSaved={() => {
          setIssuedCode('')
          switchMode('signin')
        }} />
      </div>
    )
  }

  return (
    <div className="account-card">
      {recovering ? (
        <>
          <h2 className="account-section-title">{t('account.recover_title')}</h2>
          <p className="account-intro">{t('account.recovery_wait_hint')}</p>
        </>
      ) : (
        <>
          <div className="account-tabs" role="tablist">
            {['signin', 'signup'].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                className={`account-tab${mode === tab ? ' active' : ''}`}
                onClick={() => {
                  if (tab !== mode) switchMode(tab)
                }}
                disabled={submitting}
              >
                {t(`account.${tab}_tab`)}
              </button>
            ))}
          </div>
          <p className="account-intro">{t(`account.${mode}_intro`)}</p>

          <GoogleButton disabled={submitting} onError={setError} />
          <div className="account-divider">
            <span>{t('account.or')}</span>
          </div>
          {usernameAvailable && signingUp && (
            <div className="account-tabs">
              {['email', 'username'].map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={method === option}
                  className={`account-tab${method === option ? ' active' : ''}`}
                  disabled={submitting}
                  onClick={() => {
                    if (option === method) return
                    setMethod(option)
                    resetFormMessages()
                  }}
                >
                  {t(`account.method_${option}`)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <form onSubmit={handleSubmit} className="account-form">
        {combinedLogin && (
          <label className="account-field">
            <span>{t('account.identifier')}</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t('account.identifier_placeholder')}
              autoComplete="username"
              required
            />
          </label>
        )}
        {!combinedLogin && (signingUp || recovering || usingUsername) && (
          <label className="account-field">
            <span>{t('account.username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('account.username_placeholder')}
              maxLength={USERNAME_MAX}
              autoComplete={recovering || usingUsername ? 'username' : 'nickname'}
              required
            />
            {signingUp && <small>{t('account.username_hint')}</small>}
          </label>
        )}
        {!combinedLogin && !recovering && !usingUsername && (
          <label className="account-field">
            <span>{t('account.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('account.email_placeholder')}
              autoComplete="email"
              required
            />
          </label>
        )}
        {recovering && (
          <label className="account-field">
            <span>{t('account.recovery_code')}</span>
            <input
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={128}
              required
            />
          </label>
        )}
        <PasswordField
          key={`${mode}-${method}`}
          label={t('account.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={signingUp && !usingUsername ? t('account.password_placeholder') : ''}
          hint={usernamePassword ? t('account.username_password_hint') : undefined}
          autoComplete={newPassword ? 'new-password' : 'current-password'}
          minLength={newPassword ? (usernamePassword ? USERNAME_PASSWORD_MIN : PASSWORD_MIN) : undefined}
          required
        />
        {signingUp && (
          <PasswordField
            key={`confirmation-${method}`}
            label={t('account.confirm_password')}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
            aria-invalid={confirmationInvalid || undefined}
            aria-describedby={confirmationInvalid ? 'account-password-mismatch' : undefined}
            required
          />
        )}

        {visibleError && (
          <p id={confirmationInvalid ? 'account-password-mismatch' : undefined} className="account-error" role="alert">
            {t(`account.errors.${visibleError}`)}
          </p>
        )}
        {notice && <p className="account-notice">{notice}</p>}

        {signingUp && <SignupNotice />}
        <button type="submit" className="account-submit" disabled={submitting} aria-busy={recoveringPending || undefined}>
          {recoveringPending && <span className="account-submit-spinner" aria-hidden="true" />}
          {t(recoveringPending ? 'account.recovery_pending' : recovering ? 'account.recover_submit' : signingUp ? 'account.signup' : 'account.signin')}
        </button>
        {recovering && (
          <span className="gg-sr-only" role="status">{recoveringPending ? t('account.recovery_pending') : ''}</span>
        )}
        {mode === 'signin' && (
          <button type="button" className="account-link" disabled={submitting} onClick={handleForgot}>
            {t('account.forgot')}
          </button>
        )}
        {recovering && (
          <button type="button" className="account-link" disabled={submitting} onClick={() => switchMode('signin')}>
            {t('account.back_to_signin')}
          </button>
        )}
      </form>
    </div>
  )
}

// Shown wherever an account gets created (email form, or username choice after a first Google sign-in).
function SignupNotice() {
  return (
    <p className="account-legal">
      <Trans
        i18nKey="legal.signup_notice"
        components={{
          terms: <Link to={LEGAL_PATHS.terms} />,
          privacy: <Link to={LEGAL_PATHS.privacy} />,
        }}
      />
    </p>
  )
}

// Google's name, trimmed to what a username allows, as a starting suggestion.
function suggestUsername() {
  return (auth.currentUser?.displayName ?? '')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .trim()
    .slice(0, USERNAME_MAX)
}

function ChooseUsername() {
  const { t } = useTranslation()
  const [username, setUsername] = useState(suggestUsername)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await chooseUsername(auth, username)
    } catch (err) {
      setError(accountErrorKey(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="account-card">
      <p className="account-username">{t('account.choose_title')}</p>
      <p className="account-intro">{t('account.choose_intro')}</p>
      <form onSubmit={handleSubmit} className="account-form">
        <label className="account-field">
          <span>{t('account.username')}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('account.username_placeholder')}
            maxLength={USERNAME_MAX}
            autoComplete="nickname"
            autoFocus
            required
          />
          <small>{t('account.username_hint')}</small>
        </label>
        {error && <p className="account-error">{t(`account.errors.${error}`)}</p>}
        <SignupNotice />
        <button type="submit" className="account-submit" disabled={submitting}>
          {t('account.choose_submit')}
        </button>
        <button type="button" className="account-link" onClick={() => signOut(auth)}>
          {t('account.signout')}
        </button>
      </form>
    </div>
  )
}

function RecoveryCodeSettings({ username }) {
  const { t } = useTranslation()
  const [replacing, setReplacing] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [issuedCode, setIssuedCode] = useState('')

  const close = () => {
    setReplacing(false)
    setPassword('')
    setError(null)
    setIssuedCode('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      setIssuedCode(await rotateUsernameRecoveryCode(auth, { username, password }))
      setPassword('')
    } catch (err) {
      setError(accountErrorKey(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (issuedCode) return <RecoveryCode code={issuedCode} onSaved={close} />
  if (!replacing) {
    return (
      <button type="button" className="account-link" onClick={() => setReplacing(true)}>
        {t('account.recovery_replace')}
      </button>
    )
  }
  return (
    <form className="account-form" onSubmit={submit}>
      <p className="account-intro">{t('account.recovery_replace_intro')}</p>
      <label className="account-field">
        <span>{t('account.password')}</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="account-error">{t(`account.errors.${error}`)}</p>}
      <div className="account-row">
        <button type="button" className="account-link" onClick={close} disabled={submitting}>
          {t('account.cancel')}
        </button>
        <button type="submit" className="account-submit" disabled={submitting}>
          {t('account.recovery_replace')}
        </button>
      </div>
    </form>
  )
}

function EmailLinkSettings({ account }) {
  const { t } = useTranslation()
  const link = useUsernameEmailLink(auth, account)
  return (
    <form className="account-form account-delete" onSubmit={(event) => {
      event.preventDefault()
      link.submit()
    }}>
      <h3 className="account-section-title">{t('account.link_email_title')}</h3>
      {link.linkedEmail ? (
        <p className="account-notice" role="status">{t('account.link_email_linked', { email: link.linkedEmail })}</p>
      ) : (
        <>
          <p className="account-intro">
            {link.pendingEmail ? t('account.link_email_sent', { email: link.pendingEmail }) : t('account.link_email_intro')}
          </p>
          {!link.pendingEmail && (
            <label className="account-field">
              <span>{t('account.email')}</span>
              <input type="email" value={link.email} onChange={(event) => link.setEmail(event.target.value)} autoComplete="email" maxLength={254} required />
            </label>
          )}
          <PasswordField
            key={link.pendingEmail || 'new-email'}
            label={t('account.password')}
            value={link.password}
            onChange={(event) => link.setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {link.error && <p className="account-error" role="alert">{t(`account.errors.${link.error}`)}</p>}
          <button type="submit" className="account-submit" disabled={link.submitting || !link.canSubmit} aria-busy={link.submitting || undefined}>
            {link.submitting && <span className="account-submit-spinner" aria-hidden="true" />}
            {t(link.pendingEmail ? 'account.link_email_confirm' : 'account.link_email_send')}
          </button>
          {link.pendingEmail && (
            <button type="button" className="account-link" disabled={link.submitting} onClick={link.useAnotherEmail}>
              {t('account.link_email_other')}
            </button>
          )}
        </>
      )}
    </form>
  )
}

function PasswordSettings({ account }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const close = () => {
    setOpen(false)
    setPassword('')
    setNewPassword('')
    setConfirmation('')
    setError(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    if (newPassword !== confirmation) {
      setError('password_mismatch')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await changeAccountPassword(auth, account, { password, newPassword })
      close()
      setSaved(true)
    } catch (err) {
      setError(accountErrorKey(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <>
        <button type="button" className="account-link" onClick={() => { setSaved(false); setOpen(true) }}>
          {t('account.change_password')}
        </button>
        {saved && <p className="account-notice" role="status">{t('account.password_changed')}</p>}
      </>
    )
  }

  return (
    <form className="account-form" onSubmit={submit}>
      {[
        ['current_password', password, setPassword, 'current-password'],
        ['new_password', newPassword, setNewPassword, 'new-password'],
        ['confirm_new_password', confirmation, setConfirmation, 'new-password'],
      ].map(([label, value, setValue, autoComplete]) => (
        <label className="account-field" key={label}>
          <span>{t(`account.${label}`)}</span>
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete={autoComplete} required disabled={submitting} />
        </label>
      ))}
      {error && <p className="account-error" role="alert">{t(`account.errors.${error}`)}</p>}
      <div className="account-row">
        <button type="button" className="account-link" onClick={close} disabled={submitting}>
          {t('account.cancel')}
        </button>
        <button type="submit" className="account-submit" disabled={submitting}>
          {t('account.change_password')}
        </button>
      </div>
    </form>
  )
}

function AccountSettings({ account }) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleDelete = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const proof = account.hasPassword
        ? { password, username: account.usernamePassword ? account.username : undefined }
        : { reauthenticate: reauthenticateWithGoogle }
      await deleteAccount(auth, proof)
    } catch (err) {
      const key = accountErrorKey(err)
      if (key !== 'cancelled') setError(key)
      setSubmitting(false)
    }
  }

  return (
    <CollapsibleSection id="own.settings" title={t('profile.settings_title')} summary={account.email ?? account.username}>
      <div className="account-card">
        <p className="account-label">{t('account.signed_in_as')}</p>
        <p className="account-email">{account.email ?? account.username}</p>
        <p className="account-intro">{t('account.prefill_hint')}</p>
        <button type="button" className="account-submit account-submit--secondary" onClick={() => signOut(auth)}>
          {t('account.signout')}
        </button>

        {!deleting && account.hasPassword && <PasswordSettings key={account.uid} account={account} />}
        {!deleting && account.usernamePassword && account.username && (
          <>
            <EmailLinkSettings account={account} />
            <RecoveryCodeSettings username={account.username} />
          </>
        )}

        {deleting ? (
          <form onSubmit={handleDelete} className="account-form account-delete">
            <p className="account-intro">{t(account.hasPassword ? 'account.delete_confirm' : 'account.delete_confirm_google')}</p>
            {account.hasPassword && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('account.password')}
                autoComplete="current-password"
                required
              />
            )}
            {error && <p className="account-error">{t(`account.errors.${error}`)}</p>}
            <div className="account-row">
              <button type="button" className="account-link" onClick={() => setDeleting(false)}>
                {t('account.cancel')}
              </button>
              <button type="submit" className="account-submit account-submit--danger" disabled={submitting}>
                {t('account.delete_button')}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="account-link account-link--danger" onClick={() => setDeleting(true)}>
            {t('account.delete')}
          </button>
        )}
      </div>
    </CollapsibleSection>
  )
}

function Profile({ account }) {
  const friendships = useFriendships(account.uid)
  const decoration = useDecoration(account.uid)

  return (
    <ProfileBody
      uid={account.uid}
      header={
        <>
          <ProfileHeader player={account} decoration={decoration} />
          <DecorationPicker account={account} />
        </>
      }
      aside={<AccountSettings account={account} />}
      own
      friendsCount={friendships.loading ? undefined : friendships.friends.length}
      collection={
        <>
          <FlagCollection uid={account.uid} own />
          <ScrollCollection uid={account.uid} own />
        </>
      }
      friends={<FriendsPanel account={account} friendships={friendships} />}
    />
  )
}

export default function AccountPage() {
  const { t } = useTranslation()
  const { loading, account } = useAccount()
  const signedIn = account && !account.needsUsername

  return (
    <div className="account-page">
      <NavBar />
      <main className={`account-main${signedIn ? ' account-main--wide profile-main' : ' account-main--auth'}`}>
        {!signedIn && !loading && (
          <>
            <p className="gg-kicker account-kicker">{t('profile.passport')}</p>
            <h1 className="account-title gg-title">{t('profile.sign_in_title')}</h1>
            <p className="account-pitch">{t('profile.sign_in_pitch')}</p>
          </>
        )}
        {loading ? null : !account ? <AuthForm /> : account.needsUsername ? <ChooseUsername /> : <Profile account={account} />}
      </main>
      <LegalLinks />
    </div>
  )
}

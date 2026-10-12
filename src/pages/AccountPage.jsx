import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import NavBar from '../components/NavBar'
import LegalLinks from '../components/LegalLinks'
import { LEGAL_PATHS } from '../legal/legalInfo'
import { auth, useAccount } from '../auth'
import {
  accountErrorKey,
  chooseUsername,
  deleteAccount,
  PASSWORD_MIN,
  resetPassword,
  signIn,
  signOut,
  signUp,
  USERNAME_MAX,
} from '../utils/account'
import { reauthenticateWithGoogle, signInWithGoogle } from '../utils/accountGoogle'
import FriendsPanel from '../components/profile/FriendsPanel'
import ProfileBody, { Avatar } from '../components/profile/ProfileBody'
import { useFriendships } from '../hooks/usePlayerProfile'
import './AccountPage.css'

function GoogleButton({ onError }) {
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
    <button type="button" className="account-google" onClick={handleClick} disabled={pending}>
      <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
      </svg>
      {t('account.google')}
    </button>
  )
}

function AuthForm() {
  const { t } = useTranslation()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signup') await signUp(auth, { email, password, username })
      else await signIn(auth, { email, password })
    } catch (err) {
      setError(accountErrorKey(err))
      setSubmitting(false)
    }
  }

  const handleForgot = async () => {
    setError(null)
    setNotice(null)
    try {
      await resetPassword(auth, email)
      setNotice(t('account.reset_sent', { email: email.trim() }))
    } catch (err) {
      setError(accountErrorKey(err))
    }
  }

  return (
    <div className="account-card">
      <div className="account-tabs" role="tablist">
        {['signin', 'signup'].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            className={`account-tab${mode === tab ? ' active' : ''}`}
            onClick={() => switchMode(tab)}
          >
            {t(`account.${tab}_tab`)}
          </button>
        ))}
      </div>
      <p className="account-intro">{t(`account.${mode}_intro`)}</p>

      <GoogleButton onError={setError} />
      <div className="account-divider"><span>{t('account.or')}</span></div>

      <form onSubmit={handleSubmit} className="account-form">
        {mode === 'signup' && (
          <label className="account-field">
            <span>{t('account.username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('account.username_placeholder')}
              maxLength={USERNAME_MAX}
              autoComplete="nickname"
              required
            />
            <small>{t('account.username_hint')}</small>
          </label>
        )}
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
        <label className="account-field">
          <span>{t('account.password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? t('account.password_placeholder') : ''}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? PASSWORD_MIN : undefined}
            required
          />
        </label>

        {error && <p className="account-error">{t(`account.errors.${error}`)}</p>}
        {notice && <p className="account-notice">{notice}</p>}

        {mode === 'signup' && <SignupNotice />}
        <button type="submit" className="account-submit" disabled={submitting}>
          {t(mode === 'signup' ? 'account.signup' : 'account.signin')}
        </button>
        {mode === 'signin' && (
          <button type="button" className="account-link" onClick={handleForgot}>
            {t('account.forgot')}
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
        components={{ terms: <Link to={LEGAL_PATHS.terms} />, privacy: <Link to={LEGAL_PATHS.privacy} /> }}
      />
    </p>
  )
}

// Google's name, trimmed to what a username allows, as a starting suggestion.
function suggestUsername() {
  return (auth.currentUser?.displayName ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, USERNAME_MAX)
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
      await deleteAccount(auth, account.hasPassword ? { password } : { reauthenticate: reauthenticateWithGoogle })
    } catch (err) {
      const key = accountErrorKey(err)
      if (key !== 'cancelled') setError(key)
      setSubmitting(false)
    }
  }

  return (
    <section className="account-card">
      <h2 className="account-section-title">{t('profile.settings_title')}</h2>
      <p className="account-label">{t('account.signed_in_as')}</p>
      <p className="account-email">{account.email}</p>
      <p className="account-intro">{t('account.prefill_hint')}</p>
      <button type="button" className="account-submit account-submit--secondary" onClick={() => signOut(auth)}>
        {t('account.signout')}
      </button>

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
    </section>
  )
}

function Profile({ account }) {
  const { t, i18n } = useTranslation()
  const friendships = useFriendships(account.uid)

  return (
    <>
      <header className="profile-header">
        <Avatar username={account.username} size={72} />
        <div className="profile-header-text">
          <h1>{account.username}</h1>
          {account.createdAt && (
            <small>
              {t('profile.member_since', {
                date: new Date(account.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }),
              })}
            </small>
          )}
        </div>
      </header>
      <FriendsPanel account={account} friendships={friendships} />
      <ProfileBody uid={account.uid} friendsCount={friendships.loading ? undefined : friendships.friends.length} />
      <AccountSettings account={account} />
    </>
  )
}

export default function AccountPage() {
  const { t } = useTranslation()
  const { loading, account } = useAccount()
  const signedIn = account && !account.needsUsername

  return (
    <div className="account-page">
      <NavBar />
      <main className={`account-main${signedIn ? ' account-main--wide' : ''}`}>
        {!signedIn && !loading && (
          <>
            <h1 className="account-title">{t('profile.sign_in_title')}</h1>
            <p className="account-pitch">{t('profile.sign_in_pitch')}</p>
          </>
        )}
        {loading ? null : !account ? <AuthForm /> : account.needsUsername ? <ChooseUsername /> : <Profile account={account} />}
      </main>
      <LegalLinks />
    </div>
  )
}

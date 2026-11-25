import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountPage from './AccountPage'
import { account as labels } from '../i18n/locales/fr.json'
import { UsernameAccountError } from '../utils/usernameAccount'

const auth = vi.hoisted(() => ({
  available: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  recover: vi.fn(),
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('../auth', () => ({
  auth,
  useAccount: () => ({ loading: false, account: null }),
}))
vi.mock('../components/NavBar', () => ({ default: () => null }))
vi.mock('../utils/account', async (importOriginal) => ({
  ...(await importOriginal()),
  signUp: auth.signUpEmail,
  signIn: auth.signInEmail,
  resetPassword: auth.resetPassword,
}))
vi.mock('../utils/usernameAccount', async (importOriginal) => ({
  ...(await importOriginal()),
  usernameAccountAvailable: auth.available,
  signUpWithUsername: auth.signUp,
  signInWithUsername: auth.signIn,
  recoverUsernameAccount: auth.recover,
  rotateUsernameRecoveryCode: vi.fn(),
}))

function renderAccount() {
  render(<MemoryRouter><AccountPage /></MemoryRouter>)
}

function fillUsernameAndPassword(username, password) {
  fireEvent.change(screen.getByPlaceholderText(labels.username_placeholder), { target: { value: username } })
  fireEvent.change(screen.getByLabelText(labels.password), { target: { value: password } })
}

function fillIdentifierAndPassword(identifier, password) {
  fireEvent.change(screen.getByPlaceholderText(labels.identifier_placeholder), { target: { value: identifier } })
  fireEvent.change(screen.getByLabelText(labels.password), { target: { value: password } })
}

async function selectUsernameMethod() {
  fireEvent.click(await screen.findByRole('button', { name: labels.method_username }))
}

describe('username accounts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    auth.available.mockResolvedValue(true)
  })

  it('keeps email and Google available when username accounts are disabled', async () => {
    auth.available.mockResolvedValue(false)
    renderAccount()

    await waitFor(() => expect(auth.available).toHaveBeenCalledOnce())
    expect(screen.queryByRole('button', { name: labels.method_username })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(labels.identifier)).not.toBeInTheDocument()
    expect(screen.getByLabelText(labels.email)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.google })).toBeInTheDocument()
  })

  it('creates an account with no email and shows the recovery code before sign-in', async () => {
    auth.signUp.mockResolvedValue('first-recovery-code')
    renderAccount()
    fireEvent.click(screen.getByRole('tab', { name: labels.signup_tab }))
    await selectUsernameMethod()
    expect(screen.queryByLabelText(labels.email)).not.toBeInTheDocument()

    const username = 'Atlas'
    const password = 'a long offline passphrase'
    fillUsernameAndPassword(username, password)
    const confirmation = screen.getByLabelText(labels.confirm_password)
    fireEvent.change(confirmation, { target: { value: `${password} ` } })
    fireEvent.click(screen.getByRole('button', { name: labels.signup }))
    expect(screen.getByRole('alert')).toHaveTextContent(labels.errors.password_mismatch)
    expect(auth.signUp).not.toHaveBeenCalled()

    fireEvent.change(confirmation, { target: { value: password } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: labels.signup }))

    expect(await screen.findByText('first-recovery-code')).toBeInTheDocument()
    expect(auth.signUp).toHaveBeenCalledWith({ username, password })
    expect(auth.signIn).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: labels.recovery_saved }))
    expect(screen.queryByText('first-recovery-code')).not.toBeInTheDocument()
    expect(screen.getByLabelText(labels.password)).toHaveValue('')
    // Sign-in has a single email-or-username field, no email/username tabs.
    expect(screen.queryByRole('button', { name: labels.method_username })).not.toBeInTheDocument()
    fillIdentifierAndPassword(username, password)
    fireEvent.click(screen.getByRole('button', { name: labels.signin }))
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith(auth, { username, password }))
    expect(auth.signInEmail).not.toHaveBeenCalled()
  })

  it('confirms email signup passwords and toggles visibility without submitting or losing the value', async () => {
    renderAccount()
    fireEvent.click(screen.getByRole('tab', { name: labels.signup_tab }))
    await screen.findByRole('button', { name: labels.method_username })

    const username = 'Atlas'
    const email = 'toi@exemple.com'
    const password = 'a long offline passphrase'
    fillUsernameAndPassword(username, password)
    fireEvent.change(screen.getByLabelText(labels.email), { target: { value: email } })
    const passwordInput = screen.getByLabelText(labels.password)
    const confirmation = screen.getByLabelText(labels.confirm_password)
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmation).toBeRequired()
    fireEvent.click(screen.getByRole('button', { name: labels.signup }))
    expect(auth.signUpEmail).not.toHaveBeenCalled()

    const [togglePassword, toggleConfirmation] = screen.getAllByRole('button', { name: labels.show_password })
    fireEvent.click(togglePassword)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(passwordInput).toHaveValue(password)
    expect(confirmation).toHaveAttribute('type', 'password')
    fireEvent.click(toggleConfirmation)
    expect(confirmation).toHaveAttribute('type', 'text')
    fireEvent.click(togglePassword)
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(auth.signUpEmail).not.toHaveBeenCalled()

    fireEvent.change(confirmation, { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: labels.signup }))
    expect(auth.signUpEmail).toHaveBeenCalledWith(auth, { email, password, username })
  })

  it('signs in with an email through the combined field', async () => {
    renderAccount()
    await waitFor(() => expect(screen.getByLabelText(labels.identifier)).toBeInTheDocument())

    fillIdentifierAndPassword('toi@exemple.com', 'secret-password')
    fireEvent.click(screen.getByRole('button', { name: labels.signin }))

    await waitFor(() => expect(auth.signInEmail).toHaveBeenCalledWith(auth, { email: 'toi@exemple.com', password: 'secret-password' }))
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('sends an email reset when the combined identifier is an email', async () => {
    auth.resetPassword.mockResolvedValue(undefined)
    renderAccount()
    await waitFor(() => expect(screen.getByLabelText(labels.identifier)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(labels.identifier_placeholder), { target: { value: 'toi@exemple.com' } })
    fireEvent.click(screen.getByRole('button', { name: labels.forgot }))

    await waitFor(() => expect(auth.resetPassword).toHaveBeenCalledWith(auth, 'toi@exemple.com'))
  })

  it('shows progress during recovery, enables retry on failure and shows the replacement code on success', async () => {
    let rejectRecovery
    auth.recover.mockImplementationOnce(() => new Promise((_, reject) => { rejectRecovery = reject }))
    auth.recover.mockResolvedValueOnce('replacement-recovery-code')
    renderAccount()
    await waitFor(() => expect(screen.getByLabelText(labels.identifier)).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(labels.identifier_placeholder), { target: { value: 'Atlas' } })
    fireEvent.click(screen.getByRole('button', { name: labels.forgot }))
    expect(screen.getByRole('heading', { name: labels.recover_title })).toBeInTheDocument()
    expect(screen.getByText(labels.recovery_wait_hint)).toBeInTheDocument()
    expect(screen.queryByLabelText(labels.email)).not.toBeInTheDocument()

    const username = 'Atlas'
    const password = 'an even longer passphrase'
    const recoveryCode = 'first-recovery-code'
    expect(screen.getByPlaceholderText(labels.username_placeholder)).toHaveValue(username)
    fireEvent.change(screen.getByLabelText(labels.password), { target: { value: password } })
    fireEvent.change(screen.getByLabelText(labels.recovery_code), { target: { value: recoveryCode } })
    fireEvent.click(screen.getByRole('button', { name: labels.recover_submit }))

    const pending = screen.getByRole('button', { name: labels.recovery_pending })
    expect(pending).toBeDisabled()
    expect(pending).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(labels.recovery_pending)
    expect(screen.getByRole('button', { name: labels.back_to_signin })).toBeDisabled()
    fireEvent.click(pending)
    expect(auth.recover).toHaveBeenCalledOnce()

    await act(async () => { rejectRecovery(new UsernameAccountError('invalid_recovery_code')) })
    expect(screen.getByRole('alert')).toHaveTextContent(labels.errors.invalid_recovery_code)
    const retry = screen.getByRole('button', { name: labels.recover_submit })
    expect(retry).toBeEnabled()
    fireEvent.click(retry)

    expect(await screen.findByText('replacement-recovery-code')).toBeInTheDocument()
    expect(auth.recover).toHaveBeenCalledWith({ username, password, recoveryCode })
    fireEvent.click(screen.getByRole('button', { name: labels.recovery_saved }))
    expect(screen.queryByLabelText(labels.recovery_code)).not.toBeInTheDocument()
    expect(screen.getByLabelText(labels.password)).toHaveValue('')
  })
})

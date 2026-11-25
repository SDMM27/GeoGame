import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountPage from './AccountPage'
import { account as labels } from '../i18n/locales/fr.json'

const auth = vi.hoisted(() => ({
  available: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  recover: vi.fn(),
}))

vi.mock('../auth', () => ({
  auth,
  useAccount: () => ({ loading: false, account: null }),
}))
vi.mock('../components/NavBar', () => ({ default: () => null }))
vi.mock('../utils/usernameAccount', () => ({
  USERNAME_PASSWORD_MIN: 15,
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
  fireEvent.change(screen.getByLabelText(new RegExp(labels.password, 'i')), { target: { value: password } })
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
    fireEvent.click(screen.getByRole('button', { name: labels.signup }))

    expect(await screen.findByText('first-recovery-code')).toBeInTheDocument()
    expect(auth.signUp).toHaveBeenCalledWith({ username, password })
    expect(auth.signIn).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: labels.recovery_saved }))
    expect(screen.queryByText('first-recovery-code')).not.toBeInTheDocument()
    expect(screen.getByLabelText(labels.password)).toHaveValue('')
    fillUsernameAndPassword(username, password)
    fireEvent.click(screen.getByRole('button', { name: labels.signin }))
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith(auth, { username, password }))
  })

  it('recovers a username account and shows the replacement code', async () => {
    auth.recover.mockResolvedValue('replacement-recovery-code')
    renderAccount()
    await selectUsernameMethod()
    fireEvent.click(screen.getByRole('button', { name: labels.forgot }))
    expect(screen.getByRole('heading', { name: labels.recover_title })).toBeInTheDocument()
    expect(screen.getByText(labels.recovery_wait_hint)).toBeInTheDocument()
    expect(screen.queryByLabelText(labels.email)).not.toBeInTheDocument()

    const username = 'Atlas'
    const password = 'an even longer passphrase'
    const recoveryCode = 'first-recovery-code'
    fillUsernameAndPassword(username, password)
    fireEvent.change(screen.getByLabelText(labels.recovery_code), { target: { value: recoveryCode } })
    fireEvent.click(screen.getByRole('button', { name: labels.recover_submit }))

    expect(await screen.findByText('replacement-recovery-code')).toBeInTheDocument()
    expect(auth.recover).toHaveBeenCalledWith({ username, password, recoveryCode })
    fireEvent.click(screen.getByRole('button', { name: labels.recovery_saved }))
    expect(screen.queryByLabelText(labels.recovery_code)).not.toBeInTheDocument()
    expect(screen.getByLabelText(labels.password)).toHaveValue('')
  })
})

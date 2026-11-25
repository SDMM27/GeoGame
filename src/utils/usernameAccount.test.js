import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signInWithCustomToken, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { deleteAccount } from './account'
import {
  recoverUsernameAccount, rotateUsernameRecoveryCode, signInWithUsername,
  signUpWithUsername, usernameAccountApiOrigin, usernameAccountAvailable,
} from './usernameAccount'

vi.mock('firebase/auth', async (importOriginal) => ({
  ...await importOriginal(),
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

const previewHost = 'geo-game-git-dev-sdmms-projects.vercel.app'
const origin = 'https://geo-game.app'
const apiPath = '/api/username-account'
const credentials = { username: 'Atlas', password: 'a long preview passphrase' }

function mockFetch() {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ available: true, recoveryCode: 'recovery-code', token: 'custom-token', uid: 'player-1' }),
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('username account API origin', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    previewHost,
    'geo-game-git-feature-x-sdmms-projects.vercel.app',
    'geo-game-ln93w5gmf-sdmms-projects.vercel.app',
  ])(
    'uses production for the owned preview %s',
    (hostname) => expect(usernameAccountApiOrigin(hostname)).toBe(origin),
  )

  it.each([
    'localhost', 'geo-game.app', 'geo-game-delta.vercel.app',
    'geo-game-sdmms-projects.vercel.app',
    'geogame-app-git-dev-sdmms-projects.vercel.app',
    'geo-game-git-dev-other-team.vercel.app',
    'geo-game-git-dev-sdmms-projects.vercel.app.example.org',
    'elsewhere-geo-game-git-dev-sdmms-projects.vercel.app',
  ])('keeps the relative API on %s', (hostname) => expect(usernameAccountApiOrigin(hostname)).toBe(''))

  it('routes availability and each username operation to the same preview API', async () => {
    vi.stubGlobal('location', { hostname: previewHost })
    const fetcher = mockFetch()
    const auth = { currentUser: { getIdToken: async () => 'id-token' } }

    expect(await usernameAccountAvailable()).toBe(true)
    await signUpWithUsername(credentials)
    await signInWithUsername(auth, credentials)
    await recoverUsernameAccount({ ...credentials, recoveryCode: 'original-code' })
    await rotateUsernameRecoveryCode(auth, credentials)

    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(Array(5).fill(`${origin}${apiPath}`))
    expect(fetcher.mock.calls.slice(1).map(([, options]) => JSON.parse(options.body).action))
      .toEqual(['signup', 'signin', 'recover', 'rotate'])
    expect(fetcher.mock.calls.at(-1)[1].headers.Authorization).toBe('Bearer id-token')
  })

  it('preserves the relative API and lets an explicit origin override the preview default', async () => {
    const fetcher = mockFetch()
    vi.stubGlobal('location', { hostname: 'localhost' })
    await usernameAccountAvailable()
    await signUpWithUsername(credentials)
    vi.stubGlobal('location', { hostname: previewHost })
    await usernameAccountAvailable('https://api.example.org')
    await signUpWithUsername({ ...credentials, apiOrigin: '' })

    expect(fetcher.mock.calls.map(([url]) => url))
      .toEqual([apiPath, apiPath, `https://api.example.org${apiPath}`, apiPath])
  })

  it('signs in a linked username through the canonical Firebase password credential', async () => {
    const email = 'atlas@example.test'
    const uid = 'player-1'
    mockFetch().mockResolvedValueOnce({ ok: true, json: async () => ({ email, uid }) })
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid } })
    const auth = { currentUser: null }

    await signInWithUsername(auth, credentials)

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, email, credentials.password)
    expect(signInWithCustomToken).not.toHaveBeenCalled()
  })

  it('uses the preview API for username reauthentication and deletion, while keeping legacy deletion relative', async () => {
    vi.stubGlobal('location', { hostname: previewHost })
    const fetcher = mockFetch()
    const user = { uid: 'player-1', getIdToken: vi.fn().mockResolvedValue('fresh-id-token') }
    const auth = { currentUser: user }
    const reauthenticate = vi.fn()

    await deleteAccount(auth, credentials)
    await deleteAccount(auth, { reauthenticate })

    expect(fetcher.mock.calls.map(([url]) => url))
      .toEqual([`${origin}${apiPath}`, `${origin}/api/delete-account`, '/api/delete-account'])
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-id-token')
    expect(signInWithCustomToken).toHaveBeenCalledWith(auth, 'custom-token')
    expect(user.getIdToken).toHaveBeenCalledWith(true)
    expect(reauthenticate).toHaveBeenCalledWith(user)
    expect(signOut).toHaveBeenCalledTimes(2)
  })
})

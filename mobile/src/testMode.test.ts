// Availability and toggle of the test mode: never on the production channel, remembered on the device.
type Options = { dev?: boolean; os?: string; channel?: string | null; host?: string; stored?: string }

function load({ dev = false, os = 'ios', channel = null, host, stored }: Options = {}) {
  jest.resetModules()
  ;(globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev
  jest.doMock('react-native', () => ({ Platform: { OS: os } }))
  jest.doMock('@/testChannel', () => ({ updatesChannel: channel }))
  if (host !== undefined) (globalThis as { window?: unknown }).window = { location: { hostname: host, href: `https://${host}/?test=1` }, history: { state: null, replaceState: jest.fn() } }
  else delete (globalThis as { window?: unknown }).window
  if (stored !== undefined) globalThis.localStorage.setItem('gg.testMode', stored)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./testMode') as typeof import('./testMode')
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
  ;(globalThis as unknown as { __DEV__: boolean }).__DEV__ = true
})

describe('testModeAvailable', () => {
  it('is on in development', () => expect(load({ dev: true }).testModeAvailable).toBe(true))
  it('is on for the preview and development channels', () => {
    expect(load({ channel: 'preview' }).testModeAvailable).toBe(true)
    expect(load({ channel: 'development' }).testModeAvailable).toBe(true)
  })
  it('is off on the production channel or without a channel', () => {
    expect(load({ channel: 'production' }).testModeAvailable).toBe(false)
    expect(load({ channel: null }).testModeAvailable).toBe(false)
  })
  it('is on for localhost and vercel previews on the web, off on the production domain', () => {
    expect(load({ os: 'web', host: 'localhost' }).testModeAvailable).toBe(true)
    expect(load({ os: 'web', host: 'geogame-git-dev.vercel.app' }).testModeAvailable).toBe(true)
    expect(load({ os: 'web', host: 'geogame.example.com' }).testModeAvailable).toBe(false)
  })
})

describe('toggle', () => {
  it('stays off when unavailable, whatever is stored', () => {
    const mode = load({ channel: 'production', stored: '1' })
    expect(mode.isTestMode()).toBe(false)
    mode.setTestMode(true)
    expect(mode.isTestMode()).toBe(false)
  })

  it('reads the stored value, then stores and notifies a change', () => {
    const mode = load({ channel: 'preview', stored: '1' })
    expect(mode.isTestMode()).toBe(true)
    mode.setTestMode(false)
    expect(mode.isTestMode()).toBe(false)
    expect(globalThis.localStorage.getItem('gg.testMode')).toBeNull()
    mode.setTestMode(true)
    expect(globalThis.localStorage.getItem('gg.testMode')).toBe('1')
  })

  it('reads ?test=1 on the web and drops it from the address bar', () => {
    const mode = load({ os: 'web', host: 'localhost' })
    mode.initTestMode()
    expect(mode.isTestMode()).toBe(true)
    expect((window.history.replaceState as jest.Mock).mock.calls[0][2].toString()).not.toContain('test=')
  })
})

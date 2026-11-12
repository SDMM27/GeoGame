import Storage from 'expo-sqlite/kv-store'

import { persistTheme } from './persistence'

jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { setItemAsync: jest.fn() } }))

const write = jest.mocked(Storage.setItemAsync)

beforeEach(() => write.mockReset())

it('serializes rapid native theme changes without blocking the caller', async () => {
  let finish!: () => void
  write.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve })).mockResolvedValue(undefined)
  const first = persistTheme('light', false)
  const last = persistTheme('dark', false)
  expect(write).not.toHaveBeenCalled()
  await Promise.resolve()
  expect(write.mock.calls).toEqual([['sd-theme', 'light']])
  finish()
  await Promise.all([first, last])
  expect(write.mock.calls).toEqual([['sd-theme', 'light'], ['sd-theme', 'dark']])
})

it('keeps saving later choices after a storage failure', async () => {
  write.mockRejectedValueOnce(new Error('database unavailable')).mockResolvedValue(undefined)
  await expect(persistTheme('light', false)).resolves.toBeUndefined()
  await persistTheme('dark', false)
  expect(write).toHaveBeenLastCalledWith('sd-theme', 'dark')
})

it('preserves browser storage and other settings', async () => {
  localStorage.setItem('language', 'fr')
  await persistTheme('light', true)
  expect(localStorage.getItem('sd-theme')).toBe('light')
  expect(localStorage.getItem('language')).toBe('fr')
  expect(write).not.toHaveBeenCalled()
})

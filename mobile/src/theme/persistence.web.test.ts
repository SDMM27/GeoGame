import { persistTheme } from './persistence.web'

jest.mock('expo-sqlite/kv-store', () => {
  throw new Error('Web theme persistence must not load SQLite')
})

it('preserves the latest browser choice and other settings without SQLite', async () => {
  localStorage.setItem('language', 'fr')
  await Promise.all([persistTheme('light'), persistTheme('dark')])
  expect(localStorage.getItem('sd-theme')).toBe('dark')
  expect(localStorage.getItem('language')).toBe('fr')
})

it('does not reject when browser storage is unavailable', async () => {
  const write = jest.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('storage blocked') })
  try {
    await expect(persistTheme('light')).resolves.toBeUndefined()
  } finally {
    write.mockRestore()
  }
})

const mockNotificationsLoaded = jest.fn()
const mockSetNotificationHandler = jest.fn()

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}))
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native')
  return Object.create(native, { Platform: { value: { ...native.Platform, OS: 'android' } } })
})
jest.mock('expo-device', () => ({ isDevice: true }))
jest.mock('expo-router', () => ({ router: {} }))
jest.mock('@shared/i18n', () => ({ t: (key: string) => key }))
jest.mock('@/games', () => ({ LISTED_GAMES: [] }))
jest.mock('./device', () => ({ saveDevice: jest.fn(), forgetDevice: jest.fn(), useDailyReminder: jest.fn() }))
jest.mock('expo-notifications', () => {
  mockNotificationsLoaded()
  return { setNotificationHandler: mockSetNotificationHandler }
})

beforeEach(() => jest.clearAllMocks())

test('Android Expo Go can load the app without importing unsupported push notifications', () => {
  jest.isolateModules(() => {
    jest.requireMock('expo-constants').default.executionEnvironment = 'storeClient'
    const push = jest.requireActual('./push')
    expect(typeof push.usePushNotifications).toBe('function')
    expect(typeof push.usePushPermission).toBe('function')
    expect(mockNotificationsLoaded).not.toHaveBeenCalled()
  })
})

test('installed Android builds still initialize their notification handler', () => {
  jest.isolateModules(() => {
    jest.requireMock('expo-constants').default.executionEnvironment = 'standalone'
    jest.requireActual('./push')
    expect(mockNotificationsLoaded).toHaveBeenCalledTimes(1)
    expect(mockSetNotificationHandler).toHaveBeenCalledWith({ handleNotification: expect.any(Function) })
  })
})

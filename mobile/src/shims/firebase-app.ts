// Native build: React Native Firebase instead of the JS SDK. The native app is configured by google-services.json,
// so the web config passed by shared/Firebase.js is not needed.
import { getApp } from '@react-native-firebase/app'

export { getApp, getApps } from '@react-native-firebase/app'

export const initializeApp = (_config?: unknown) => getApp()

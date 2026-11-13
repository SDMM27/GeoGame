// Test mode for non-production builds: every globe skin unlocked, and any flag can be tried as the profile picture (a
// local preview only: nothing the server would refuse is written). Mirrors the website's utils/testMode.js, which can't
// be shared (it relies on a Vite define). Never available on the production channel or the production web domain.
// Turned on with a long press on the globe's skin button, or ?test=1 in the URL on the web (?test=0 turns it off);
// remembered on the device.
import { useSyncExternalStore } from 'react'
import { Platform } from 'react-native'

import { updatesChannel } from '@/testChannel'

const KEY = 'gg.testMode'
const PREVIEW_CHANNELS = ['preview', 'development']

function isPreviewHost(): boolean {
  const host = typeof window === 'undefined' ? '' : (window.location?.hostname ?? '')
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')
}

export const testModeAvailable: boolean =
  __DEV__ || (Platform.OS === 'web' ? isPreviewHost() : PREVIEW_CHANNELS.includes(updatesChannel ?? ''))

const listeners = new Set<() => void>()

function readStored(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let enabled = testModeAvailable && readStored()

export function isTestMode(): boolean {
  return enabled
}

export function setTestMode(on: boolean) {
  if (!testModeAvailable) return
  try {
    if (on) globalThis.localStorage?.setItem(KEY, '1')
    else globalThis.localStorage?.removeItem(KEY)
  } catch {
    // no storage: the test mode just lasts until the app closes
  }
  enabled = on
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTestMode(): boolean {
  return useSyncExternalStore(subscribe, isTestMode, isTestMode)
}

// Reads ?test=1 / ?test=0 once at startup (web), and drops it from the address bar.
export function initTestMode() {
  if (!testModeAvailable) return
  enabled = readStored()
  if (Platform.OS !== 'web' || typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    const value = url.searchParams.get('test')
    if (value === null) return
    setTestMode(value === '1')
    url.searchParams.delete('test')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    // no URL or history: the param is ignored
  }
}

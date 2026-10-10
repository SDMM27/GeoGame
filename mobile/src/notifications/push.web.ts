// Web app: push notifications (invites, friend requests) through Web Push and the service worker (public/sw.js). On
// iPhone they need the app added to the home screen (iOS 16.4+), and the permission can only be asked from a tap: see
// useWebPushPermission.
// The pushes themselves are sent by the website's API (api/invite-push, api/friend-push), see push.ts.
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'

import { firestore } from '@shared/Firebase'
import i18n from '@shared/i18n'

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? ''

// Web Push subscription registered for the signed-in account, removed again on sign-out.
let registered: { uid: string; token: string } | null = null

function supported() {
  return (
    !!VAPID_PUBLIC_KEY &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function applicationServerKey(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

// The endpoint is a URL, not a valid document id: the device is stored under its hash.
async function endpointId(endpoint: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function registerDevice(uid: string) {
  if (!supported() || Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(VAPID_PUBLIC_KEY) }))
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys?.auth) return
  const token = await endpointId(endpoint)
  await setDoc(doc(firestore, 'users', uid, 'pushTokens', token), {
    token,
    lang: i18n.language?.slice(0, 2) || 'fr',
    platform: 'web',
    subscription: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    updatedAt: serverTimestamp(),
  })
  registered = { uid, token }
}

// Call before signing out, while the account may still delete its own documents.
export async function forgetDevice() {
  if (!registered) return
  const { uid, token } = registered
  registered = null
  await deleteDoc(doc(firestore, 'users', uid, 'pushTokens', token)).catch((error) => console.warn('[push]', error?.code, error))
}

// Keeps the subscription registered once the permission is granted (asking for it takes a tap, see below).
export function usePushNotifications(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid) return
    registerDevice(uid).catch((error) => console.warn('[push]', error?.code, error))
  }, [uid])
}

export type WebPushState = 'unsupported' | 'default' | 'granted' | 'denied'

// For the "turn on notifications" button: Safari only shows the permission prompt from a tap.
export function useWebPushPermission(uid: string | null | undefined) {
  const [state, setState] = useState<WebPushState>(() => (supported() ? (Notification.permission as WebPushState) : 'unsupported'))
  const enable = useCallback(async () => {
    if (!uid || !supported()) return
    // First thing in the tap handler, before any other await, or Safari ignores it.
    const permission = await Notification.requestPermission()
    setState(permission as WebPushState)
    if (permission === 'granted') await registerDevice(uid).catch((error) => console.warn('[push]', error?.code, error))
  }, [uid])
  return { state, enable }
}

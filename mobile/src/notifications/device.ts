// The push device registered for the signed-in account (push.ts on the app, push.web.ts on the web app), and its
// settings: users/{uid}/pushTokens/{token}, see api/_lib/push.mjs.
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { firestore } from '@shared/Firebase'

type Device = { uid: string; token: string }

let registered: Device | null = null
const listeners = new Set<() => void>()

function setRegistered(device: Device | null) {
  registered = device
  listeners.forEach((listener) => listener())
}

const deviceRef = ({ uid, token }: Device) => doc(firestore, 'users', uid, 'pushTokens', token)

// Merged, so the device's settings (dailyReminder) survive each launch's registration.
export async function saveDevice(uid: string, token: string, fields: Record<string, unknown>) {
  await setDoc(deviceRef({ uid, token }), { token, ...fields, updatedAt: serverTimestamp() }, { merge: true })
  setRegistered({ uid, token })
}

// Call before signing out, while the account may still delete its own documents.
export async function forgetDevice() {
  if (!registered) return
  const device = registered
  setRegistered(null)
  await deleteDoc(deviceRef(device)).catch((error) => console.warn('[push]', error?.code, error))
}

function useRegisteredDevice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => registered
  )
}

// Daily challenge reminder (api/daily-reminder) on this device: on unless turned off. `enabled` is null until this
// device is registered (notifications allowed) and its setting read.
export function useDailyReminder() {
  const device = useRegisteredDevice()
  const [state, setState] = useState<{ device: Device; enabled: boolean } | null>(null)

  useEffect(() => {
    if (!device) return undefined
    let cancelled = false
    getDoc(deviceRef(device))
      .then((snapshot) => !cancelled && setState({ device, enabled: snapshot.data()?.dailyReminder !== false }))
      .catch((error) => console.warn('[push]', error?.code, error))
    return () => {
      cancelled = true
    }
  }, [device])

  const enabled = device && state?.device === device ? state.enabled : null
  const setEnabled = (value: boolean) => {
    if (!device) return
    setState({ device, enabled: value })
    updateDoc(deviceRef(device), { dailyReminder: value }).catch((error) => {
      console.warn('[push]', error?.code, error)
      setState({ device, enabled: !value })
    })
  }
  return { enabled, setEnabled }
}

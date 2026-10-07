// Push notifications for room invites: registers this device under the account, and opens the room when one is tapped.
// The pushes themselves are sent by api/invite-push (website), see src/utils/invites.js.
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { firestore } from '@shared/Firebase'
import i18n from '@shared/i18n'

const CHANNEL_ID = 'invites'

// In the foreground the in-app banner (InviteBanner) already shows the invite.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
})

// Expo push token registered for the signed-in account, removed again on sign-out.
let registered: { uid: string; token: string } | null = null

// `ask`: show the permission prompt if it hasn't been answered yet (only once the player has friends to be invited by).
async function registerDevice(uid: string, ask: boolean) {
  if (!Device.isDevice) return
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.t('mobile.invites.channel'),
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  let permission = await Notifications.getPermissionsAsync()
  if (!permission.granted && ask && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync()
  if (!permission.granted) return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  await setDoc(doc(firestore, 'users', uid, 'pushTokens', token), {
    token,
    lang: i18n.language?.slice(0, 2) || 'fr',
    platform: Platform.OS,
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

export function usePushNotifications(uid: string | null | undefined, hasFriends: boolean) {
  useEffect(() => {
    if (!uid) return
    registerDevice(uid, hasFriends).catch((error) => console.warn('[push]', error?.code, error))
  }, [uid, hasFriends])

  // Tapped invite (app in the background or closed): straight into the room.
  const response = Notifications.useLastNotificationResponse()
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
    const data = response.notification.request.content.data as { type?: string; room?: string } | undefined
    if (data?.type !== 'invite' || !data.room) return
    Notifications.clearLastNotificationResponseAsync()
    router.push({ pathname: '/multi/[code]', params: { code: data.room, invited: '1' } })
  }, [response])
}

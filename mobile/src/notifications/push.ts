// Push notifications (room invites, friend requests, daily challenge reminder, friends' daily nudges): registers this device under the account, and opens the right
// screen when one is tapped. The pushes themselves are sent by the website's API: api/invite-push (src/utils/invites.js),
// api/friend-push (src/utils/friends.js), api/daily-nudge (src/utils/dailyNudge.js) and api/daily-reminder (once a day).
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState, Linking, Platform } from 'react-native'

import i18n from '@shared/i18n'

import { GAMES } from '@/games'

import { saveDevice } from './device'

export { forgetDevice, useDailyReminder } from './device'

// Android channels, one per kind, so each can be muted on its own in the system settings.
const CHANNELS = { invites: 'mobile.invites.channel', friends: 'mobile.invites.friends_channel', daily: 'mobile.invites.daily_channel' }

type PushData = { type?: string; room?: string; uid?: string; gameType?: string; mode?: string }

// In the foreground the in-app banner (InviteBanner) already shows an invite, and the daily reminder is pointless;
// friend requests and friends' "come beat me" nudges still show up.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = (notification.request.content.data as PushData | undefined)?.type
    const show = type === 'friend_request' || type === 'friend_accepted' || type === 'daily_nudge'
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false }
  },
})

// Shows the permission prompt if it hasn't been answered yet (unless ask is false): friend requests can come in from the first day.
async function registerDevice(uid: string, ask = true) {
  if (!Device.isDevice) return
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    for (const [id, name] of Object.entries(CHANNELS)) {
      await Notifications.setNotificationChannelAsync(id, { name: i18n.t(name), importance: Notifications.AndroidImportance.HIGH })
    }
  }
  let permission = await Notifications.getPermissionsAsync()
  if (!permission.granted && ask && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync()
  if (!permission.granted) return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  await saveDevice(uid, token, { lang: i18n.language?.slice(0, 2) || 'fr', platform: Platform.OS })
}

export function usePushNotifications(uid: string | null | undefined) {
  useEffect(() => {
    if (!uid) return
    registerDevice(uid).catch((error) => console.warn('[push]', error?.code, error))
    // Back from the settings with notifications allowed: registers the device without asking again.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') registerDevice(uid, false).catch((error) => console.warn('[push]', error?.code, error))
    })
    return () => subscription.remove()
  }, [uid])

  // Tapped notification (app in the background or closed): straight to the room, the requests, or the new friend.
  const response = Notifications.useLastNotificationResponse()
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
    const data = response.notification.request.content.data as PushData | undefined
    if (data?.type === 'invite' && data.room) {
      Notifications.clearLastNotificationResponseAsync()
      router.push({ pathname: '/multi/[code]', params: { code: data.room, invited: '1' } })
    } else if (data?.type === 'friend_request') {
      Notifications.clearLastNotificationResponseAsync()
      router.push('/friends')
    } else if (data?.type === 'friend_accepted' && data.uid) {
      Notifications.clearLastNotificationResponseAsync()
      router.push({ pathname: '/player/[uid]', params: { uid: data.uid } })
    } else if (data?.type === 'daily_nudge') {
      Notifications.clearLastNotificationResponseAsync()
      // Straight to the daily challenge the friend finished.
      const game =
        data.mode === 'recent'
          ? GAMES.find((item) => item.type === data.gameType)
          : GAMES.find((item) => item.kind === 'daily' && item.type === data.gameType)
      if (game) router.navigate(data.mode === 'recent' ? (game.route as never) : { pathname: game.route as never, params: { mode: 'daily' } })
      else router.navigate('/')
    } else if (data?.type === 'daily') {
      Notifications.clearLastNotificationResponseAsync()
      router.navigate('/')
    }
  }, [response])
}

export type WebPushState = 'unsupported' | 'default' | 'granted' | 'denied'

// Web only (push.web.ts): the app asks for the permission itself, see registerDevice.
export function useWebPushPermission(_uid: string | null | undefined) {
  return { state: 'unsupported' as WebPushState, enable: async () => {} }
}

// For NotificationPrompt: 'denied' once the system prompt can't come back, so the player has to go through the settings.
// While it still can, registerDevice shows it: nothing for the dialog to do ('unsupported').
export function usePushPermission(uid: string | null | undefined) {
  const [state, setState] = useState<WebPushState>('unsupported')
  useEffect(() => {
    if (!uid || !Device.isDevice) return
    const check = () =>
      Notifications.getPermissionsAsync()
        .then((permission) => setState(permission.granted ? 'granted' : permission.canAskAgain ? 'unsupported' : 'denied'))
        .catch((error) => console.warn('[push]', error?.code, error))
    check()
    const subscription = AppState.addEventListener('change', (appState) => appState === 'active' && check())
    return () => subscription.remove()
  }, [uid])
  return { state, enable: async () => {}, openSettings: (() => Linking.openSettings()) as (() => void) | null }
}

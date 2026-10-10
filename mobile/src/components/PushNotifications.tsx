// Keeps this device registered for push notifications (invites, friend requests) while an account is signed in.
import { setPushApiOrigin } from '@shared/utils/pushApi'

import { useAccount } from '@/account/auth'
import { API_ORIGIN } from '@/links'
import { usePushNotifications } from '@/notifications/push'

// The pushes are sent by the website's API (api/*-push), on another origin than the app.
setPushApiOrigin(API_ORIGIN)

export function PushNotifications() {
  const { account } = useAccount()
  usePushNotifications(account?.username ? account.uid : null)
  return null
}

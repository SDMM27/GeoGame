// Keeps this device registered for invite notifications while an account is signed in.
import { useFriendships } from '@shared/hooks/usePlayerProfile'

import { useAccount } from '@/account/auth'
import { usePushNotifications } from '@/notifications/push'

export function PushNotifications() {
  const { account } = useAccount()
  const friendships = useFriendships(account?.uid)
  usePushNotifications(account?.username ? account.uid : null, friendships.friends.length > 0)
  return null
}

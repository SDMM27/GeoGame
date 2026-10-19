// Tells the friends this player is online while the app is in the foreground (see @shared/utils/presence).
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import usePresenceHeartbeat from '@shared/hooks/usePresenceHeartbeat'

import { useAccount } from '@/account/auth'

export function PresenceHeartbeat() {
  const { account } = useAccount()
  const [active, setActive] = useState(AppState.currentState === 'active')
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'))
    return () => subscription.remove()
  }, [])
  usePresenceHeartbeat(account, active)
  return null
}

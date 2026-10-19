// Mounted once at the root: tells the friends the signed-in player is online (src/utils/presence.js).
import { useAccount } from '../auth'
import usePageVisible from '../hooks/usePageVisible'
import usePresenceHeartbeat from '../hooks/usePresenceHeartbeat'

export default function PresenceHeartbeat() {
  const { account } = useAccount()
  usePresenceHeartbeat(account, usePageVisible())
  return null
}

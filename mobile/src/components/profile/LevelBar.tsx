// Level of an account, read from its users document.
import { useXp } from '@shared/hooks/useXp'

import { XpBar, type Xp } from './XpBar'

// Renders nothing while the XP loads.
export function LevelBar({ uid }: { uid: string }) {
  const xp = useXp(uid) as Xp | null
  return xp ? <XpBar xp={xp} /> : null
}

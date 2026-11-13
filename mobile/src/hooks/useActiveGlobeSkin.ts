// The globe skin the player wears: the stored choice if still unlocked (XP level, the easter egg's secret), else classic.
// Test mode unlocks every skin. Re-read whenever the choice, the secret or the accent preference changes.
import { useSyncExternalStore } from 'react'

import { useXp } from '@shared/hooks/useXp'
import { activeSkin, loadAccentEnabled, loadSecretFound, loadSkinChoice, onGlobeSkinChange } from '@shared/utils/globeSkins'

import { useTestMode } from '@/testMode'
import type { SkinAccents } from '@/theme'

export type GlobeSkin = {
  id: string
  palette: Record<string, string> | null
  accent?: SkinAccents
}

const subscribe = (listener: () => void) => onGlobeSkinChange(listener)

/** Whether the worn skin also colors the app's accent (the skin picker's switch). */
export function useAccentEnabled(): boolean {
  return useSyncExternalStore(subscribe, loadAccentEnabled, loadAccentEnabled)
}

export function useActiveGlobeSkin(uid: string | null | undefined) {
  const testMode: boolean = useTestMode()
  const realLevel: number = useXp(uid ?? null)?.level ?? 0
  const choice: string = useSyncExternalStore(subscribe, loadSkinChoice, loadSkinChoice)
  const foundSecret: boolean = useSyncExternalStore(subscribe, loadSecretFound, loadSecretFound)
  // Test mode: every skin unlocked, the disco one included
  const level: number = testMode ? 99 : realLevel
  const secret: boolean = testMode || foundSecret
  const skin = activeSkin(choice, { level, secret }) as GlobeSkin
  return { skin, choice, level, secret }
}

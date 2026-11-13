import { useCallback, useEffect, useState } from 'react'
import { useXp } from './useXp'
import { activeSkin, loadSecretFound, loadSkinChoice, onGlobeSkinChange, saveSkinChoice } from '../utils/globeSkins'
import { isTestMode } from '../utils/testMode'

// The globe skin the player wears: the chosen one if still unlocked (level from the account's XP, the easter egg found
// on this device, or the preview's test mode that unlocks everything), else classic. Every user of it follows the
// choice at once (onGlobeSkinChange), so the globe and the site's accent never disagree.
export function useActiveGlobeSkin(uid = null) {
  const xpLevel = useXp(uid)?.level ?? 0
  const testMode = isTestMode()
  const level = testMode ? 99 : xpLevel
  const [choice, setChoice] = useState(loadSkinChoice)
  const [foundSecret, setSecret] = useState(loadSecretFound)
  const secret = testMode || foundSecret

  useEffect(
    () =>
      onGlobeSkinChange(() => {
        setChoice(loadSkinChoice())
        setSecret(loadSecretFound())
      }),
    [],
  )

  const pick = useCallback((id) => saveSkinChoice(id), [])
  const skin = activeSkin(choice, { level, secret })
  return { skin, choice, level, secret, pick }
}

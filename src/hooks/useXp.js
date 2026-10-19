import { useEffect, useState } from 'react'
import { onPublicDataPatched } from '../utils/publicProfile'
import { cachedXp, fetchXp } from '../utils/xp'

// The XP and level of one account (readXp in utils/missions.js), or null for a visitor and while it loads. Read with
// the rest of the users document (publicProfile.js), and follows what the server pays the player at once.
export function useXp(uid) {
  const [xp, setXp] = useState(() => (uid ? cachedXp(uid) : null))

  useEffect(() => {
    if (!uid) {
      setXp(null)
      return undefined
    }
    let cancelled = false
    const load = () => fetchXp(uid).then((value) => !cancelled && setXp(value))
    setXp(cachedXp(uid))
    load()
    const stop = onPublicDataPatched((patched) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  return xp
}

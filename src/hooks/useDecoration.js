import { useEffect, useState } from 'react'
import { cachedDecoration, fetchDecoration } from '../utils/decorations'
import { onPublicDataPatched } from '../utils/publicProfile'

// The decoration ({ frame, color } ids, see utils/decorations.js) of one account, or null for a visitor and while it
// loads. Each account is read once for a few minutes however many names show it (see publicProfile.js), and it
// follows the player's own changes at once.
export function useDecoration(uid) {
  const [decoration, setDecoration] = useState(() => (uid ? cachedDecoration(uid) : null))

  useEffect(() => {
    if (!uid) {
      setDecoration(null)
      return undefined
    }
    let cancelled = false
    const load = () => fetchDecoration(uid).then((value) => !cancelled && setDecoration(value))
    setDecoration(cachedDecoration(uid))
    load()
    const stop = onPublicDataPatched((patched) => patched === uid && load())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid])

  return decoration
}

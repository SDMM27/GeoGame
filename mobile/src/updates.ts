// Over-the-air updates (EAS Update): by default a downloaded update only runs on the next launch, so a freshly
// installed app would open once on its old version. Instead, the splash screen stays up while we look for an update,
// and a new one is downloaded and applied right away. Same after a long time in the background.
import * as Updates from 'expo-updates'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

// Past these, the app opens on the version it has (the update, if any, still applies on the next launch).
const CHECK_TIMEOUT_MS = 4000
const DOWNLOAD_TIMEOUT_MS = 12000
// Back from the background after this long: look again (the player isn't in the middle of something).
const RESUME_AFTER_MS = 15 * 60 * 1000

const enabled = Updates.isEnabled && !__DEV__

/** Downloads a new update if there is one and restarts on it, unless the deadline has passed. */
async function applyUpdate(deadline: { expired: boolean; extend: () => void }) {
  const check = await Updates.checkForUpdateAsync()
  if (!check.isAvailable || deadline.expired) return
  deadline.extend()
  const fetched = await Updates.fetchUpdateAsync()
  if (fetched.isNew && !deadline.expired) await Updates.reloadAsync()
}

function withDeadline(onExpire: () => void) {
  let timer = setTimeout(expire, CHECK_TIMEOUT_MS)
  const deadline = {
    expired: false,
    extend: () => {
      clearTimeout(timer)
      timer = setTimeout(expire, DOWNLOAD_TIMEOUT_MS)
    },
    done: () => {
      clearTimeout(timer)
      expire()
    },
  }
  function expire() {
    if (deadline.expired) return
    deadline.expired = true
    onExpire()
  }
  return deadline
}

/** False while the launch update check runs (keep the splash screen up), then true. */
export function useLaunchUpdate(): boolean {
  const [ready, setReady] = useState(!enabled)

  useEffect(() => {
    if (!enabled) return undefined
    const deadline = withDeadline(() => setReady(true))
    applyUpdate(deadline)
      .catch((error) => console.warn('[updates]', error))
      .finally(deadline.done)

    let backgroundAt: number | null = null
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundAt = Date.now()
      else if (state === 'active' && backgroundAt != null && Date.now() - backgroundAt > RESUME_AFTER_MS) {
        backgroundAt = null
        const resume = withDeadline(() => {})
        applyUpdate(resume)
          .catch((error) => console.warn('[updates]', error))
          .finally(resume.done)
      }
    })
    return () => subscription.remove()
  }, [])

  return ready
}

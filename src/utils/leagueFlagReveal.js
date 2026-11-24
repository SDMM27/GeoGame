// League fragments were already awarded by the weekly close. This event only presents the flags it unlocked.
const listeners = new Set()

/** @param {(reveal: { uid: string, unlocked: string[], collectionCount: number, historical?: string[] }) => void} listener */
export function onLeagueFlagReveal(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function revealLeagueFlags(uid, flagReveal) {
  if (flagReveal) listeners.forEach((listener) => listener({ uid, ...flagReveal }))
}

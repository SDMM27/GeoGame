// Plays the unlock reveal again for a flag already in the collection (FlagUnlockOverlay listens).
const listeners = new Set<(iso: string) => void>()

export function onReplayFlag(listener: (iso: string) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function replayFlag(iso: string) {
  listeners.forEach((listener) => listener(iso))
}

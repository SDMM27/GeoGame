// Plays the unlock reveal again for a flag already in the collection (FlagUnlockOverlay listens).
const listeners = new Set()

export function onReplayFlag(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function replayFlag(iso) {
  listeners.forEach((listener) => listener(iso))
}

// Whether the flag unlock overlay is on screen. When one claim unlocks flags and scrolls, the scroll reveal waits for the
// flag overlay to close: the rewards play one after the other, never on top of each other.
let open = false
const listeners = new Set<(value: boolean) => void>()

export const isFlagOverlayOpen = () => open

export function setFlagOverlayOpen(value: boolean) {
  if (open === value) return
  open = value
  listeners.forEach((listener) => listener(value))
}

export function onFlagOverlayChange(listener: (value: boolean) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

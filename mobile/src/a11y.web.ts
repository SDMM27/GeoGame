// react-native-web's announceForAccessibility does nothing, so speak through a hidden polite live region.
let region: HTMLElement | null = null

export function announce(message: string) {
  if (!message || typeof document === 'undefined') return
  if (!region) {
    region = document.createElement('div')
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('aria-atomic', 'true')
    region.setAttribute('role', 'status')
    Object.assign(region.style, {
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
    })
    document.body.appendChild(region)
  }
  const el = region
  // Clear first so a repeated identical message is announced again.
  el.textContent = ''
  setTimeout(() => {
    el.textContent = message
  }, 50)
}

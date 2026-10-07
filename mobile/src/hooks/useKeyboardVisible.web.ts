import { useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'

// Web: react-native's Keyboard events never fire, so the keyboard is measured from the visual
// viewport. react-native-web's window height already is the visual viewport (keyboard excluded,
// and public/index.html shrinks the page to it): the keyboard is what it lost compared to the
// tallest height seen at this width.
const MIN_KEYBOARD_HEIGHT = 120
const fullHeights = new Map<number, number>()

function readKeyboardHeight() {
  const viewport = typeof window !== 'undefined' ? window.visualViewport : null
  if (!viewport) return 0
  const width = Math.round(viewport.width)
  const full = Math.max(fullHeights.get(width) ?? 0, viewport.height)
  fullHeights.set(width, full)
  const hidden = full - viewport.height
  return hidden > MIN_KEYBOARD_HEIGHT ? hidden : 0
}

// Height of the software keyboard, 0 while hidden.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(readKeyboardHeight)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setHeight(readKeyboardHeight())
    viewport.addEventListener('resize', update)
    return () => viewport.removeEventListener('resize', update)
  }, [])
  return height
}

// Whether the software keyboard is shown.
export function useKeyboardVisible() {
  return useKeyboardHeight() > 0
}

// Window height left above the keyboard (the web window height already excludes it).
export function useVisibleHeight() {
  return useWindowDimensions().height
}

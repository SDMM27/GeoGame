import { useEffect } from 'react'

// Website only: puts the cursor in a game's input whenever it can be typed in (start of a round, after each guess),
// so a player with a mouse and keyboard never has to click it first. Skipped on touch screens, where focusing would
// pop up the keyboard.
export default function useDesktopAutofocus(inputRef, enabled, roundKey) {
  useEffect(() => {
    if (!enabled || !window.matchMedia?.('(pointer: fine)').matches) return
    inputRef.current?.focus({ preventScroll: true })
  }, [inputRef, enabled, roundKey])
}

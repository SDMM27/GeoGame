import { useCallback, useEffect, useRef } from 'react'

// onChangeText for an answer input that the game empties itself (answer found, wrong answer).
// When the player keeps typing as the answer is detected, Android rejects the clear: its
// keystrokes are newer than the update sent by JS. The field then keeps the old answer and
// the keyboard's composing state no longer matches the text (backspace stops working).
// Text that extends the cleared answer is ignored, so React Native pushes the empty value
// again, this time with an up-to-date event count. (After a clear that worked, the first
// keystroke is a single letter: it never extends the cleared answer.)
export function useClearedAnswerGuard(value: string, onChangeText: (text: string) => void) {
  const lastTyped = useRef('')
  const cleared = useRef<string | null>(null)

  useEffect(() => {
    if (value === '' && lastTyped.current !== '') {
      cleared.current = lastTyped.current
      lastTyped.current = ''
    }
  }, [value])

  return useCallback(
    (text: string) => {
      if (cleared.current !== null) {
        if (text.length > cleared.current.length && text.startsWith(cleared.current)) return
        cleared.current = null
      }
      lastTyped.current = text
      onChangeText(text)
    },
    [onChangeText]
  )
}

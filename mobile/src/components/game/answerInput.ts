import { useCallback, useEffect, useRef } from 'react'
import { Platform, type TextInputProps } from 'react-native'

// Keyboard of the answer inputs. Android keyboards (Gboard...) compose the word being typed, and
// React Native swaps the text of the field without telling them when the game empties it (answer
// found, wrong answer): the keyboard keeps composing the cleared word. The next letters then land
// in the field from that stale word (« ie » after « birman » accepted for Birmanie), or Backspace
// deletes in the keyboard's copy only (it turns to capitals, offers « Annuler ») while the field
// keeps « Soudan ». Hiding and reopening the keyboard was the only way out.
// The `visible-password` keyboard composes nothing: every key goes straight to the field, so
// there is no word for the keyboard to get wrong. It has no suggestions and no auto capital,
// which the answers don't need (they ignore case and accents, see normalizeAnswer).
export const ANSWER_KEYBOARD_PROPS: TextInputProps = Platform.select<TextInputProps>({
  android: { keyboardType: 'visible-password', autoCapitalize: 'none' },
  default: { autoCapitalize: 'words' },
})

// onChangeText for an answer input that the game empties itself (answer found, wrong answer).
// When the player keeps typing as the answer is detected, Android rejects the clear: its
// keystrokes are newer than the update sent by JS. The field then keeps the old answer.
// Text that extends the cleared answer is ignored, so React Native pushes the empty value
// again, this time with an up-to-date event count. (After a clear that worked, the first
// keystroke is a single letter: it never extends the cleared answer.)
export function isStaleAfterClear(text: string, cleared: string) {
  return text.length > cleared.length && text.startsWith(cleared)
}

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
        if (isStaleAfterClear(text, cleared.current)) return
        cleared.current = null
      }
      lastTyped.current = text
      onChangeText(text)
    },
    [onChangeText]
  )
}

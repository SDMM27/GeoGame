// Android keyboards (Gboard...) compose the word being typed. When a game empties the input while a word is still
// being composed (an answer accepted on the fly, e.g. « birman » for Birmanie), the keyboard keeps that word: the next
// letters typed (« ie ») show up in the empty input and Backspace no longer erases them. Blurring and focusing the
// input again ends the composition and starts a fresh one, without closing the keyboard.
export function restartTyping(input) {
  if (!input || document.activeElement !== input) return
  input.blur()
  input.focus()
}

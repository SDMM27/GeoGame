import { useEffect, useRef } from 'react'

// A picked suggestion fills the input, then is submitted once rendered: the game's
// handleSubmit reads the input from its state, which only holds the pick after the render.
export default function useSubmitOnPick(value, setValue, onSubmit) {
  const pendingRef = useRef(null)
  const submitRef = useRef(onSubmit)
  submitRef.current = onSubmit

  useEffect(() => {
    if (pendingRef.current === null || pendingRef.current !== value) return
    pendingRef.current = null
    submitRef.current()
  }, [value])

  return (name) => {
    pendingRef.current = name
    setValue(name)
  }
}

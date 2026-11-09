import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import useSubmitOnPick from './useSubmitOnPick'

function useGame() {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState([])
  // Like the game hooks: the submit reads the input from state
  const handleSubmit = () => setSubmitted((list) => [...list, value])
  const pick = useSubmitOnPick(value, setValue, handleSubmit)
  return { value, setValue, submitted, pick }
}

describe('useSubmitOnPick', () => {
  it('submits the picked suggestion in a single tap', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.setValue('fra'))
    act(() => result.current.pick('France'))
    expect(result.current.submitted).toEqual(['France'])
  })

  it('does not submit while typing', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.setValue('France'))
    expect(result.current.submitted).toEqual([])
  })
})

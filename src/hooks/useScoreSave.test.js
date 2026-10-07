import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useScoreSave } from './useScoreSave'

const signedIn = { loading: false, account: { uid: 'u1', username: 'Alice' } }
const visitor = { loading: false, account: null }

describe('useScoreSave', () => {
  it('saves a signed-in player on its own, under their account', async () => {
    const save = vi.fn().mockResolvedValue({ status: 'saved' })
    const { result } = renderHook(() => useScoreSave(signedIn, save))

    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ name: 'Alice', uid: 'u1' })
    expect(result.current.signedIn).toBe(true)
  })

  it('waits for a visitor to submit a name', async () => {
    const save = vi.fn().mockResolvedValue({ status: 'taken' })
    const { result } = renderHook(() => useScoreSave(visitor, save))
    expect(save).not.toHaveBeenCalled()

    await act(() => result.current.submit('  Bob '))
    expect(save).toHaveBeenCalledWith({ name: 'Bob' })
    expect(result.current.status).toBe('taken')

    act(() => result.current.clear())
    expect(result.current.status).toBe('idle')
  })

  it('reports the better entry of a blocked save', async () => {
    const save = vi.fn().mockResolvedValue({ status: 'blocked', existing: { score: 9 } })
    const { result } = renderHook(() => useScoreSave(signedIn, save))

    await waitFor(() => expect(result.current.status).toBe('blocked'))
    expect(result.current.existing).toEqual({ score: 9 })
  })

  it("doesn't save when disabled or already saved", () => {
    const save = vi.fn()
    renderHook(() => useScoreSave(signedIn, save, { enabled: false }))
    const { result } = renderHook(() => useScoreSave(signedIn, save, { alreadySaved: true }))

    expect(save).not.toHaveBeenCalled()
    expect(result.current.done).toBe(true)
  })

  it('treats an account without a username as a visitor', () => {
    const save = vi.fn()
    const { result } = renderHook(() =>
      useScoreSave({ loading: false, account: { uid: 'u2', username: null, needsUsername: true } }, save)
    )

    expect(save).not.toHaveBeenCalled()
    expect(result.current.signedIn).toBe(false)
  })
})

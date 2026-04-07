// src/components/multiplayer/CountdownOverlay.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import CountdownOverlay from './CountdownOverlay'

afterEach(() => vi.useRealTimers())

const makeStartAt = (msFromNow) => ({
  toDate: () => new Date(Date.now() + msFromNow),
})

describe('CountdownOverlay', () => {
  it('renders null when startAt is null', () => {
    const { container } = render(
      <CountdownOverlay startAt={null} onStart={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows countdown number when startAt is in the future', () => {
    vi.useFakeTimers()
    render(<CountdownOverlay startAt={makeStartAt(3000)} onStart={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onStart when countdown reaches 0', () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    render(<CountdownOverlay startAt={makeStartAt(500)} onStart={onStart} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

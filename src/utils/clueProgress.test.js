import { describe, expect, it } from 'vitest'
import { clueProgress } from './clueProgress'

const guess = (distanceKm, isCorrect = false) => ({ distanceKm, isCorrect })

describe('clueProgress', () => {
  it('compares each guess with the previous one', () => {
    expect(clueProgress([guess(3000), guess(1200), guess(1800)]).map((entry) => entry.deltaKm)).toEqual([null, -1800, 600])
  })

  it('marks the closest wrong guess once there are two of them', () => {
    expect(clueProgress([guess(3000)])[0].closest).toBe(false)
    expect(clueProgress([guess(3000), guess(800), guess(800), guess(0, true)]).map((entry) => entry.closest))
      .toEqual([false, true, false, false])
  })

  it('leaves the right answer out', () => {
    expect(clueProgress([guess(500), guess(0, true)])[1]).toEqual({ deltaKm: null, closest: false })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createGlobeScene } from './globeScene'

const LAND = { type: 'FeatureCollection', features: [] }
const state = () => ({ colors: {}, w: 400, h: 400, reduced: true, time: 0, canvas: {} })

describe('globe mini-game', () => {
  it('finds the city when the arrow keys bring it near the reticle, and scores it', () => {
    const onFound = vi.fn()
    const hooks = createGlobeScene(LAND, { onFound })(state())
    // Starts over the Atlantic (-10°, 25°); the first city is Tokyo (139.7°, 35.7°)
    for (let i = 0; i < 15; i++) hooks.nudge(null, 10, 0)
    expect(onFound).not.toHaveBeenCalled()
    hooks.nudge(null, 0, 10)
    expect(onFound).toHaveBeenCalledWith(0, 100, true)
  })

  it('does not score a city the globe found by itself', () => {
    const onFound = vi.fn()
    const s = { ...state(), reduced: false }
    const hooks = createGlobeScene(LAND, { onFound })(s)
    const step = (seconds) => {
      for (let t = 0; t < seconds; t += 0.05) {
        try { hooks.frame(s, 0.05) } catch { /* no canvas here: only the motion matters */ }
      }
    }
    step(6)
    expect(onFound).toHaveBeenCalledWith(0, 0, false)
  })
})

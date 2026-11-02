import { describe, it, expect } from 'vitest'
import { IDENTITY, MAX_SCALE, clampView, pinchOf, zoomAt } from './scrollMapView'

describe('clampView', () => {
  it('keeps the scale within its limits and the viewport covered', () => {
    expect(clampView({ scale: 0.2, x: 50, y: 50 }, 400, 300)).toEqual(IDENTITY)
    expect(clampView({ scale: 100, x: 0, y: 0 }, 400, 300).scale).toBe(MAX_SCALE)
    expect(clampView({ scale: 2, x: 30, y: -999 }, 400, 300)).toEqual({ scale: 2, x: 0, y: -300 })
    expect(clampView({ scale: 2, x: -999, y: 10 }, 400, 300)).toEqual({ scale: 2, x: -400, y: 0 })
  })

  it('reaches the far end of a very wide map', () => {
    // A 5.5:1 map fits the width at scale 1: zoomed to 5.5 it spans 5.5 viewports, all reachable by panning
    expect(clampView({ scale: 5.5, x: -99999, y: 0 }, 400, 300).x).toBe(400 - 400 * 5.5)
  })
})

describe('zoomAt', () => {
  it('keeps the point under the cursor in place', () => {
    const view = zoomAt(IDENTITY, 2, 100, 80, 400, 300)
    // the point (100, 80) of the viewport was map point (100, 80) and still is
    expect((100 - view.x) / view.scale).toBeCloseTo(100)
    expect((80 - view.y) / view.scale).toBeCloseTo(80)
    expect(view.scale).toBe(2)
  })

  it('returns to the whole map when zoomed out', () => {
    expect(zoomAt({ scale: 3, x: -300, y: -200 }, 1, 200, 150, 400, 300)).toEqual(IDENTITY)
  })
})

describe('pinchOf', () => {
  it('gives the distance and the middle of two pointers', () => {
    expect(pinchOf({ x: 0, y: 0 }, { x: 6, y: 8 })).toEqual({ distance: 10, x: 3, y: 4 })
  })
})

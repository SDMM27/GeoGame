import { createPathRing, finishFramePath, framePath } from './framePaths'
import { appendLines, toVector, viewBasis } from './globeMath'
import { isRNRuntime } from 'react-native-worklets'

jest.mock('react-native-worklets', () => ({ isRNRuntime: jest.fn(() => false) }))

beforeEach(() => jest.mocked(isRNRuntime).mockReturnValue(false))

// Model native handles: snapshots own their points, and disposed handles cannot
// be read. Track all live handles to catch memory growth during a long animation.
jest.mock('@shopify/react-native-skia', () => {
  const live = new Set()
  return {
    Skia: {
      PathBuilder: {
        Make: () => {
          let points: number[][] = []
          return {
            reset: () => { points = [] },
            moveTo: (x: number, y: number) => { points.push([x, y]) },
            lineTo: (x: number, y: number) => { points.push([x, y]) },
            build: () => {
              const snapshot = points.map((point) => [...point])
              const handle = {
                dispose: () => { live.delete(handle) },
                toSVGString: () => {
                  if (!live.has(handle)) throw new Error('Disposed path')
                  return JSON.stringify(snapshot)
                },
              }
              live.add(handle)
              return handle
            },
          }
        },
      },
      live,
    },
  }
})

it('keeps native path memory bounded during animation without changing paths still in use', () => {
  const ring = createPathRing()
  const line = { vertices: Float32Array.from([...toVector(-20, 0), ...toVector(20, 0)]), starts: Int32Array.from([0, 2]) }
  const recent: { path: ReturnType<typeof finishFramePath>; svg: string }[] = []
  for (let frame = 0; frame < 3600; frame++) {
    const builder = framePath(ring)
    appendLines(builder, line, viewBasis((frame % 40) - 20, 15), 170, 170, 136)
    const path = finishFramePath(ring)
    for (const previous of recent) expect(previous.path.toSVGString()).toBe(previous.svg)
    recent.push({ path, svg: path.toSVGString() })
    if (recent.length > 2) recent.shift()
    const { Skia } = jest.requireMock('@shopify/react-native-skia')
    expect(Skia.live.size).toBeLessThanOrEqual(3)
  }
  expect(recent[0].svg).not.toBe(recent[1].svg)
  ring.paths.forEach((path) => path?.dispose())
})

it('does not mutate the frozen RN copy during the initial derived-value render', () => {
  jest.mocked(isRNRuntime).mockReturnValue(true)
  const ring = createPathRing()
  Object.freeze(ring.paths)
  Object.freeze(ring)
  framePath(ring)
  const path = finishFramePath(ring)
  expect(ring.next).toBe(0)
  expect(ring.paths.every((entry) => entry === null)).toBe(true)
  path.dispose()
})

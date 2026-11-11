import { appendLines, appendRings, rotate, sampleAt, toScreen, toVector, viewBasis, type PathSink } from './globeMath'

type Call = ['M' | 'L' | 'Z', number?, number?]
function recorder() {
  const calls: Call[] = []
  const path: PathSink = {
    moveTo: (x, y) => calls.push(['M', x, y]),
    lineTo: (x, y) => calls.push(['L', x, y]),
    close: () => calls.push(['Z']),
  }
  return { path, calls }
}

const C = 100
const R = 40
const flat = (points: [number, number][]) => Float32Array.from(points.flatMap(([lon, lat]) => toVector(lon, lat)))
const radius = (x?: number, y?: number) => Math.hypot(x! - C, y! - C)

describe('globeMath', () => {
  it('the point at the center of the view lands on the center, facing the viewer', () => {
    const [x, y, z] = rotate(viewBasis(30, 20), ...toVector(30, 20))
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(0)
    expect(z).toBeCloseTo(1)
  })

  it('east is to the right and north is up', () => {
    const basis = viewBasis(0, 0)
    const [ex, , ez] = rotate(basis, ...toVector(30, 0))
    expect(ex).toBeCloseTo(0.5)
    expect(ez).toBeGreaterThan(0)
    const [sx, sy] = toScreen(...rotate(basis, ...toVector(0, 30)), C, C, R)
    expect(sx).toBeCloseTo(C)
    expect(sy).toBeCloseTo(C - R * 0.5) // screen y grows downwards
  })

  it('matches a known projection: 90 degrees east of the center is on the right limb', () => {
    const v = rotate(viewBasis(0, 0), ...toVector(90, 0))
    expect(v[0]).toBeCloseTo(1)
    expect(Math.abs(v[2])).toBeLessThan(1e-6)
    const [sx, sy] = toScreen(v[0], v[1], v[2], C, C, R)
    expect(sx).toBeCloseTo(C + R)
    expect(sy).toBeCloseTo(C)
  })

  it('a point on the far side is pushed onto the limb, in the same direction', () => {
    const v = rotate(viewBasis(0, 0), ...toVector(150, 10))
    expect(v[2]).toBeLessThan(0)
    const [sx, sy] = toScreen(v[0], v[1], v[2], C, C, R)
    expect(radius(sx, sy)).toBeCloseTo(R)
    expect(Math.sign(sx - C)).toBe(Math.sign(v[0]))
    expect(Math.sign(C - sy)).toBe(Math.sign(v[1]))
  })

  it('a ring behind the globe is not drawn; one in front is, closed', () => {
    const ring = flat([[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]])
    const data = { vertices: ring, starts: Int32Array.from([0, 5]), caps: Float32Array.from([...toVector(10, 10), 1]) }
    const front = recorder()
    appendRings(front.path, data, viewBasis(10, 10), C, C, R)
    expect(front.calls.filter((c) => c[0] === 'M')).toHaveLength(1)
    expect(front.calls[front.calls.length - 1][0]).toBe('Z')
    const back = recorder()
    appendRings(back.path, data, viewBasis(190, -10), C, C, R)
    expect(back.calls).toHaveLength(0)
  })

  it('a ring that crosses the horizon stays inside the disc and ends on the rim', () => {
    // From (0, 0) the ring spans longitudes 60..120: its far half is behind the limb
    const ring = flat([[60, -10], [120, -10], [120, 10], [60, 10], [60, -10]])
    const data = { vertices: ring, starts: Int32Array.from([0, 5]), caps: Float32Array.from([...toVector(90, 0), 1]) }
    const { path, calls } = recorder()
    appendRings(path, data, viewBasis(0, 0), C, C, R)
    expect(calls.length).toBeGreaterThan(4)
    for (const [kind, x, y] of calls) if (kind !== 'Z') expect(radius(x, y)).toBeLessThanOrEqual(R + 1e-3)
    const onRim = calls.filter(([k, x, y]) => k !== 'Z' && Math.abs(radius(x, y) - R) < 1e-3)
    expect(onRim.length).toBeGreaterThanOrEqual(3)
  })

  it('never produces NaN, even for a vertex right behind the center', () => {
    const ring = flat([[180, 0], [170, 10], [175, 20], [180, 0]])
    const data = { vertices: ring, starts: Int32Array.from([0, 4]), caps: Float32Array.from([...toVector(175, 10), 1]) }
    const { path, calls } = recorder()
    appendRings(path, data, viewBasis(0, 0), C, C, R)
    for (const [, x, y] of calls) if (x !== undefined) expect(Number.isFinite(x) && Number.isFinite(y!)).toBe(true)
  })

  it('a line breaks where it goes behind the globe and resumes at the horizon', () => {
    // The equator seen from (0, 0): in view from -60 to 60, behind from 120 to -120, in view again at -60
    const line = flat([[-60, 0], [0, 0], [60, 0], [120, 0], [180, 0], [-120, 0], [-60, 0]])
    const { path, calls } = recorder()
    appendLines(path, { vertices: line, starts: Int32Array.from([0, 7]) }, viewBasis(0, 0), C, C, R)
    expect(calls.filter((c) => c[0] === 'M')).toHaveLength(2) // two visible stretches
    for (const [, x, y] of calls) expect(radius(x, y)).toBeLessThanOrEqual(R + 1e-3)
    // The first stretch ends on the limb (the call after the vertex at 60 degrees)
    expect(radius(calls[3][1], calls[3][2])).toBeCloseTo(R, 3)
  })

  it('samples a great circle at u and renormalizes', () => {
    const samples = flat([[0, 0], [90, 0]])
    const [x, y, z] = sampleAt(samples, 0.5)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1)
    expect(x).toBeCloseTo(Math.SQRT1_2)
    expect(y).toBeCloseTo(Math.SQRT1_2)
    expect(z).toBeCloseTo(0)
    expect(sampleAt(samples, 5)[1]).toBeCloseTo(1)
  })
})

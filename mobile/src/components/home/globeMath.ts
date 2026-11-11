// The globe's 3D maths, written as worklets so the UI thread can run them every frame (and plain jest can test them).
// Everything works on unit vectors: a point of the sphere is (x, y, z) = (cos lat cos lon, cos lat sin lon, sin lat).
// The view is three of those vectors: east, north and forward (the point at the center of the globe). Rotating a
// vector into the view is three dot products; the orthographic projection is then x = cx + r x', y = cy - r y', and
// the point is on the near side when z' > 0.

// The part of a Skia path the drawing code needs (so that tests can record the calls)
export type PathSink = {
  moveTo: (x: number, y: number) => unknown
  lineTo: (x: number, y: number) => unknown
  close: () => unknown
}

export type Lines = { vertices: Float32Array; starts: Int32Array }
export type Rings = Lines & { caps: Float32Array }

export function toVector(lon: number, lat: number): [number, number, number] {
  'worklet'
  const l = (lon * Math.PI) / 180
  const p = (lat * Math.PI) / 180
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]
}

// [east xyz, north xyz, forward xyz] of the view centered on (lon, lat) degrees
export function viewBasis(lon: number, lat: number): number[] {
  'worklet'
  const l = (lon * Math.PI) / 180
  const p = (lat * Math.PI) / 180
  const sl = Math.sin(l), cl = Math.cos(l), sp = Math.sin(p), cp = Math.cos(p)
  return [-sl, cl, 0, -sp * cl, -sp * sl, cp, cp * cl, cp * sl, sp]
}

// A unit vector in view space: x' to the right, y' up, z' towards the viewer
export function rotate(basis: number[], x: number, y: number, z: number): [number, number, number] {
  'worklet'
  return [
    basis[0] * x + basis[1] * y + basis[2] * z,
    basis[3] * x + basis[4] * y + basis[5] * z,
    basis[6] * x + basis[7] * y + basis[8] * z,
  ]
}

// (x', y') scaled to unit length: the point of the horizon in the same direction. A point right behind the center has
// no direction: it falls on the right edge.
export function onLimb(vx: number, vy: number): [number, number] {
  'worklet'
  const length = Math.hypot(vx, vy)
  return length < 1e-9 ? [1, 0] : [vx / length, vy / length]
}

// Screen position of a view-space point, pushed onto the limb (radius r) when it is on the far side
export function toScreen(vx: number, vy: number, vz: number, cx: number, cy: number, r: number): [number, number] {
  'worklet'
  if (vz > 0) return [cx + r * vx, cy - r * vy]
  const [lx, ly] = onLimb(vx, vy)
  return [cx + r * lx, cy - r * ly]
}

// Filled polygons (land). Rings entirely behind the globe are skipped; a ring that crosses the horizon is cut there and
// its far-side vertices are laid on the limb, so the filled shape stays closed and ends at the rim.
export function appendRings(path: PathSink, data: Rings, basis: number[], cx: number, cy: number, r: number) {
  'worklet'
  const { vertices, starts, caps } = data
  const ex = basis[0], ey = basis[1], ez = basis[2]
  const nx = basis[3], ny = basis[4], nz = basis[5]
  const fx = basis[6], fy = basis[7], fz = basis[8]
  const rings = starts.length - 1
  for (let k = 0; k < rings; k++) {
    // Cap hidden: its center is further than 90 degrees + its radius away
    if (fx * caps[4 * k] + fy * caps[4 * k + 1] + fz * caps[4 * k + 2] < -caps[4 * k + 3]) continue
    const a = starts[k], b = starts[k + 1]
    let visible = false
    for (let i = a; i < b; i++) {
      if (fx * vertices[3 * i] + fy * vertices[3 * i + 1] + fz * vertices[3 * i + 2] > 0) {
        visible = true
        break
      }
    }
    if (!visible) continue
    let started = false
    let px = 0, py = 0, pz = 0
    for (let i = a; i < b; i++) {
      const x = vertices[3 * i], y = vertices[3 * i + 1], z = vertices[3 * i + 2]
      const vx = ex * x + ey * y + ez * z
      const vy = nx * x + ny * y + nz * z
      const vz = fx * x + fy * y + fz * z
      if (i > a && vz > 0 !== pz > 0) {
        // The edge crosses the horizon: close the shape there
        const t = pz / (pz - vz)
        const [lx, ly] = onLimb(px + (vx - px) * t, py + (vy - py) * t)
        path.lineTo(cx + r * lx, cy - r * ly)
      }
      px = vx
      py = vy
      pz = vz
      if (vz <= 0 && Math.hypot(vx, vy) < 1e-9) continue
      const [sx, sy] = toScreen(vx, vy, vz, cx, cy, r)
      if (started) path.lineTo(sx, sy)
      else {
        path.moveTo(sx, sy)
        started = true
      }
    }
    path.close()
  }
}

// Stroked lines (graticule, routes): the stroke breaks where the line goes behind the globe, at the horizon.
export function appendLines(path: PathSink, data: Lines, basis: number[], cx: number, cy: number, r: number) {
  'worklet'
  const { vertices, starts } = data
  const ex = basis[0], ey = basis[1], ez = basis[2]
  const nx = basis[3], ny = basis[4], nz = basis[5]
  const fx = basis[6], fy = basis[7], fz = basis[8]
  const lines = starts.length - 1
  for (let k = 0; k < lines; k++) {
    let down = false
    let px = 0, py = 0, pz = 0
    for (let i = starts[k], b = starts[k + 1]; i < b; i++) {
      const x = vertices[3 * i], y = vertices[3 * i + 1], z = vertices[3 * i + 2]
      const vx = ex * x + ey * y + ez * z
      const vy = nx * x + ny * y + nz * z
      const vz = fx * x + fy * y + fz * z
      if (vz > 0) {
        if (!down) {
          if (i > starts[k]) {
            const t = pz / (pz - vz)
            const [lx, ly] = onLimb(px + (vx - px) * t, py + (vy - py) * t)
            path.moveTo(cx + r * lx, cy - r * ly)
            path.lineTo(cx + r * vx, cy - r * vy)
          } else {
            path.moveTo(cx + r * vx, cy - r * vy)
          }
          down = true
        } else {
          path.lineTo(cx + r * vx, cy - r * vy)
        }
      } else if (down) {
        const t = pz / (pz - vz)
        const [lx, ly] = onLimb(px + (vx - px) * t, py + (vy - py) * t)
        path.lineTo(cx + r * lx, cy - r * ly)
        down = false
      }
      px = vx
      py = vy
      pz = vz
    }
  }
}

// The point of a sampled great circle (flat unit vectors) at u in [0, 1], linearly interpolated then renormalized
export function sampleAt(samples: Float32Array, u: number): [number, number, number] {
  'worklet'
  const last = samples.length / 3 - 1
  const f = Math.max(0, Math.min(1, u)) * last
  const i = Math.min(last - 1, Math.floor(f))
  const t = f - i
  const x = samples[3 * i] + (samples[3 * i + 3] - samples[3 * i]) * t
  const y = samples[3 * i + 1] + (samples[3 * i + 4] - samples[3 * i + 1]) * t
  const z = samples[3 * i + 2] + (samples[3 * i + 5] - samples[3 * i + 2]) * t
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}

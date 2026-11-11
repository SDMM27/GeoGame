import {
  CITIES,
  EVENT_FOUND,
  EVENT_TARGET,
  FOUND_DELAY,
  angularDistance,
  clampLat,
  createGlobeState,
  decayVelocity,
  degreesPerPixel,
  dragEnd,
  dragMove,
  dragStart,
  releaseVelocity,
  stepGlobe,
  wrap,
  type GlobeState,
} from './globeModel'

const SIZE = 300
const DEG_PER_PX = 180 / (Math.PI * SIZE * 0.4)

// Runs the scene at 60 fps until `done` or `seconds` have passed; returns the events seen
function run(s: GlobeState, seconds: number, done?: () => boolean) {
  let events = 0
  for (let t = 0; t < seconds; t += 1 / 60) {
    events |= stepGlobe(s, 1 / 60, false)
    if (done?.()) break
  }
  return events
}

describe('globeModel', () => {
  it('auto mode finds the target by itself without scoring', () => {
    const s = createGlobeState()
    expect(run(s, 10, () => s.phase === 'found') & EVENT_FOUND).toBe(EVENT_FOUND)
    expect(s.score).toBe(0)
    expect(s.scored).toBe(false)
  })

  it('scores 100 when a drag puts the target in the reticle', () => {
    const s = createGlobeState()
    const [lon, lat] = CITIES[0].at
    // 30 degrees west of Tokyo, the right latitude; dragging right turns the globe west (lon -= dx * k)
    s.lon = lon + 30
    s.lat = lat
    dragStart(s, 0)
    dragMove(s, 30 / DEG_PER_PX, 0, SIZE, 500)
    expect(s.phase).toBe('manual')
    dragEnd(s, 800) // the finger stopped: no fling
    expect(s.velocity).toBe(0)
    expect(stepGlobe(s, 1 / 60, false)).toBe(EVENT_FOUND)
    expect(s.phase).toBe('found')
    expect(s.score).toBe(100)
    expect(s.scored).toBe(true)
  })

  it('moves on to the next target after the found delay', () => {
    const s = createGlobeState()
    run(s, 10, () => s.phase === 'found')
    expect(s.target).toBe(0)
    expect(run(s, FOUND_DELAY + 0.1) & EVENT_TARGET).toBe(EVENT_TARGET)
    expect(s.target).toBe(1)
    expect(s.phase).toBe('search')
  })

  it('a fling decays and stops', () => {
    const s = createGlobeState()
    dragStart(s, 0)
    dragMove(s, -100, 0, SIZE, 50)
    dragEnd(s, 60) // released while still moving
    const speed = s.velocity
    expect(speed).toBeGreaterThan(0)
    expect(speed).toBeLessThanOrEqual(400)
    stepGlobe(s, 0.5, false)
    expect(Math.abs(s.velocity)).toBeLessThan(speed)
    run(s, 3)
    expect(s.velocity).toBe(0)
  })

  it('a drag tilts the globe, clamped to 70 degrees', () => {
    const s = createGlobeState()
    s.lat = 20
    dragStart(s, 0)
    dragMove(s, 0, 10 / DEG_PER_PX, SIZE, 16)
    expect(s.lat).toBeCloseTo(30, 5) // dragging down brings the north into view, as on the web
    dragMove(s, 0, 1e6, SIZE, 32)
    expect(s.lat).toBe(70)
    dragMove(s, 0, -1e6, SIZE, 48)
    expect(s.lat).toBe(-70)
  })

  it('under reduced motion a drag onto the city finds it, and the pause after a find still ends', () => {
    const s = createGlobeState()
    s.reduced = true
    s.lon = CITIES[0].at[0] + 10
    s.lat = CITIES[0].at[1]
    dragStart(s, 0)
    expect(dragMove(s, 10 / DEG_PER_PX, 0, SIZE, 100)).toBe(EVENT_FOUND)
    expect(s.score).toBe(100)
    dragEnd(s, 1000)
    const lon = s.lon
    expect(stepGlobe(s, 1, true)).toBe(0)
    expect(stepGlobe(s, 1, true)).toBe(EVENT_TARGET)
    expect(s.lon).toBe(lon) // nothing spun
  })
})

describe('globe helpers', () => {
  it('wraps longitudes and clamps latitudes', () => {
    expect(wrap(190)).toBeCloseTo(-170)
    expect(wrap(-190)).toBeCloseTo(170)
    expect(clampLat(80)).toBe(70)
    expect(clampLat(-80)).toBe(-70)
    expect(clampLat(12)).toBe(12)
  })

  it('degrees per pixel match the web (radius = 0.4 * size)', () => {
    expect(degreesPerPixel(300)).toBeCloseTo(180 / (Math.PI * 120))
  })

  it('release velocity is clamped, and zero when the finger had stopped', () => {
    expect(releaseVelocity(900, 10)).toBe(400)
    expect(releaseVelocity(-900, 10)).toBe(-400)
    expect(releaseVelocity(150, 10)).toBe(150)
    expect(releaseVelocity(150, 121)).toBe(0)
  })

  it('a fling decays by 0.04 per second', () => {
    expect(decayVelocity(100, 1)).toBeCloseTo(4)
  })

  it('angular distance is in radians', () => {
    expect(angularDistance(0, 0, 90, 0)).toBeCloseTo(Math.PI / 2)
    expect(angularDistance(10, 20, 10, 20)).toBe(0)
    expect(angularDistance(0, 0, 180, 0)).toBeCloseTo(Math.PI)
  })
})

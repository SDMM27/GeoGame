// Scene logic of the home globe, ported from the website's src/components/globe/globeScene.js (no React, no Skia, no d3).
// Spin the globe until the city sits in the reticle: `search` spins for 2 s, `seek` turns towards the target, `found`
// bursts, 1.5 s later the next target comes. A drag switches to `manual`: only the player's own finds score +100.
// The state is one plain object and every function is a worklet: the UI thread steps it each frame and handles the
// gestures on it, and jest runs the same functions.

export type City = { code: string; key: string; at: [number, number] }

export const CITIES: City[] = [
  { code: 'TYO', key: 'tokyo', at: [139.7, 35.7] },
  { code: 'RIO', key: 'rio', at: [-43.2, -22.9] },
  { code: 'CAI', key: 'cairo', at: [31.2, 30.0] },
  { code: 'SYD', key: 'sydney', at: [151.2, -33.9] },
  { code: 'NYC', key: 'new_york', at: [-74.0, 40.7] },
  { code: 'NBO', key: 'nairobi', at: [36.8, -1.3] },
  { code: 'PAR', key: 'paris', at: [2.35, 48.86] },
]
const CITY_LON = CITIES.map((c) => c.at[0])
const CITY_LAT = CITIES.map((c) => c.at[1])

export const FLIGHT_SECONDS = 9
export const FOUND_DELAY = 1.5
const FOUND_RADIANS = 0.06 // ~3.4 degrees: the city is « in » the reticle
const MAX_LAT = 70
const MAX_FLING = 400 // degrees/s
const FLING_STALE_MS = 120

export type GlobePhase = 'search' | 'seek' | 'manual' | 'found'

export type GlobeState = {
  lon: number // the point at the center of the globe
  lat: number
  velocity: number // degrees/s of spin left by a fling
  idle: number // seconds since the last drag
  phase: GlobePhase
  phaseTime: number
  target: number
  score: number
  burst: number // 1 -> 0 after a find
  manualFind: boolean
  scored: boolean // the last find was the player's (shows « +100 »)
  reduced: boolean
  clock: number // seconds the globe has been animating: drives the dashes, the ping and the plane
  dragging: boolean
  dragLon: number
  dragLat: number
  dragT: number // ms of the last drag move
  dragLastX: number
}

// What a step or a drag move tells the caller (a bit mask)
export const EVENT_TARGET = 1
export const EVENT_FOUND = 2

export function createGlobeState(): GlobeState {
  return {
    lon: -10,
    lat: 25,
    velocity: 0,
    idle: 0,
    phase: 'search',
    phaseTime: 0,
    target: 0,
    score: 0,
    burst: 0,
    manualFind: false,
    scored: false,
    reduced: false,
    clock: 0,
    dragging: false,
    dragLon: 0,
    dragLat: 0,
    dragT: 0,
    dragLastX: 0,
  }
}

export function wrap(deg: number) {
  'worklet'
  return ((((deg + 180) % 360) + 360) % 360) - 180
}

export function clampLat(lat: number) {
  'worklet'
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat))
}

// Degrees per pixel at the globe's on-screen size (radius = 0.4 * size)
export function degreesPerPixel(sizePx: number) {
  'worklet'
  return 180 / (Math.PI * sizePx * 0.4)
}

// Angle in radians between two points of the sphere (haversine, as d3's geoDistance)
export function angularDistance(lon1: number, lat1: number, lon2: number, lat2: number) {
  'worklet'
  const rad = Math.PI / 180
  const dLon = (lon2 - lon1) * rad
  const sinLat = Math.sin((lat2 - lat1) * rad * 0.5)
  const sinLon = Math.sin(dLon * 0.5)
  const h = sinLat * sinLat + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * sinLon * sinLon
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// A fling keeps the globe turning; a drag that stopped before the release does not
export function releaseVelocity(velocity: number, sinceLastMoveMs: number) {
  'worklet'
  return sinceLastMoveMs > FLING_STALE_MS ? 0 : Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity))
}

// A fling slows down over ~1 s
export function decayVelocity(velocity: number, dt: number) {
  'worklet'
  return velocity * Math.pow(0.04, dt)
}

// Worklet closures are restored inside the function body, after default arguments
// are evaluated. A module constant in a default argument is undefined on the UI
// runtime, even though the same call succeeds on the JS thread and in plain Jest.
function centered(s: GlobeState, within: number) {
  'worklet'
  return angularDistance(s.lon, s.lat, CITY_LON[s.target], CITY_LAT[s.target]) < within
}

// Only the player's own finds score; the globe finding the city by itself just shows the way
function found(s: GlobeState) {
  'worklet'
  s.scored = s.manualFind
  if (s.scored) s.score += 100
  s.burst = 1
  s.phase = 'found'
  s.phaseTime = 0
  return EVENT_FOUND
}

function nextTarget(s: GlobeState) {
  'worklet'
  s.target = (s.target + 1) % CITIES.length
  s.manualFind = false
  s.phase = 'search'
  s.phaseTime = 0
  return EVENT_TARGET
}

// Advances the scene by dt seconds. Under reduced motion nothing moves: only the pause after a find still runs out.
export function stepGlobe(s: GlobeState, dt: number, reduced: boolean) {
  'worklet'
  s.phaseTime += dt
  if (reduced) return s.phase === 'found' && s.phaseTime > FOUND_DELAY ? nextTarget(s) : 0
  s.clock += dt
  s.burst = Math.max(0, s.burst - dt * 1.3)
  if (s.dragging) return 0
  s.idle += dt
  if (Math.abs(s.velocity) > 1) {
    s.lon = wrap(s.lon + s.velocity * dt)
    s.velocity = decayVelocity(s.velocity, dt)
  } else {
    s.velocity = 0
  }
  if (s.phase === 'manual') {
    if (centered(s, FOUND_RADIANS)) return found(s)
    if (s.idle > 3 && !s.velocity) {
      s.phase = 'search'
      s.phaseTime = 0
    }
  } else if (s.phase === 'search') {
    s.lon = wrap(s.lon + dt * 22)
    s.lat += (20 - s.lat) * Math.min(1, dt * 1.2)
    if (s.phaseTime > 2) {
      s.phase = 'seek'
      s.phaseTime = 0
    }
  } else if (s.phase === 'seek') {
    const k = Math.min(1, dt * 2.2)
    s.lon = wrap(s.lon + wrap(CITY_LON[s.target] - s.lon) * k)
    s.lat += (CITY_LAT[s.target] - s.lat) * k
    if (centered(s, 0.01)) return found(s)
  } else if (s.phase === 'found' && s.phaseTime > FOUND_DELAY) {
    return nextTarget(s)
  }
  return 0
}

export function dragStart(s: GlobeState, timeMs: number) {
  'worklet'
  s.dragging = true
  s.dragLon = s.lon
  s.dragLat = s.lat
  s.dragT = timeMs
  s.dragLastX = 0
  s.velocity = 0
  s.idle = 0
}

// dxPx, dyPx: how far the finger is from where the drag started. Horizontal turns, vertical tilts (clamped to +-70).
export function dragMove(s: GlobeState, dxPx: number, dyPx: number, sizePx: number, timeMs: number) {
  'worklet'
  if (!s.dragging) return 0
  const k = degreesPerPixel(sizePx)
  const dtMove = Math.max(1, timeMs - s.dragT) / 1000
  s.velocity = (-(dxPx - s.dragLastX) * k) / dtMove
  s.dragT = timeMs
  s.dragLastX = dxPx
  s.lon = wrap(s.dragLon - dxPx * k)
  s.lat = clampLat(s.dragLat + dyPx * k)
  s.idle = 0
  if (s.phase === 'found') return 0
  s.phase = 'manual'
  s.manualFind = true
  // Under reduced motion `stepGlobe` does not move the view: a drag that lands on the city still finds it
  return s.reduced && centered(s, FOUND_RADIANS) ? found(s) : 0
}

export function dragEnd(s: GlobeState, timeMs: number) {
  'worklet'
  if (!s.dragging) return
  s.velocity = releaseVelocity(s.velocity, timeMs - s.dragT)
  s.dragging = false
  s.idle = 0
}

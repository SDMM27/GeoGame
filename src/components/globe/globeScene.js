// The hero globe of the home page, drawn on a canvas by @sdmm/design's mountCanvas: real land (world-atlas 110m),
// stopovers, dashed great-circle routes, a plane flying Paris → Tokyo, and the « Find: <city> » mini-game (spin the
// globe until the city sits in the reticle). Under reduced motion mountCanvas draws one still frame, redrawn when the
// player drags: no spin, no plane, no dash animation, but the game still works by hand.
import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo'
import { alpha, mono } from '@sdmm/design/js'

export const CITIES = [
  { code: 'TYO', key: 'tokyo', at: [139.7, 35.7] },
  { code: 'RIO', key: 'rio', at: [-43.2, -22.9] },
  { code: 'CAI', key: 'cairo', at: [31.2, 30.0] },
  { code: 'SYD', key: 'sydney', at: [151.2, -33.9] },
  { code: 'NYC', key: 'new_york', at: [-74.0, 40.7] },
  { code: 'NBO', key: 'nairobi', at: [36.8, -1.3] },
  { code: 'PAR', key: 'paris', at: [2.35, 48.86] },
]
const city = (code) => CITIES.find((c) => c.code === code).at
const ROUTES = [
  ['PAR', 'TYO', 'accent'], ['NYC', 'PAR', 'accent'], ['CAI', 'SYD', 'accent'],
  ['NYC', 'RIO', 'accent2'], ['RIO', 'CAI', 'accent2'], ['CAI', 'NBO', 'accent2'],
].map(([a, b, tone]) => ({ tone, line: { type: 'LineString', coordinates: arc(city(a), city(b)) } }))
const FLIGHT = geoInterpolate(city('PAR'), city('TYO'))
const FLIGHT_SECONDS = 9

function arc(a, b) {
  const at = geoInterpolate(a, b)
  return Array.from({ length: 49 }, (_, i) => at(i / 48))
}

const FOUND_RADIANS = 0.06 // ~3.4°: the city is « in » the reticle
const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180

const readVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback

/**
 * @param land GeoJSON of the land
 * @param events { onTarget(index), onFound(index, score) }: the DOM overlay (chip, score) follows them
 */
export function createGlobeScene(land, events) {
  const projection = geoOrthographic().clipAngle(90).precision(0.4)
  const graticule = geoGraticule10()
  const sphere = { type: 'Sphere' }
  let view = { lon: -10, lat: 25 } // the point at the center of the globe
  let velocity = 0 // °/s of spin left by a fling
  let drag = null
  let idle = 0 // seconds since the last drag
  let phase = 'search' // search: spin · seek: turn towards the target · manual: the player drives · found
  let phaseTime = 0
  let target = 0
  let score = 0
  let burst = 0
  let colors = {}
  let manualFind = false

  const readColors = (s) => {
    colors = {
      ...s.colors,
      ocean: readVar('--gg-ocean', '#060e1f'),
      oceanDeep: readVar('--gg-ocean-deep', '#0e1630'),
      land: readVar('--gg-land', '#2a3e66'),
      landEdge: readVar('--gg-land-edge', '#6f88bd'),
      graticule: readVar('--gg-graticule', 'rgba(138,147,176,.25)'),
      plane: readVar('--gg-board-accent', '#f5c84b'),
      dark: document.documentElement.dataset.theme !== 'light',
    }
  }

  const goal = () => CITIES[target].at
  const centered = () => geoDistance([view.lon, view.lat], goal()) < FOUND_RADIANS

  // Only the player's own finds score; the globe finding the city by itself just shows the way
  let scored = false
  const found = () => {
    scored = manualFind
    if (scored) score += 100
    burst = 1
    phase = 'found'
    phaseTime = 0
    events.onFound?.(target, score, manualFind)
  }

  const nextTarget = () => {
    target = (target + 1) % CITIES.length
    manualFind = false
    phase = 'search'
    phaseTime = 0
    events.onTarget?.(target)
  }

  const step = (s, dt) => {
    phaseTime += dt
    burst = Math.max(0, burst - dt * 1.3)
    if (drag) return
    idle += dt
    if (Math.abs(velocity) > 1) {
      view.lon = wrap(view.lon + velocity * dt)
      velocity *= Math.pow(0.04, dt) // a fling slows down over ~1 s
    } else {
      velocity = 0
    }
    if (phase === 'manual') {
      if (centered()) found()
      else if (idle > 3 && !velocity) { phase = 'search'; phaseTime = 0 }
    } else if (phase === 'search') {
      view.lon = wrap(view.lon + dt * 22)
      view.lat += (20 - view.lat) * Math.min(1, dt * 1.2)
      if (phaseTime > 2) { phase = 'seek'; phaseTime = 0 }
    } else if (phase === 'seek') {
      const k = Math.min(1, dt * 2.2)
      view.lon = wrap(view.lon + wrap(goal()[0] - view.lon) * k)
      view.lat += (goal()[1] - view.lat) * k
      if (centered() && geoDistance([view.lon, view.lat], goal()) < 0.01) found()
    } else if (phase === 'found' && phaseTime > 1.5) {
      nextTarget()
    }
  }

  const draw = (s) => {
    const { ctx, w, h } = s
    const size = Math.min(w, h)
    const r = size * 0.4
    const cx = w / 2
    const cy = h / 2
    projection.scale(r).translate([cx, cy]).rotate([-view.lon, -view.lat])
    const path = geoPath(projection, ctx)
    ctx.clearRect(0, 0, w, h)

    // Halo, then the shaded ocean
    const halo = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.22)
    halo.addColorStop(0, alpha(colors.accent, colors.dark ? 0.22 : 0.16))
    halo.addColorStop(1, alpha(colors.accent, 0))
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)
    const shade = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05)
    shade.addColorStop(0, colors.ocean)
    shade.addColorStop(1, colors.oceanDeep)
    ctx.beginPath(); path(sphere); ctx.fillStyle = shade; ctx.fill()
    ctx.lineWidth = 1.2; ctx.strokeStyle = colors.line; ctx.stroke()

    ctx.beginPath(); path(graticule); ctx.lineWidth = 0.6; ctx.strokeStyle = colors.graticule; ctx.stroke()
    ctx.beginPath(); path(land); ctx.fillStyle = colors.land; ctx.fill()
    ctx.lineWidth = 0.7; ctx.strokeStyle = colors.landEdge; ctx.stroke()

    // Routes: dashes that run along the arcs
    ctx.save()
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = -s.time * 20
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    for (const route of ROUTES) {
      ctx.beginPath(); path(route.line)
      ctx.strokeStyle = route.tone === 'accent' ? colors.accent : colors.accent2
      ctx.stroke()
    }
    ctx.restore()

    // Stopovers, the target pinging
    const center = [view.lon, view.lat]
    ctx.font = mono(Math.max(9, size * 0.026), 700)
    CITIES.forEach((c, i) => {
      if (geoDistance(center, c.at) > Math.PI / 2 - 0.02) return
      const [x, y] = projection(c.at)
      const isTarget = i === target
      if (isTarget && !s.reduced) {
        const t = (s.time % 1.6) / 1.6
        ctx.beginPath(); ctx.arc(x, y, 5 + t * 15, 0, Math.PI * 2)
        ctx.strokeStyle = alpha(colors.accent, 0.9 * (1 - t)); ctx.lineWidth = 2; ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(x, y, isTarget ? 6 : 3.5, 0, Math.PI * 2)
      ctx.fillStyle = isTarget ? colors.accent : colors.muted; ctx.fill()
      ctx.lineWidth = 1.5; ctx.strokeStyle = colors.oceanDeep; ctx.stroke()
      ctx.fillStyle = colors.ink
      ctx.fillText(c.code, x + 8, y - 8)
    })

    // The plane, nose along its route
    if (!s.reduced) {
      const u = (s.time / FLIGHT_SECONDS) % 1
      const a = FLIGHT(u)
      if (geoDistance(center, a) < Math.PI / 2 - 0.05) {
        const [x1, y1] = projection(a)
        const [x2, y2] = projection(FLIGHT(Math.min(1, u + 0.01)))
        ctx.save()
        ctx.translate(x1, y1)
        ctx.rotate(Math.atan2(y2 - y1, x2 - x1))
        ctx.scale(size / 400, size / 400)
        ctx.beginPath()
        ctx.moveTo(-8, -2); ctx.lineTo(7, 0); ctx.lineTo(-8, 2); ctx.lineTo(-5, 0); ctx.closePath()
        ctx.moveTo(-2, -7); ctx.lineTo(2, 0); ctx.lineTo(-2, 7); ctx.closePath()
        ctx.fillStyle = colors.dark ? colors.plane : colors.ink
        ctx.fill()
        ctx.restore()
      }
    }

    // Reticle, and the +100 burst
    const ret = r * 0.09
    ctx.beginPath()
    ctx.arc(cx, cy, ret, 0, Math.PI * 2)
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      ctx.moveTo(cx + dx * (ret + 6), cy + dy * (ret + 6))
      ctx.lineTo(cx + dx * (ret + 14), cy + dy * (ret + 14))
    }
    ctx.lineWidth = 1.6
    ctx.strokeStyle = phase === 'found' ? colors.accent : alpha(colors.ink, 0.7)
    ctx.stroke()
    if (burst > 0) {
      const b = 1 - burst
      ctx.globalAlpha = burst
      ctx.beginPath(); ctx.arc(cx, cy, ret + b * r * 0.55, 0, Math.PI * 2)
      ctx.lineWidth = 3; ctx.strokeStyle = colors.accent; ctx.stroke()
      if (scored) {
        ctx.font = mono(Math.max(13, size * 0.042), 700)
        ctx.textAlign = 'center'
        ctx.fillStyle = colors.accentStrong
        ctx.fillText('+100', cx, cy - ret - 12 - b * 20)
        ctx.textAlign = 'start'
      }
      ctx.globalAlpha = 1
    }
  }

  return (s) => {
    readColors(s)
    const degreesPerPixel = () => 180 / (Math.PI * Math.min(s.w, s.h) * 0.4)
    return {
      frame(state, dt) {
        if (!state.reduced) step(state, dt)
        draw(state)
      },
      theme: readColors,
      pointerdown(state, e) {
        drag = { x: e.clientX, y: e.clientY, lon: view.lon, lat: view.lat, t: performance.now(), lastX: e.clientX, mouse: e.pointerType === 'mouse' }
        velocity = 0
        idle = 0
        state.canvas.setPointerCapture?.(e.pointerId)
      },
      pointermove(state, e) {
        if (!drag) return
        const k = degreesPerPixel()
        const now = performance.now()
        const dtMove = Math.max(1, now - drag.t) / 1000
        velocity = (-(e.clientX - drag.lastX) * k) / dtMove
        drag.t = now
        drag.lastX = e.clientX
        view.lon = wrap(drag.lon - (e.clientX - drag.x) * k)
        // Vertical drags scroll the page on touch screens (touch-action: pan-y): only the mouse tilts the globe
        if (drag.mouse) view.lat = Math.max(-70, Math.min(70, drag.lat + (e.clientY - drag.y) * k))
        idle = 0
        if (phase !== 'found') {
          phase = 'manual'
          manualFind = true
          if (state.reduced && centered()) found()
        }
      },
      pointerup() {
        if (!drag) return
        // A fling keeps the globe turning; a drag that stopped before the release does not
        velocity = performance.now() - drag.t > 120 ? 0 : Math.max(-400, Math.min(400, velocity))
        drag = null
        idle = 0
      },
      // Keyboard: arrows turn the globe by 10°
      nudge(state, dLon, dLat) {
        view.lon = wrap(view.lon + dLon)
        view.lat = Math.max(-70, Math.min(70, view.lat + dLat))
        idle = 0
        if (phase !== 'found') { phase = 'manual'; manualFind = true }
        // 10° steps can't hit the reticle's 3.4°: close enough snaps onto the city
        if (phase !== 'found' && geoDistance([view.lon, view.lat], goal()) < 0.15) {
          view = { lon: goal()[0], lat: goal()[1] }
          found()
        }
      },
      get target() { return target },
    }
  }
}
